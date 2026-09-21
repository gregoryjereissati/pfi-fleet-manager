import { ExpenseType } from '@fleet-manager/shared';
import { sql, type Sql } from '../config/database';
import { EntryStatus, type Expense } from '../types/db';

export interface ExpenseFilters {
  /** Empresa do usuário autenticado. Obrigatório: define o recorte. */
  companyId: string;
  /**
   * Autor pelo qual filtrar. Preenchido no escopo do motorista, que consulta
   * apenas os próprios lançamentos, e ausente no escopo da empresa.
   */
  createdById?: string;
  vehicleId?: string;
  type?: ExpenseType;
  startDate?: Date;
  endDate?: Date;
  /** Ausente devolve ativos e cancelados; os cancelados vêm marcados. */
  status?: EntryStatus;
  orderBy?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateExpenseData {
  companyId: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: Date;
  description?: string;
  createdById: string;
}

export interface UpdateExpenseData {
  vehicleId?: string;
  type?: ExpenseType;
  amount?: number;
  date?: Date;
  description?: string;
}

/** Veículo como a listagem de despesas o apresenta. */
export interface ExpenseVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

/** Despesa com o veículo aninhado, no formato que a API devolve. */
export type ExpenseWithVehicle = Expense & { vehicle: ExpenseVehicle };

/**
 * Colunas de ordenação aceitas, mapeadas para a expressão SQL correspondente.
 *
 * O valor recebido na requisição nunca entra na consulta: ele serve apenas de
 * chave neste mapa fechado. Um valor fora da lista cai no padrão.
 */
const ORDENACOES = {
  date: 'e.date',
  amount: 'e.amount',
  createdAt: 'e.created_at',
} as const;

/** Campos que a alteração pode escrever. Qualquer outro é ignorado. */
const CAMPOS_ALTERAVEIS = [
  'vehicleId',
  'type',
  'amount',
  'date',
  'description',
] as const satisfies readonly (keyof UpdateExpenseData)[];

/**
 * Veículo aninhado. As chaves são escritas já no formato da resposta: o driver
 * converte nomes de coluna, mas não mexe no conteúdo de `json`.
 */
const veiculoAninhado = sql`
  json_build_object(
    'id', v.id,
    'plate', v.plate,
    'brand', v.brand,
    'model', v.model
  ) as vehicle
`;

/**
 * Condições do recorte, comuns a toda consulta de despesa.
 *
 * `companyId` é sempre a primeira condição e não é opcional: é a fronteira de
 * isolamento, e nenhuma consulta desta camada existe fora dela.
 */
function condicoes(filters: ExpenseFilters) {
  const { companyId, createdById, vehicleId, type, startDate, endDate, status } = filters;

  return sql`
    e.company_id = ${companyId}
    ${createdById ? sql`and e.created_by_id = ${createdById}` : sql``}
    ${vehicleId ? sql`and e.vehicle_id = ${vehicleId}` : sql``}
    ${type ? sql`and e.type = ${type}` : sql``}
    ${status ? sql`and e.status = ${status}` : sql``}
    ${startDate ? sql`and e.date >= ${startDate}` : sql``}
    ${endDate ? sql`and e.date <= ${endDate}` : sql``}
  `;
}

export const expenseRepository = {
  findMany(filters: ExpenseFilters): Promise<ExpenseWithVehicle[]> {
    const { orderBy = 'date', order = 'desc' } = filters;

    const coluna = ORDENACOES[orderBy] ?? ORDENACOES.date;
    const direcao = order === 'asc' ? 'asc' : 'desc';

    return sql<ExpenseWithVehicle[]>`
      select e.*, ${veiculoAninhado}
      from expenses e
      join vehicles v on v.id = e.vehicle_id
      where ${condicoes(filters)}
      order by ${sql.unsafe(coluna)} ${sql.unsafe(direcao)}
    ` as unknown as Promise<ExpenseWithVehicle[]>;
  },

  /**
   * Busca por identificador dentro do recorte.
   *
   * `createdById` participa da condição no escopo do motorista: um lançamento
   * de outro motorista não é encontrado, e não há como distinguir isso de um
   * identificador inexistente.
   */
  async findById(
    id: string,
    companyId: string,
    createdById?: string,
  ): Promise<ExpenseWithVehicle | null> {
    const [despesa] = await sql<ExpenseWithVehicle[]>`
      select e.*, ${veiculoAninhado}
      from expenses e
      join vehicles v on v.id = e.vehicle_id
      where e.id = ${id}
        and e.company_id = ${companyId}
        ${createdById ? sql`and e.created_by_id = ${createdById}` : sql``}
    `;

    return despesa ?? null;
  },

  async create(client: Sql, data: CreateExpenseData): Promise<ExpenseWithVehicle> {
    const [despesa] = await client<ExpenseWithVehicle[]>`
      with nova as (
        insert into expenses (
          company_id, vehicle_id, type, amount, date, description, created_by_id
        )
        values (
          ${data.companyId},
          ${data.vehicleId},
          ${data.type},
          ${data.amount},
          ${data.date},
          ${data.description ?? null},
          ${data.createdById}
        )
        returning *
      )
      select e.*, ${veiculoAninhado}
      from nova e
      join vehicles v on v.id = e.vehicle_id
    `;

    return despesa;
  },

  async update(
    client: Sql,
    id: string,
    data: UpdateExpenseData,
    updatedById: string,
  ): Promise<ExpenseWithVehicle> {
    // Só as chaves presentes em `data` e listadas em CAMPOS_ALTERAVEIS entram
    // no SET. O nome da coluna vem da lista, não do corpo da requisição.
    const chaves = CAMPOS_ALTERAVEIS.filter((campo) => campo in data);

    const [despesa] = await client<ExpenseWithVehicle[]>`
      with alterada as (
        update expenses
        set ${chaves.length > 0 ? client`${client(data, ...chaves)},` : client``}
            updated_by_id = ${updatedById}
        where id = ${id}
        returning *
      )
      select e.*, ${veiculoAninhado}
      from alterada e
      join vehicles v on v.id = e.vehicle_id
    `;

    return despesa;
  },

  /**
   * Cancela o lançamento: ele sai dos totais e permanece na lista, marcado,
   * com o motivo e o autor do cancelamento.
   */
  async cancel(
    client: Sql,
    id: string,
    cancelledById: string,
    reason: string,
  ): Promise<ExpenseWithVehicle> {
    const [despesa] = await client<ExpenseWithVehicle[]>`
      with cancelada as (
        update expenses
        set status = ${EntryStatus.CANCELLED},
            cancelled_at = now(),
            cancelled_by_id = ${cancelledById},
            cancel_reason = ${reason},
            updated_by_id = ${cancelledById}
        where id = ${id}
        returning *
      )
      select e.*, ${veiculoAninhado}
      from cancelada e
      join vehicles v on v.id = e.vehicle_id
    `;

    return despesa;
  },

  async uncancel(client: Sql, id: string, updatedById: string): Promise<ExpenseWithVehicle> {
    const [despesa] = await client<ExpenseWithVehicle[]>`
      with restaurada as (
        update expenses
        set status = ${EntryStatus.ACTIVE},
            cancelled_at = null,
            cancelled_by_id = null,
            cancel_reason = null,
            updated_by_id = ${updatedById}
        where id = ${id}
        returning *
      )
      select e.*, ${veiculoAninhado}
      from restaurada e
      join vehicles v on v.id = e.vehicle_id
    `;

    return despesa;
  },

  async delete(client: Sql, id: string): Promise<ExpenseWithVehicle> {
    const [despesa] = await client<ExpenseWithVehicle[]>`
      with removida as (
        delete from expenses
        where id = ${id}
        returning *
      )
      select e.*, ${veiculoAninhado}
      from removida e
      join vehicles v on v.id = e.vehicle_id
    `;

    return despesa;
  },
};
