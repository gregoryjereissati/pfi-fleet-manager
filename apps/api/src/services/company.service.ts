import { type CreateCompanyDto, UserRole } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import { companyRepository } from '../repositories/company.repository';
import { recordChange } from '../lib/audit';
import { ehViolacaoDeUnicidade } from '../lib/db-errors';
import { AuditAction, AuditEntity, CompanyStatus, type Company } from '../types/db';
import type { AccessScope } from '../lib/access-scope';

/**
 * Serviço de empresas — a camada de plataforma.
 *
 * É o único lugar do sistema que trabalha **fora** do recorte de uma empresa:
 * todas as demais operações acontecem dentro de uma. Por isso ele é alcançável
 * apenas pelo super administrador, e por isso não recebe `AccessScope` nas
 * leituras: não há empresa a recortar quando o que se lista são as empresas.
 */

/** Quem executou uma ação de plataforma, para o histórico. */
export interface PlatformActor {
  userId: string;
  userName: string;
}

/**
 * Recorte sintético para o histórico de uma ação de plataforma.
 *
 * O histórico é particionado por empresa — é assim que cada empresa consulta
 * apenas o próprio. Uma ação sobre a empresa pertence ao histórico **dela**,
 * então o registro nasce com o identificador da empresa afetada, e o autor é o
 * super administrador que agiu.
 */
function recorteDoHistorico(companyId: string, actor: PlatformActor): AccessScope {
  return {
    userId: actor.userId,
    userName: actor.userName,
    companyId,
    role: UserRole.ADMIN,
    driverId: null,
    isSuperAdmin: true,
  };
}

function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export const companyService = {
  /** Todas as empresas, com o resumo que a tela de plataforma exibe. */
  async listCompanies() {
    const empresas = await companyRepository.listarComResumo();

    return empresas.map((empresa) => ({
      ...empresa,
      activeUsers: Number(empresa.activeUsers),
      pendingUsers: Number(empresa.pendingUsers),
      vehicles: Number(empresa.vehicles),
      drivers: Number(empresa.drivers),
    }));
  },

  /**
   * Cria a empresa.
   *
   * O código de acesso é conferido antes por cortesia — para responder com uma
   * mensagem útil —, mas quem decide é a restrição de unicidade do banco: entre
   * a conferência e a inserção cabe outra requisição, e só a restrição resolve
   * a disputa.
   */
  async createCompany(dados: CreateCompanyDto, actor: PlatformActor) {
    const joinCode = normalizarCodigo(dados.joinCode);

    if (joinCode.length < 4) {
      throw new AppError(400, 'JOIN_CODE_TOO_SHORT');
    }

    const emUso = await companyRepository.findAnyByJoinCode(joinCode);
    if (emUso) throw new AppError(409, 'JOIN_CODE_TAKEN');

    const cnpj = dados.cnpj?.replace(/\D/g, '') || null;

    try {
      return await emTransacao(async (tx) => {
        const empresa = await companyRepository.create(tx, {
          name: dados.name.trim(),
          joinCode,
          cnpj,
        });

        await recordChange(tx, {
          entityType: AuditEntity.COMPANY,
          entityId: empresa.id,
          action: AuditAction.CREATE,
          scope: recorteDoHistorico(empresa.id, actor),
          changes: {
            name: { de: null, para: empresa.name },
            joinCode: { de: null, para: empresa.joinCode },
          },
        });

        return empresa;
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) throw new AppError(409, 'JOIN_CODE_TAKEN');
      throw erro;
    }
  },

  /**
   * Ativa ou desativa a empresa.
   *
   * Desativar não apaga nada: os dados permanecem e a autenticação passa a
   * recusar o acesso de quem pertence a ela, com COMPANY_INACTIVE. É uma
   * suspensão reversível, não uma exclusão.
   */
  async setStatus(
    id: string,
    status: CompanyStatus,
    actor: PlatformActor,
  ): Promise<Company> {
    const empresa = await companyRepository.findById(id);
    if (!empresa) throw new AppError(404, 'COMPANY_NOT_FOUND');

    if (empresa.status === status) return empresa;

    return emTransacao(async (tx) => {
      const alterada = await companyRepository.atualizarSituacao(tx, id, status);

      await recordChange(tx, {
        entityType: AuditEntity.COMPANY,
        entityId: id,
        action: AuditAction.UPDATE,
        scope: recorteDoHistorico(id, actor),
        changes: { status: { de: empresa.status, para: status } },
      });

      return alterada;
    });
  },
};
