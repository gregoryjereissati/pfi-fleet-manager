import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import type { Maintenance } from '../types/db';
import { veiculoResumido } from './fragments';

export interface MaintenanceFilters {
  companyId: string;
  /** Preenchido no escopo do motorista: apenas os lançamentos próprios. */
  createdById?: string;
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  startDate?: Date;
  endDate?: Date;
  orderBy?: 'scheduledDate' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

export interface CreateMaintenanceData {
  companyId: string;
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: Date;
  createdById: string;
}

export interface UpdateMaintenanceData {
  status?: MaintenanceStatus;
  description?: string;
  scheduledDate?: Date;
  completedDate?: Date | null;
}

export interface MaintenanceVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

export type MaintenanceWithVehicle = Maintenance & { vehicle: MaintenanceVehicle };

/**
 * Colunas de ordenação aceitas, mapeadas para a expressão SQL correspondente.
 * O valor recebido na requisição é apenas chave neste mapa fechado.
 */
const ORDENACOES = {
  scheduledDate: 'm.scheduled_date',
  createdAt: 'm.created_at',
  status: 'm.status',
} as const;

const CAMPOS_ALTERAVEIS = [
  'status',
  'description',
  'scheduledDate',
  'completedDate',
] as const satisfies readonly (keyof UpdateMaintenanceData)[];

/**
 * Condições do recorte, comuns a toda consulta de manutenção.
 *
 * Exportada porque o painel de indicadores reaproveita exatamente o mesmo
 * recorte: dois filtros escritos à parte acabariam divergindo.
 */
export function condicoesManutencao(filters: MaintenanceFilters) {
  const { companyId, createdById, vehicleId, type, status, startDate, endDate } = filters;

  return sql`
    m.company_id = ${companyId}
    ${createdById ? sql`and m.created_by_id = ${createdById}` : sql``}
    ${vehicleId ? sql`and m.vehicle_id = ${vehicleId}` : sql``}
    ${type ? sql`and m.type = ${type}` : sql``}
    ${status ? sql`and m.status = ${status}` : sql``}
    ${startDate ? sql`and m.scheduled_date >= ${startDate}` : sql``}
    ${endDate ? sql`and m.scheduled_date <= ${endDate}` : sql``}
  `;
}

export const maintenanceRepository = {
  findMany(filters: MaintenanceFilters): Promise<MaintenanceWithVehicle[]> {
    const { orderBy = 'scheduledDate', order = 'asc' } = filters;

    const coluna = ORDENACOES[orderBy] ?? ORDENACOES.scheduledDate;
    const direcao = order === 'desc' ? 'desc' : 'asc';

    return sql<MaintenanceWithVehicle[]>`
      select m.*, ${veiculoResumido('v')} as vehicle
      from maintenances m
      join vehicles v on v.id = m.vehicle_id
      where ${condicoesManutencao(filters)}
      order by ${sql.unsafe(coluna)} ${sql.unsafe(direcao)}
    ` as unknown as Promise<MaintenanceWithVehicle[]>;
  },

  async findById(
    id: string,
    companyId: string,
    createdById?: string,
  ): Promise<MaintenanceWithVehicle | null> {
    const [manutencao] = await sql<MaintenanceWithVehicle[]>`
      select m.*, ${veiculoResumido('v')} as vehicle
      from maintenances m
      join vehicles v on v.id = m.vehicle_id
      where m.id = ${id}
        and m.company_id = ${companyId}
        ${createdById ? sql`and m.created_by_id = ${createdById}` : sql``}
    `;

    return manutencao ?? null;
  },

  async create(client: Sql, data: CreateMaintenanceData): Promise<MaintenanceWithVehicle> {
    const [manutencao] = await client<MaintenanceWithVehicle[]>`
      with nova as (
        insert into maintenances (
          company_id, vehicle_id, type, description, scheduled_date, created_by_id
        )
        values (
          ${data.companyId},
          ${data.vehicleId},
          ${data.type},
          ${data.description},
          ${data.scheduledDate},
          ${data.createdById}
        )
        returning *
      )
      select m.*, ${veiculoResumido('v')} as vehicle
      from nova m
      join vehicles v on v.id = m.vehicle_id
    `;

    return manutencao;
  },

  async update(
    client: Sql,
    id: string,
    data: UpdateMaintenanceData,
    updatedById: string,
  ): Promise<MaintenanceWithVehicle> {
    // Só as chaves presentes em `data` e listadas em CAMPOS_ALTERAVEIS entram
    // no SET. O nome da coluna vem da lista, não do corpo da requisição.
    //
    // O autor entra no mesmo objeto, e não como fragmento à parte: o auxiliar
    // do postgres.js decide se monta um SET a partir da instrução que veio
    // antes dele, e dentro de um fragmento aninhado essa instrução chega
    // vazia — ele tentava então listar identificadores e quebrava
    // (`xs.map is not a function`). Assim também desaparece o caso de SET
    // vazio: o autor está sempre presente.
    const alteracoes = { ...data, updatedById };
    const chaves = [
      ...CAMPOS_ALTERAVEIS.filter((campo) => campo in data),
      'updatedById',
    ] as (keyof UpdateMaintenanceData | 'updatedById')[];

    const [manutencao] = await client<MaintenanceWithVehicle[]>`
      with alterada as (
        update maintenances
        set ${client(alteracoes, ...chaves)}
        where id = ${id}
        returning *
      )
      select m.*, ${veiculoResumido('v')} as vehicle
      from alterada m
      join vehicles v on v.id = m.vehicle_id
    `;

    return manutencao;
  },

  async cancel(
    client: Sql,
    id: string,
    cancelledById: string,
    reason: string,
  ): Promise<MaintenanceWithVehicle> {
    const [manutencao] = await client<MaintenanceWithVehicle[]>`
      with cancelada as (
        update maintenances
        set status = ${MaintenanceStatus.CANCELLED},
            cancelled_at = now(),
            cancelled_by_id = ${cancelledById},
            cancel_reason = ${reason},
            updated_by_id = ${cancelledById}
        where id = ${id}
        returning *
      )
      select m.*, ${veiculoResumido('v')} as vehicle
      from cancelada m
      join vehicles v on v.id = m.vehicle_id
    `;

    return manutencao;
  },

  /** Devolve a manutenção cancelada à situação programada. */
  async uncancel(client: Sql, id: string, updatedById: string): Promise<MaintenanceWithVehicle> {
    const [manutencao] = await client<MaintenanceWithVehicle[]>`
      with restaurada as (
        update maintenances
        set status = ${MaintenanceStatus.SCHEDULED},
            cancelled_at = null,
            cancelled_by_id = null,
            cancel_reason = null,
            updated_by_id = ${updatedById}
        where id = ${id}
        returning *
      )
      select m.*, ${veiculoResumido('v')} as vehicle
      from restaurada m
      join vehicles v on v.id = m.vehicle_id
    `;

    return manutencao;
  },

  async delete(client: Sql, id: string): Promise<MaintenanceWithVehicle> {
    const [manutencao] = await client<MaintenanceWithVehicle[]>`
      with removida as (
        delete from maintenances where id = ${id} returning *
      )
      select m.*, ${veiculoResumido('v')} as vehicle
      from removida m
      join vehicles v on v.id = m.vehicle_id
    `;

    return manutencao;
  },
};
