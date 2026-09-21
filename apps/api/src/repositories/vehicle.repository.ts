import { VehicleStatus } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import type { Vehicle } from '../types/db';
import { instanteIso, motoristaComIdentidade } from './fragments';

export interface VehicleFilters {
  plate?: string;
  brand?: string;
  model?: string;
  status?: VehicleStatus;
  yearMin?: number;
  yearMax?: number;
  /**
   * Restringe a listagem a um conjunto de veículos. Usado no escopo do
   * motorista, que enxerga apenas os veículos a que está vinculado.
   */
  vehicleIds?: string[];
  orderBy?: 'plate' | 'brand' | 'model' | 'year' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateVehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  status?: VehicleStatus;
}

export interface UpdateVehicleData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: VehicleStatus;
}

/**
 * Colunas de ordenação aceitas, mapeadas para a expressão SQL correspondente.
 * O valor recebido na requisição é apenas chave neste mapa fechado.
 */
const ORDENACOES = {
  plate: 'plate',
  brand: 'brand',
  model: 'model',
  year: 'year',
  createdAt: 'created_at',
} as const;

const CAMPOS_ALTERAVEIS = [
  'plate',
  'brand',
  'model',
  'year',
  'color',
  'status',
] as const satisfies readonly (keyof UpdateVehicleData)[];

/** Vínculo vigente como aparece na ficha do veículo. */
export interface VehicleAssignment {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  startDate: string;
  endDate: string | null;
  startEstimated: boolean;
  driver: {
    id: string;
    name: string | null;
    cpf: string | null;
    status: string;
    user: { id: string; name: string; cpf: string; email: string } | null;
  };
}

/** Lançamento resumido como aparece na ficha do veículo. */
export interface VehicleEntrySummary {
  id: string;
  companyId: string;
  vehicleId: string;
  type: string;
  [campo: string]: unknown;
}

/** Veículo com os vínculos vigentes e os últimos lançamentos. */
export type VehicleWithDetails = Vehicle & {
  assignments: VehicleAssignment[];
  expenses: VehicleEntrySummary[];
  maintenances: VehicleEntrySummary[];
};

/** Vínculos vigentes, com a identidade do motorista para exibição. */
const vinculosVigentes = sql`
  coalesce((
    select json_agg(
      json_build_object(
        'id', a.id,
        'companyId', a.company_id,
        'vehicleId', a.vehicle_id,
        'driverId', a.driver_id,
        'startDate', ${instanteIso('a.start_date')},
        'endDate', case when a.end_date is null then null else ${instanteIso('a.end_date')} end,
        'startEstimated', a.start_estimated,
        'driver', ${motoristaComIdentidade('d', 'u')}
      )
      order by a.start_date asc
    )
    from vehicle_driver_assignments a
    join drivers d on d.id = a.driver_id
    left join users u on u.id = d.user_id
    where a.vehicle_id = v.id
      and a.company_id = v.company_id
      and a.end_date is null
  ), '[]'::json) as assignments
`;

export const vehicleRepository = {
  findMany(companyId: string, filters: VehicleFilters = {}): Promise<Vehicle[]> {
    const {
      plate,
      brand,
      model,
      status,
      yearMin,
      yearMax,
      vehicleIds,
      orderBy = 'createdAt',
      order = 'desc',
    } = filters;

    const coluna = ORDENACOES[orderBy] ?? ORDENACOES.createdAt;
    const direcao = order === 'asc' ? 'asc' : 'desc';

    // `plate` é o campo de busca livre da listagem: procura em placa, marca e
    // modelo ao mesmo tempo, como antes.
    const busca = plate ? `%${plate}%` : null;

    return sql<Vehicle[]>`
      select *
      from vehicles v
      where v.company_id = ${companyId}
        ${vehicleIds ? sql`and v.id = any(${vehicleIds}::uuid[])` : sql``}
        ${
          busca
            ? sql`and (v.plate ilike ${busca} or v.brand ilike ${busca} or v.model ilike ${busca})`
            : sql``
        }
        ${brand ? sql`and v.brand ilike ${`%${brand}%`}` : sql``}
        ${model ? sql`and v.model ilike ${`%${model}%`}` : sql``}
        ${status ? sql`and v.status = ${status}` : sql``}
        ${yearMin ? sql`and v.year >= ${yearMin}` : sql``}
        ${yearMax ? sql`and v.year <= ${yearMax}` : sql``}
      order by ${sql.unsafe(coluna)} ${sql.unsafe(direcao)}
    ` as unknown as Promise<Vehicle[]>;
  },

  /**
   * Busca por identificador **dentro da empresa**.
   *
   * O recorte faz parte da condição, e não de uma verificação posterior: um
   * identificador de outra empresa não é encontrado, e a resposta é a mesma de
   * um identificador inexistente — nada é revelado sobre a existência do
   * registro.
   */
  async findById(id: string, companyId: string): Promise<VehicleWithDetails | null> {
    const [veiculo] = await sql<VehicleWithDetails[]>`
      select
        v.*,
        ${vinculosVigentes},
        coalesce((
          select json_agg(x order by x->>'date' desc)
          from (
            select json_build_object(
              'id', e.id,
              'companyId', e.company_id,
              'vehicleId', e.vehicle_id,
              'type', e.type,
              'amount', e.amount,
              'date', ${instanteIso('e.date')},
              'description', e.description,
              'status', e.status,
              'createdById', e.created_by_id,
              'createdAt', ${instanteIso('e.created_at')}
            ) as x
            from expenses e
            where e.vehicle_id = v.id
              and e.company_id = v.company_id
              and e.status = 'ACTIVE'
            order by e.date desc
            limit 5
          ) as ultimas
        ), '[]'::json) as expenses,
        coalesce((
          select json_agg(x order by x->>'scheduledDate' desc)
          from (
            select json_build_object(
              'id', m.id,
              'companyId', m.company_id,
              'vehicleId', m.vehicle_id,
              'type', m.type,
              'status', m.status,
              'description', m.description,
              'scheduledDate', ${instanteIso('m.scheduled_date')},
              'completedDate', case when m.completed_date is null then null
                                    else ${instanteIso('m.completed_date')} end,
              'createdById', m.created_by_id
            ) as x
            from maintenances m
            where m.vehicle_id = v.id
              and m.company_id = v.company_id
              and m.status <> 'CANCELLED'
            order by m.scheduled_date desc
            limit 5
          ) as ultimas
        ), '[]'::json) as maintenances
      from vehicles v
      where v.id = ${id}
        and v.company_id = ${companyId}
    `;

    return veiculo ?? null;
  },

  /** Verificação leve de existência e pertencimento, sem carregar relações. */
  async findSummaryById(
    id: string,
    companyId: string,
  ): Promise<{ id: string; companyId: string; plate: string; status: VehicleStatus } | null> {
    const [veiculo] = await sql<
      { id: string; companyId: string; plate: string; status: VehicleStatus }[]
    >`
      select id, company_id, plate, status
      from vehicles
      where id = ${id} and company_id = ${companyId}
    `;

    return veiculo ?? null;
  },

  async findByPlate(companyId: string, plate: string): Promise<Vehicle | null> {
    const [veiculo] = await sql<Vehicle[]>`
      select * from vehicles
      where company_id = ${companyId} and plate = ${plate}
    `;

    return veiculo ?? null;
  },

  async create(client: Sql, companyId: string, data: CreateVehicleData): Promise<Vehicle> {
    const [veiculo] = await client<Vehicle[]>`
      insert into vehicles (company_id, plate, brand, model, year, color, status)
      values (
        ${companyId},
        ${data.plate},
        ${data.brand},
        ${data.model},
        ${data.year},
        ${data.color ?? ''},
        ${data.status ?? VehicleStatus.ACTIVE}
      )
      returning *
    `;

    return veiculo;
  },

  async update(client: Sql, id: string, data: UpdateVehicleData): Promise<Vehicle> {
    const chaves = CAMPOS_ALTERAVEIS.filter((campo) => campo in data);

    if (chaves.length === 0) {
      const [inalterado] = await client<Vehicle[]>`select * from vehicles where id = ${id}`;
      return inalterado;
    }

    const [veiculo] = await client<Vehicle[]>`
      update vehicles
      set ${client(data, ...chaves)}
      where id = ${id}
      returning *
    `;

    return veiculo;
  },

  async setInactive(client: Sql, id: string): Promise<Vehicle> {
    const [veiculo] = await client<Vehicle[]>`
      update vehicles
      set status = ${VehicleStatus.INACTIVE}
      where id = ${id}
      returning *
    `;

    return veiculo;
  },

  async hardDelete(client: Sql, id: string): Promise<Vehicle> {
    const [veiculo] = await client<Vehicle[]>`
      delete from vehicles where id = ${id} returning *
    `;

    return veiculo;
  },

  /** Contagem do que a exclusão permanente levaria junto, em cascata. */
  async countDependents(id: string, companyId: string) {
    const [contagem] = await sql<
      { expenses: string; maintenances: string; documents: string; assignments: string }[]
    >`
      select
        (select count(*) from expenses where vehicle_id = ${id} and company_id = ${companyId}) as expenses,
        (select count(*) from maintenances where vehicle_id = ${id} and company_id = ${companyId}) as maintenances,
        (select count(*) from documents where vehicle_id = ${id} and company_id = ${companyId}) as documents,
        (select count(*) from vehicle_driver_assignments where vehicle_id = ${id} and company_id = ${companyId}) as assignments
    `;

    // `count(*)` é bigint e chega como texto, para não perder precisão em
    // valores acima de 2^53. Aqui são contagens pequenas: converter é seguro.
    return {
      expenses: Number(contagem.expenses),
      maintenances: Number(contagem.maintenances),
      documents: Number(contagem.documents),
      assignments: Number(contagem.assignments),
    };
  },
};
