import { type DocumentStatus, type DocumentType } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import { resolveDriverIdentity } from '../lib/driver-identity';
import { usuarioDaFicha } from './fragments';

/**
 * Recorte de um motorista sobre os documentos.
 *
 * Ele alcança os próprios documentos pessoais e os documentos dos veículos a
 * que está vinculado agora — nada além disso. Documentos pessoais de outros
 * motoristas ficam fora, mesmo quando o veículo é compartilhado.
 */
export interface DocumentDriverScope {
  driverId: string | null;
  vehicleIds: string[];
}

export interface DocumentFilters {
  companyId: string;
  driverScope?: DocumentDriverScope;
  vehicleId?: string;
  driverId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  orderBy?: 'expiryDate' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateDocumentData {
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate: string;
  fileUrl?: string;
  createdById: string;
}

export interface UpdateDocumentData {
  type?: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate?: string;
  fileUrl?: string;
}

/**
 * Janela de aviso, em dias. Documento que vence dentro dela aparece na central
 * de alertas.
 */
const DIAS_DE_AVISO = 30;

const ORDENACOES = {
  expiryDate: 'd.expiry_date',
  createdAt: 'd.created_at',
} as const;

const CAMPOS_ALTERAVEIS = [
  'type',
  'expiryDate',
  'fileUrl',
] as const satisfies readonly (keyof UpdateDocumentData)[];

/**
 * Situação do documento, calculada no banco.
 *
 * Antes era calculada em JavaScript, comparando objetos `Date`. Com a coluna
 * `date`, a comparação é entre datas civis e não passa por fuso algum — o que
 * elimina a chance de um documento aparecer como vencido um dia antes da hora
 * dependendo do horário em que a tela foi aberta.
 *
 * `current_date` segue o fuso do servidor de banco, que é UTC. É o mesmo
 * critério que a aplicação já usava, onde `new Date()` também corria em UTC.
 */
const situacaoDoDocumento = sql`
  case
    when d.expiry_date < current_date then 'EXPIRED'
    when d.expiry_date <= current_date + ${DIAS_DE_AVISO}::int then 'EXPIRING_SOON'
    else 'OK'
  end
`;

/** Condição que traduz a situação escolhida no filtro. */
function condicaoDeSituacao(status: DocumentStatus) {
  if (status === 'EXPIRED') return sql`and d.expiry_date < current_date`;
  if (status === 'EXPIRING_SOON') {
    return sql`and d.expiry_date >= current_date
               and d.expiry_date <= current_date + ${DIAS_DE_AVISO}::int`;
  }
  return sql`and d.expiry_date > current_date + ${DIAS_DE_AVISO}::int`;
}

/** Condição que traduz o recorte do motorista para a consulta. */
function condicaoDoRecorte(scope: DocumentDriverScope) {
  const temFicha = Boolean(scope.driverId);
  const temVeiculos = scope.vehicleIds.length > 0;

  // Sem ficha e sem veículo vinculado, não há documento algum ao alcance.
  if (!temFicha && !temVeiculos) return sql`and false`;

  if (temFicha && temVeiculos) {
    return sql`and (d.driver_id = ${scope.driverId!}
                    or d.vehicle_id = any(${scope.vehicleIds}::uuid[]))`;
  }

  if (temFicha) return sql`and d.driver_id = ${scope.driverId!}`;

  return sql`and d.vehicle_id = any(${scope.vehicleIds}::uuid[])`;
}

/**
 * Condições completas de uma consulta de documento.
 *
 * Exportada porque a contagem de alertas precisa exatamente do mesmo recorte.
 */
export function condicoesDocumento(filters: DocumentFilters) {
  const { companyId, driverScope, vehicleId, driverId, type, status } = filters;

  return sql`
    d.company_id = ${companyId}
    ${driverScope ? condicaoDoRecorte(driverScope) : sql``}
    ${vehicleId ? sql`and d.vehicle_id = ${vehicleId}` : sql``}
    ${driverId ? sql`and d.driver_id = ${driverId}` : sql``}
    ${type ? sql`and d.type = ${type}` : sql``}
    ${status ? condicaoDeSituacao(status) : sql``}
  `;
}

/** Documento no formato que a API devolve. */
export interface DocumentDto {
  id: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  type: DocumentType;
  /** Data civil, `YYYY-MM-DD`. */
  expiryDate: string;
  fileUrl: string | null;
  alertSent: boolean;
  status: DocumentStatus;
  createdById: string | null;
  createdAt: string;
}

/** Linha bruta, antes de resolver a identidade do motorista. */
interface DocumentRow {
  id: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driver: {
    name: string | null;
    cpf: string | null;
    user: { id: string; name: string; cpf: string; email: string } | null;
  } | null;
  type: DocumentType;
  expiryDate: string;
  fileUrl: string | null;
  alertSent: boolean;
  status: DocumentStatus;
  createdById: string | null;
  createdAt: Date;
}

function mapDocument(row: DocumentRow): DocumentDto {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    vehiclePlate: row.vehiclePlate,
    driverId: row.driverId,
    driverName: row.driver ? resolveDriverIdentity(row.driver).name : null,
    type: row.type,
    expiryDate: row.expiryDate,
    fileUrl: row.fileUrl,
    alertSent: row.alertSent,
    status: row.status,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Colunas devolvidas por toda consulta de documento, com o veículo e o
 * motorista já resolvidos pelos JOINs.
 */
const colunas = sql`
  d.id,
  d.vehicle_id,
  v.plate as vehicle_plate,
  d.driver_id,
  case when mo.id is null then null else
    json_build_object('name', mo.name, 'cpf', mo.cpf, 'user', ${usuarioDaFicha('u')})
  end as driver,
  d.type,
  d.expiry_date,
  d.file_url,
  d.alert_sent,
  ${situacaoDoDocumento} as status,
  d.created_by_id,
  d.created_at
  from documents d
  left join vehicles v on v.id = d.vehicle_id
  left join drivers mo on mo.id = d.driver_id
  left join users u on u.id = mo.user_id
`;

export const documentRepository = {
  async findMany(filters: DocumentFilters): Promise<DocumentDto[]> {
    const { orderBy = 'expiryDate', order = 'asc' } = filters;

    const coluna = ORDENACOES[orderBy] ?? ORDENACOES.expiryDate;
    const direcao = order === 'desc' ? 'desc' : 'asc';

    const linhas = await sql<DocumentRow[]>`
      select ${colunas}
      where ${condicoesDocumento(filters)}
      order by ${sql.unsafe(coluna)} ${sql.unsafe(direcao)}
    `;

    return linhas.map(mapDocument);
  },

  async findById(
    id: string,
    companyId: string,
    driverScope?: DocumentDriverScope,
  ): Promise<DocumentDto | null> {
    const [linha] = await sql<DocumentRow[]>`
      select ${colunas}
      where d.id = ${id}
        and d.company_id = ${companyId}
        ${driverScope ? condicaoDoRecorte(driverScope) : sql``}
    `;

    return linha ? mapDocument(linha) : null;
  },

  async create(client: Sql, data: CreateDocumentData): Promise<DocumentDto> {
    const [{ id }] = await client<{ id: string }[]>`
      insert into documents (
        company_id, vehicle_id, driver_id, type, expiry_date, file_url, created_by_id
      )
      values (
        ${data.companyId},
        ${data.vehicleId ?? null},
        ${data.driverId ?? null},
        ${data.type},
        ${data.expiryDate},
        ${data.fileUrl ?? null},
        ${data.createdById}
      )
      returning id
    `;

    const [linha] = await client<DocumentRow[]>`
      select ${colunas} where d.id = ${id}
    `;

    return mapDocument(linha);
  },

  async update(
    client: Sql,
    id: string,
    data: UpdateDocumentData,
    updatedById: string,
  ): Promise<DocumentDto> {
    const chaves = CAMPOS_ALTERAVEIS.filter((campo) => campo in data);

    await client`
      update documents
      set ${chaves.length > 0 ? client`${client(data, ...chaves)},` : client``}
          updated_by_id = ${updatedById}
      where id = ${id}
    `;

    const [linha] = await client<DocumentRow[]>`
      select ${colunas} where d.id = ${id}
    `;

    return mapDocument(linha);
  },

  async delete(client: Sql, id: string): Promise<DocumentDto> {
    // A leitura precede a exclusão: depois de apagada, a linha não pode mais
    // ser montada com os JOINs para compor a resposta.
    const [linha] = await client<DocumentRow[]>`
      select ${colunas} where d.id = ${id}
    `;

    await client`delete from documents where id = ${id}`;

    return mapDocument(linha);
  },

  /**
   * Contagem de alertas ativos, no mesmo recorte da central.
   *
   * O critério é o vigente — documento com validade até 30 dias à frente.
   */
  async countAlertsActive(
    companyId: string,
    driverScope?: DocumentDriverScope,
  ): Promise<number> {
    const [linha] = await sql<{ total: string }[]>`
      select count(*) as total
      from documents d
      where d.company_id = ${companyId}
        ${driverScope ? condicaoDoRecorte(driverScope) : sql``}
        and d.expiry_date <= current_date + ${DIAS_DE_AVISO}::int
    `;

    return Number(linha.total);
  },

  findNeedingAlert(days: number): Promise<{ id: string }[]> {
    return sql<{ id: string }[]>`
      select id
      from documents d
      where d.alert_sent = false
        and d.expiry_date <= current_date + ${days}::int
    ` as unknown as Promise<{ id: string }[]>;
  },

  async markAlertSent(ids: string[]): Promise<{ count: number }> {
    if (ids.length === 0) return { count: 0 };

    const alteradas = await sql`
      update documents set alert_sent = true where id = any(${ids}::uuid[])
    `;

    return { count: alteradas.count };
  },
};
