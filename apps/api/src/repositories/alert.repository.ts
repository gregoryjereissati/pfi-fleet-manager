import { MaintenanceType } from '@fleet-manager/shared';
import { sql } from '../config/database';
import { resolveDriverIdentity } from '../lib/driver-identity';
import {
  condicoesDocumento,
  DIAS_DE_AVISO,
  documentRepository,
  type DocumentDriverScope,
  type DocumentDto,
} from './document.repository';
import {
  condicoesManutencao,
  manutencaoAtrasada,
  manutencaoProxima,
  situacaoDaManutencao,
} from './maintenance.repository';
import { instanteIso, usuarioDaFicha, veiculoResumido } from './fragments';

/**
 * Janelas de aviso da central de alertas, em dias.
 *
 * Documento e habilitação seguem a mesma janela de 30 dias: são prazos legais,
 * e a renovação costuma depender de terceiros. A manutenção usa 7 dias porque
 * é agendada pela própria empresa, com antecedência curta.
 */
export const JANELA_DOCUMENTO = DIAS_DE_AVISO;
export const JANELA_HABILITACAO = 30;
export const JANELA_MANUTENCAO = 7;

/** Recorte de quem consulta a central. */
export interface AlertScope {
  companyId: string;
  /** Escopo do motorista: autoria dos lançamentos. */
  createdById?: string;
  /** Escopo do motorista: própria ficha e veículos vinculados agora. */
  driverScope?: DocumentDriverScope;
}

export interface MaintenanceAlert {
  id: string;
  vehicle: { id: string; plate: string; brand: string; model: string };
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  status: 'OVERDUE' | 'SCHEDULED';
}

export interface LicenseAlert {
  driverId: string;
  driverName: string;
  /** Data civil, `YYYY-MM-DD`. */
  cnhExpiry: string;
  status: 'EXPIRED' | 'EXPIRING_SOON';
}

/** Manutenção que pede atenção: atrasada ou prevista para os próximos dias. */
const manutencaoEmAlerta = sql`
  (${manutencaoAtrasada} or ${manutencaoProxima(JANELA_MANUTENCAO)})
`;

/**
 * Ficha cuja habilitação venceu ou vence dentro da janela.
 *
 * Só fichas ativas: um motorista inativo não está dirigindo, e avisar sobre a
 * CNH dele seria ruído. No escopo do motorista, apenas a própria ficha.
 *
 * A validade da CNH pode estar em dois lugares: na ficha do motorista e num
 * documento do tipo CNH, com o arquivo anexado. Quando o documento já está na
 * janela de aviso, ele aparece na frente de documentos, e repetir a mesma CNH
 * aqui seria aviso em dobro. A ficha entra quando nenhum documento CNH do
 * motorista está sendo avisado — por exemplo, quando o documento foi renovado
 * e a ficha ficou com a data antiga.
 */
function condicoesHabilitacao(scope: AlertScope) {
  const propria = scope.driverScope
    ? scope.driverScope.driverId
      ? sql`and d.id = ${scope.driverScope.driverId}`
      : sql`and false`
    : sql``;

  return sql`
    d.company_id = ${scope.companyId}
    and d.status = 'ACTIVE'
    and d.cnh_expiry is not null
    and d.cnh_expiry <= current_date + ${JANELA_HABILITACAO}::int
    and not exists (
      select 1 from documents doc
      where doc.driver_id = d.id
        and doc.type = 'CNH'
        and doc.expiry_date <= current_date + ${JANELA_DOCUMENTO}::int
    )
    ${propria}
  `;
}

/** Documento dentro da janela de aviso, vencido ou não. */
function condicoesDocumentoEmAlerta(scope: AlertScope) {
  return sql`
    ${condicoesDocumento({ companyId: scope.companyId, driverScope: scope.driverScope })}
    and d.expiry_date <= current_date + ${JANELA_DOCUMENTO}::int
  `;
}

export const alertRepository = {
  /** Documentos vencidos e a vencer, do mais urgente ao menos urgente. */
  documents(scope: AlertScope): Promise<DocumentDto[]> {
    return documentRepository.findAlerts(scope.companyId, scope.driverScope);
  },

  maintenances(scope: AlertScope): Promise<MaintenanceAlert[]> {
    return sql<MaintenanceAlert[]>`
      select
        m.id,
        ${veiculoResumido('v')} as vehicle,
        m.type,
        m.description,
        ${instanteIso('m.scheduled_date')} as scheduled_date,
        ${situacaoDaManutencao} as status
      from maintenances m
      join vehicles v on v.id = m.vehicle_id
      where ${condicoesManutencao({ companyId: scope.companyId, createdById: scope.createdById })}
        and ${manutencaoEmAlerta}
      order by m.scheduled_date asc, m.id asc
    ` as unknown as Promise<MaintenanceAlert[]>;
  },

  async licenses(scope: AlertScope): Promise<LicenseAlert[]> {
    const linhas = await sql<
      {
        id: string;
        name: string | null;
        cpf: string | null;
        user: { id: string; name: string; cpf: string; email: string } | null;
        cnhExpiry: string;
        status: LicenseAlert['status'];
      }[]
    >`
      select
        d.id,
        d.name,
        d.cpf,
        ${usuarioDaFicha('u')} as "user",
        to_char(d.cnh_expiry, 'YYYY-MM-DD') as cnh_expiry,
        case when d.cnh_expiry < current_date then 'EXPIRED' else 'EXPIRING_SOON' end
          as status
      from drivers d
      left join users u on u.id = d.user_id
      where ${condicoesHabilitacao(scope)}
      order by d.cnh_expiry asc, d.id asc
    `;

    return linhas.map((linha) => ({
      driverId: linha.id,
      driverName: resolveDriverIdentity(linha).name,
      cnhExpiry: linha.cnhExpiry,
      status: linha.status,
    }));
  },

  /** As três contagens numa só ida ao banco, com as mesmas condições das listas. */
  async counts(
    scope: AlertScope,
  ): Promise<{ documents: number; maintenances: number; licenses: number }> {
    const [linha] = await sql<{ documents: number; maintenances: number; licenses: number }[]>`
      select
        (select count(*)::int from documents d
          where ${condicoesDocumentoEmAlerta(scope)}) as documents,
        (select count(*)::int from maintenances m
          where ${condicoesManutencao({
            companyId: scope.companyId,
            createdById: scope.createdById,
          })}
            and ${manutencaoEmAlerta}) as maintenances,
        (select count(*)::int from drivers d
          where ${condicoesHabilitacao(scope)}) as licenses
    `;

    return linha;
  },
};
