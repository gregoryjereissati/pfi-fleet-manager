import { AuditAction, AuditEntity } from '../types/db';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import {
  driverRepository,
  type DriverFilters,
  type UpdateDriverData,
} from '../repositories/driver.repository';
import { userRepository } from '../repositories/user.repository';
import { assignmentRepository } from '../repositories/assignment.repository';
import { diffFields, pickFields, recordChange } from '../lib/audit';
import { isDriverScope, type AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['cnh', 'cnhExpiry', 'phone', 'status'] as const;

/**
 * Restringe a consulta ao próprio motorista quando quem consulta é um.
 *
 * Um motorista não lista a equipe: ele vê a própria ficha. Sem ficha, a
 * listagem é vazia — nunca a da empresa inteira.
 */
function scopedFilters(scope: AccessScope, filters: DriverFilters): DriverFilters {
  if (!isDriverScope(scope)) return filters;
  return { ...filters, driverIds: scope.driverId ? [scope.driverId] : [] };
}

export const driverService = {
  async listDrivers(scope: AccessScope, filters: DriverFilters = {}) {
    return driverRepository.findMany(scope.companyId, scopedFilters(scope, filters));
  },

  async getDriver(scope: AccessScope, id: string) {
    if (isDriverScope(scope) && scope.driverId !== id) {
      throw new AppError(404, 'Driver not found');
    }

    const driver = await driverRepository.findById(id, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');

    const assignments = await assignmentRepository.findHistoryByDriver(scope.companyId, id);

    return { ...driver, assignments };
  },

  /**
   * Cria a ficha operacional de alguém que já tem conta na empresa.
   *
   * Não existe cadastro de motorista a partir do zero: a pessoa se cadastra,
   * é aprovada, e a ficha nasce dessa aprovação. Esta rota cobre o caso em que
   * o gerente precisa transformar em motorista alguém já aprovado com outro
   * papel, sem redigitar nome e CPF.
   */
  async createDriverForUser(scope: AccessScope, userId: string, phone?: string) {
    const user = await userRepository.findByIdInCompany(userId, scope.companyId);
    if (!user) throw new AppError(404, 'User not found');
    if (user.status !== UserStatus.ACTIVE) throw new AppError(409, 'USER_NOT_ACTIVE');
    if (user.driverProfile) throw new AppError(409, 'DRIVER_ALREADY_EXISTS');

    return emTransacao(async (tx) => {
      const unlinked = await driverRepository.findUnlinkedByCpf(
        scope.companyId,
        user.cpf,
        tx,
      );

      const driver = unlinked
        ? await driverRepository.linkToUser(tx, unlinked.id, user.id)
        : await driverRepository.createForUser(tx, {
            companyId: scope.companyId,
            userId: user.id,
            phone: phone ?? user.phone,
          });

      await recordChange(tx, {
        entityType: AuditEntity.DRIVER,
        entityId: driver.id,
        action: unlinked ? AuditAction.LINK : AuditAction.CREATE,
        scope,
        changes: { userId: { de: null, para: user.id } },
      });

      return driver;
    });
  },

  /** Dados operacionais da ficha. Nome e CPF não são editáveis aqui. */
  async updateDriver(scope: AccessScope, id: string, data: UpdateDriverData) {
    const driver = await driverRepository.findById(id, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');

    if (data.cnh && data.cnh !== driver.cnh) {
      const existingCnh = await driverRepository.findByCnh(scope.companyId, data.cnh);
      if (existingCnh && existingCnh.id !== id) throw new AppError(409, 'CNH already in use');
    }

    const payload = pickFields<UpdateDriverData>(data, AUDITED_FIELDS);
    const changes = diffFields(
      driver as unknown as Record<string, unknown>,
      payload,
      AUDITED_FIELDS,
    );

    return emTransacao(async (tx) => {
      const updated = await driverRepository.update(tx, id, payload);

      if (changes) {
        await recordChange(tx, {
          entityType: AuditEntity.DRIVER,
          entityId: id,
          action: AuditAction.UPDATE,
          scope,
          changes,
        });
      }

      return updated;
    });
  },

  /**
   * Inativa a ficha e encerra os vínculos vigentes.
   *
   * O histórico dos vínculos permanece: encerrar grava a data de fim, não
   * apaga a linha.
   */
  async deleteDriver(scope: AccessScope, id: string) {
    const driver = await driverRepository.findById(id, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');

    return emTransacao(async (tx) => {
      const active = await assignmentRepository.activeIdsByDriver(tx, scope.companyId, id);

      const endDate = new Date();

      for (const assignment of active) {
        await assignmentRepository.end(tx, assignment.id, endDate, scope.userId);
        await recordChange(tx, {
          entityType: AuditEntity.ASSIGNMENT,
          entityId: assignment.id,
          action: AuditAction.UNLINK,
          scope,
          reason: 'Motorista inativado',
        });
      }

      const updated = await driverRepository.setInactive(tx, id);

      await recordChange(tx, {
        entityType: AuditEntity.DRIVER,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes: { status: { de: driver.status, para: 'INACTIVE' } },
      });

      return updated;
    });
  },

  /**
   * Exclusão permanente. Restrita ao administrador da empresa, apenas sobre
   * ficha já inativa, e recusada enquanto houver histórico dependente — a
   * cascata apagaria documentos e vínculos sem deixar rastro.
   */
  async hardDeleteDriver(scope: AccessScope, id: string) {
    if (scope.role !== UserRole.ADMIN) throw new AppError(403, 'Insufficient permissions');

    const driver = await driverRepository.findById(id, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');
    if (driver.status !== 'INACTIVE') throw new AppError(409, 'DRIVER_MUST_BE_INACTIVE');

    const dependents = await driverRepository.countDependents(id, scope.companyId);

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.DRIVER,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: {
          documentos: { de: dependents.documents, para: 0 },
          vinculos: { de: dependents.assignments, para: 0 },
        },
      });

      return driverRepository.hardDelete(tx, id);
    });
  },

  /** Contagem do que a exclusão permanente levaria junto. */
  async previewHardDelete(scope: AccessScope, id: string) {
    const driver = await driverRepository.findById(id, scope.companyId);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driverRepository.countDependents(id, scope.companyId);
  },
};
