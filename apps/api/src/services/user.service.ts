import { ehViolacaoDeUnicidade } from '../lib/db-errors';
import { AuditAction, AuditEntity } from '../types/db';
import { UserRole, UserStatus, type UpdateCurrentUserDto } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { emTransacao } from '../config/database';
import { userRepository, type UserFilters } from '../repositories/user.repository';
import { driverRepository } from '../repositories/driver.repository';
import { recordChange } from '../lib/audit';
import type { Sql } from '../config/database';
import type { AccessScope } from '../lib/access-scope';

const PROTECTED_EMAIL = 'admin@fleet-manager.com';

/** Violação de restrição de unicidade no Postgres. */
function isUniqueViolation(error: unknown): boolean {
  return ehViolacaoDeUnicidade(error);
}

/**
 * Garante que o usuário tenha uma ficha de motorista na empresa — exatamente
 * uma.
 *
 * A pessoa cria a conta com seus dados; ao ser aprovada como motorista, ela
 * aparece na lista de motoristas sem que ninguém redigite nome e CPF. A ficha
 * guarda apenas os dados operacionais; a identidade continua no usuário.
 *
 * A função é idempotente e tolera concorrência:
 * - já existe ficha para a conta → devolve a existente;
 * - existe ficha antiga **sem** conta, com o mesmo CPF → vincula, em vez de
 *   criar uma segunda pessoa;
 * - duas aprovações simultâneas → a restrição de unicidade sobre `userId`
 *   recusa a segunda inserção, que então relê a ficha criada pela primeira.
 */
async function ensureDriverProfile(
  client: Sql,
  companyId: string,
  user: { id: string; cpf: string; phone: string },
) {
  const existing = await driverRepository.findByUserId(user.id, client);
  if (existing) return { driver: existing, created: false };

  const unlinked = await driverRepository.findUnlinkedByCpf(companyId, user.cpf, client);

  if (unlinked) {
    const linked = await driverRepository.linkToUser(client, unlinked.id, user.id);
    return { driver: linked, created: false, linkedExisting: true };
  }

  try {
    const driver = await driverRepository.createForUser(client, {
      companyId,
      userId: user.id,
      phone: user.phone,
    });

    return { driver, created: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const concurrent = await driverRepository.findByUserId(user.id, client);
    if (!concurrent) throw error;

    return { driver: concurrent, created: false };
  }
}

export const userService = {
  /**
   * O próprio perfil de quem está autenticado.
   *
   * Sem recorte de empresa: a linha é a da própria pessoa, e o identificador
   * vem do token já verificado. É o caminho que responde `/users/me` inclusive
   * ao super administrador, antes de ele escolher em qual empresa vai operar.
   */
  async getOwnProfile(userId: string) {
    const user = await userRepository.findOwnProfile(userId);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  /** Usuários da própria empresa. Nenhuma rota lista fora dela. */
  async listUsers(scope: AccessScope, filters: UserFilters = {}) {
    return userRepository.findAllByCompany(scope.companyId, filters);
  },

  async getUser(scope: AccessScope, id: string) {
    const user = await userRepository.findByIdInCompany(id, scope.companyId);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async updateRole(scope: AccessScope, id: string, role: UserRole) {
    const user = await userRepository.findByIdInCompany(id, scope.companyId);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');

    return emTransacao(async (tx) => {
      const updated = await userRepository.updateRole(tx, id, role);

      // Passar a atuar como motorista faz a pessoa aparecer na lista de
      // motoristas, sem novo cadastro.
      if (role === UserRole.OPERATOR && updated.status === UserStatus.ACTIVE) {
        await ensureDriverProfile(tx, scope.companyId, updated);
      }

      await recordChange(tx, {
        entityType: AuditEntity.USER,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes: { role: { de: user.role, para: role } },
      });

      return updated;
    });
  },

  /**
   * Aprova, recusa ou bloqueia uma solicitação de acesso.
   *
   * A aprovação é o único momento em que o papel solicitado se converte em
   * papel efetivo — e apenas porque o administrador o confirma explicitamente.
   */
  async updateStatus(
    scope: AccessScope,
    id: string,
    status: UserStatus,
    role?: UserRole,
  ) {
    const user = await userRepository.findByIdInCompany(id, scope.companyId);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');
    if (user.id === scope.userId) throw new AppError(403, 'CANNOT_CHANGE_OWN_STATUS');

    const effectiveRole = role ?? user.role;

    return emTransacao(async (tx) => {
      if (role && role !== user.role) {
        await userRepository.updateRole(tx, id, role);
      }

      const updated = await userRepository.updateStatus(tx, id, status);

      if (status === UserStatus.ACTIVE && effectiveRole === UserRole.OPERATOR) {
        await ensureDriverProfile(tx, scope.companyId, updated);
      }

      await recordChange(tx, {
        entityType: AuditEntity.USER,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes: {
          status: { de: user.status, para: status },
          ...(role && role !== user.role ? { role: { de: user.role, para: role } } : {}),
        },
      });

      return updated;
    });
  },

  async updateCurrentUser(id: string, data: UpdateCurrentUserDto) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');

    const emailOwner = await userRepository.findByEmail(data.email);
    if (emailOwner && emailOwner.id !== id) throw new AppError(409, 'EMAIL_TAKEN');

    const cpfOwner = await userRepository.findByCpf(data.cpf);
    if (cpfOwner && cpfOwner.id !== id) throw new AppError(409, 'CPF_TAKEN');

    const payload = {
      name: data.name.trim(),
      cpf: data.cpf.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      addressStreet: data.addressStreet.trim(),
      addressNumber: data.addressNumber.trim(),
      addressDistrict: data.addressDistrict.trim(),
      addressCity: data.addressCity.trim(),
      addressState: data.addressState.trim().toUpperCase(),
      addressZip: data.addressZip.trim(),
    };

    return userRepository.updateProfile(id, payload);
  },

  async deleteUser(scope: AccessScope, id: string) {
    const user = await userRepository.findByIdInCompany(id, scope.companyId);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');
    if (user.id === scope.userId) throw new AppError(403, 'CANNOT_DELETE_SELF');

    // Uma ficha de motorista vinculada representa histórico operacional:
    // vínculos com veículos e documentos pessoais. Remover a conta sem
    // resolver a ficha apagaria esse histórico por tabela.
    if (user.driverProfile) throw new AppError(409, 'USER_HAS_DRIVER_PROFILE');

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.USER,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: { email: { de: user.email, para: null } },
      });

      return userRepository.deleteUser(tx, id);
    });
  },
};
