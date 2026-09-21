import { sql, type Sql } from '../config/database';
import type { VehicleDriverAssignment } from '../types/db';
import { motoristaComIdentidade } from './fragments';

/**
 * Vínculos entre motorista e veículo.
 *
 * Um vínculo vigora do início até ser encerrado explicitamente — não há
 * vencimento automático. Encerrar grava `endDate`; nunca apaga a linha.
 */

/**
 * Chave que mantém único o vínculo **vigente** de um par veículo-motorista.
 *
 * Continua exportada porque o serviço a usa para reconhecer a violação de
 * unicidade e traduzi-la em mensagem. A coluna correspondente, porém, passou a
 * ser **gerada pelo banco** a partir de `end_date`: a aplicação não a escreve
 * mais, e por isso não há caminho de escrita capaz de deixá-la incoerente.
 */
export function activeLinkKey(vehicleId: string, driverId: string): string {
  return `${vehicleId}:${driverId}`;
}

/** Veículo como aparece dentro de um vínculo. */
export interface AssignmentVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
}

/** Motorista como aparece dentro de um vínculo. */
export interface AssignmentDriver {
  id: string;
  name: string | null;
  cpf: string | null;
  status: string;
  user: { id: string; name: string; cpf: string; email: string } | null;
}

export type AssignmentWithRelations = VehicleDriverAssignment & {
  vehicle: AssignmentVehicle;
  driver: AssignmentDriver;
};

const veiculoDoVinculo = sql`
  json_build_object(
    'id', v.id,
    'plate', v.plate,
    'brand', v.brand,
    'model', v.model,
    'status', v.status
  ) as vehicle
`;

/**
 * Colunas e junções comuns a toda leitura de vínculo.
 *
 * `a.*` traz a chave gerada `active_link_key` junto. Ela é somente leitura e
 * não faz parte do contrato da API, mas mantê-la no resultado evita uma lista
 * de colunas que precisaria ser revista a cada alteração da tabela.
 */
const colunas = sql`
  a.*,
  ${veiculoDoVinculo},
  ${motoristaComIdentidade('d', 'u')} as driver
  from vehicle_driver_assignments a
  join vehicles v on v.id = a.vehicle_id
  join drivers d on d.id = a.driver_id
  left join users u on u.id = d.user_id
`;

/**
 * Ordem do histórico: vigentes primeiro — `end_date` nulo vem antes com
 * `nulls first` —, depois os encerrados, do mais recente para o mais antigo.
 */
const ordemDoHistorico = sql`order by a.end_date asc nulls first, a.start_date desc`;

export const assignmentRepository = {
  async findById(id: string, companyId: string): Promise<AssignmentWithRelations | null> {
    const [vinculo] = await sql<AssignmentWithRelations[]>`
      select ${colunas}
      where a.id = ${id} and a.company_id = ${companyId}
    `;

    return vinculo ?? null;
  },

  /**
   * Vínculo vigente de um par, se houver.
   *
   * `client` permite que a consulta participe de uma transação em andamento —
   * necessário quando a verificação e a gravação precisam enxergar o mesmo
   * estado.
   */
  async findActive(
    companyId: string,
    vehicleId: string,
    driverId: string,
    client: Sql = sql,
  ): Promise<VehicleDriverAssignment | null> {
    const [vinculo] = await client<VehicleDriverAssignment[]>`
      select *
      from vehicle_driver_assignments
      where company_id = ${companyId}
        and vehicle_id = ${vehicleId}
        and driver_id = ${driverId}
        and end_date is null
    `;

    return vinculo ?? null;
  },

  /** Vínculos vigentes de um veículo. */
  findActiveByVehicle(
    companyId: string,
    vehicleId: string,
  ): Promise<AssignmentWithRelations[]> {
    return sql<AssignmentWithRelations[]>`
      select ${colunas}
      where a.company_id = ${companyId}
        and a.vehicle_id = ${vehicleId}
        and a.end_date is null
      order by a.start_date asc
    ` as unknown as Promise<AssignmentWithRelations[]>;
  },

  /** Vínculos vigentes de vários veículos, em uma consulta. */
  async findActiveByVehicleIds(
    companyId: string,
    vehicleIds: string[],
  ): Promise<AssignmentWithRelations[]> {
    if (vehicleIds.length === 0) return [];

    return sql<AssignmentWithRelations[]>`
      select ${colunas}
      where a.company_id = ${companyId}
        and a.vehicle_id = any(${vehicleIds}::uuid[])
        and a.end_date is null
      order by a.start_date asc
    `;
  },

  /** Histórico completo de um veículo: vigentes e encerrados. */
  findHistoryByVehicle(
    companyId: string,
    vehicleId: string,
  ): Promise<AssignmentWithRelations[]> {
    return sql<AssignmentWithRelations[]>`
      select ${colunas}
      where a.company_id = ${companyId} and a.vehicle_id = ${vehicleId}
      ${ordemDoHistorico}
    ` as unknown as Promise<AssignmentWithRelations[]>;
  },

  /** Histórico completo de um motorista. */
  findHistoryByDriver(
    companyId: string,
    driverId: string,
  ): Promise<AssignmentWithRelations[]> {
    return sql<AssignmentWithRelations[]>`
      select ${colunas}
      where a.company_id = ${companyId} and a.driver_id = ${driverId}
      ${ordemDoHistorico}
    ` as unknown as Promise<AssignmentWithRelations[]>;
  },

  /** Identificadores dos vínculos vigentes de um veículo. */
  async activeIdsByVehicle(
    client: Sql,
    companyId: string,
    vehicleId: string,
  ): Promise<{ id: string }[]> {
    return client<{ id: string }[]>`
      select id
      from vehicle_driver_assignments
      where company_id = ${companyId}
        and vehicle_id = ${vehicleId}
        and end_date is null
    `;
  },

  /** Identificadores dos vínculos vigentes de um motorista. */
  async activeIdsByDriver(
    client: Sql,
    companyId: string,
    driverId: string,
  ): Promise<{ id: string }[]> {
    return client<{ id: string }[]>`
      select id
      from vehicle_driver_assignments
      where company_id = ${companyId}
        and driver_id = ${driverId}
        and end_date is null
    `;
  },

  /**
   * Identificadores dos veículos em que o motorista pode lançar agora.
   *
   * É a lista que o servidor usa para autorizar um lançamento, e a mesma que
   * alimenta o seletor do formulário — para que a tela não ofereça o que a API
   * recusaria.
   */
  async activeVehicleIds(companyId: string, driverId: string): Promise<string[]> {
    const linhas = await sql<{ vehicleId: string }[]>`
      select vehicle_id
      from vehicle_driver_assignments
      where company_id = ${companyId}
        and driver_id = ${driverId}
        and end_date is null
    `;

    return linhas.map((linha) => linha.vehicleId);
  },

  /**
   * Cria o vínculo.
   *
   * `active_link_key` não aparece na inserção: o banco a deriva de `end_date`.
   * A violação da unicidade de vínculo vigente aparece aqui como erro 23505 e
   * é traduzida pelo serviço.
   */
  async create(
    client: Sql,
    data: {
      companyId: string;
      vehicleId: string;
      driverId: string;
      startDate: Date;
      startEstimated?: boolean;
      createdById: string;
    },
  ): Promise<VehicleDriverAssignment> {
    const [vinculo] = await client<VehicleDriverAssignment[]>`
      insert into vehicle_driver_assignments (
        company_id, vehicle_id, driver_id, start_date, start_estimated, created_by_id
      )
      values (
        ${data.companyId},
        ${data.vehicleId},
        ${data.driverId},
        ${data.startDate},
        ${data.startEstimated ?? false},
        ${data.createdById}
      )
      returning *
    `;

    return vinculo;
  },

  /**
   * Encerra um vínculo. A linha permanece, com a data de fim e o autor do
   * encerramento; a chave de vínculo vigente é anulada **pelo banco**, ao
   * gravar `end_date`, liberando um novo vínculo do mesmo par no futuro.
   */
  async end(
    client: Sql,
    id: string,
    endDate: Date,
    endedById: string,
  ): Promise<VehicleDriverAssignment> {
    const [vinculo] = await client<VehicleDriverAssignment[]>`
      update vehicle_driver_assignments
      set end_date = ${endDate}, ended_by_id = ${endedById}
      where id = ${id}
      returning *
    `;

    return vinculo;
  },
};
