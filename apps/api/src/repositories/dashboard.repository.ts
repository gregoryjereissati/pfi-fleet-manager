import { ExpenseType } from '@fleet-manager/shared';
import { sql } from '../config/database';
import { DriverStatus, EntryStatus, MaintenanceStatus, VehicleStatus } from '../types/db';
import type { DocumentDriverScope } from './document.repository';

export interface DashboardFilters {
  /** Empresa do usuário autenticado. Define o recorte de todos os números. */
  companyId: string;
  /**
   * Autor pelo qual filtrar os lançamentos. Preenchido no escopo do
   * motorista, cujos indicadores cobrem apenas o próprio conjunto autorizado.
   */
  createdById?: string;
  /** Recorte do motorista sobre documentos e veículos. */
  driverScope?: DocumentDriverScope;
  vehicleId?: string;
  type?: ExpenseType;
  startDate?: Date;
  endDate?: Date;
}

/** Janela de aviso de vencimento, em dias. */
const DIAS_DE_AVISO = 30;

/**
 * Converte um valor agregado para número.
 *
 * As somas e médias são calculadas pelo PostgreSQL em `numeric`, sem ponto
 * flutuante, e chegam como texto. A conversão acontece só aqui, na saída, onde
 * o contrato da API é numérico — como já era antes.
 */
function paraNumero(valor: string | null | undefined): number {
  if (valor == null) return 0;
  return Number(valor);
}

/**
 * Condição dos lançamentos financeiros.
 *
 * Cancelados ficam de fora de todo indicador: o lançamento permanece na
 * lista, marcado, mas não compõe total, média nem gráfico.
 */
function condicaoDespesa(filters: DashboardFilters) {
  const { companyId, createdById, vehicleId, type, startDate, endDate } = filters;

  return sql`
    e.company_id = ${companyId}
    and e.status = ${EntryStatus.ACTIVE}
    ${createdById ? sql`and e.created_by_id = ${createdById}` : sql``}
    ${vehicleId ? sql`and e.vehicle_id = ${vehicleId}` : sql``}
    ${type ? sql`and e.type = ${type}` : sql``}
    ${startDate ? sql`and e.date >= ${startDate}` : sql``}
    ${endDate ? sql`and e.date <= ${endDate}` : sql``}
  `;
}

function condicaoManutencao(filters: DashboardFilters) {
  return sql`
    m.company_id = ${filters.companyId}
    ${filters.createdById ? sql`and m.created_by_id = ${filters.createdById}` : sql``}
    ${filters.vehicleId ? sql`and m.vehicle_id = ${filters.vehicleId}` : sql``}
  `;
}

function condicaoDocumento(filters: DashboardFilters) {
  const { companyId, driverScope, vehicleId } = filters;

  if (!driverScope) {
    return sql`
      d.company_id = ${companyId}
      ${vehicleId ? sql`and d.vehicle_id = ${vehicleId}` : sql``}
    `;
  }

  const temFicha = Boolean(driverScope.driverId);
  const temVeiculos = driverScope.vehicleIds.length > 0;

  if (!temFicha && !temVeiculos) return sql`false`;

  const alcance = temFicha && temVeiculos
    ? sql`(d.driver_id = ${driverScope.driverId!}
           or d.vehicle_id = any(${driverScope.vehicleIds}::uuid[]))`
    : temFicha
      ? sql`d.driver_id = ${driverScope.driverId!}`
      : sql`d.vehicle_id = any(${driverScope.vehicleIds}::uuid[])`;

  return sql`
    d.company_id = ${companyId}
    ${vehicleId ? sql`and d.vehicle_id = ${vehicleId}` : sql``}
    and ${alcance}
  `;
}

/** Condição dos veículos: o motorista conta apenas os que dirige. */
function condicaoVeiculo(filters: DashboardFilters) {
  const { companyId, driverScope } = filters;

  if (!driverScope) return sql`v.company_id = ${companyId}`;
  if (driverScope.vehicleIds.length === 0) return sql`false`;

  return sql`v.company_id = ${companyId}
             and v.id = any(${driverScope.vehicleIds}::uuid[])`;
}

/** Condição dos motoristas: o motorista conta apenas a si mesmo. */
function condicaoMotorista(filters: DashboardFilters) {
  const { companyId, driverScope } = filters;

  if (!driverScope) return sql`dr.company_id = ${companyId}`;
  if (!driverScope.driverId) return sql`false`;

  return sql`dr.company_id = ${companyId} and dr.id = ${driverScope.driverId}`;
}

export const dashboardRepository = {
  /**
   * Resumo do painel.
   *
   * Tudo em uma ida ao banco: cada indicador é uma subconsulta escalar, e
   * `count(*) filter (where ...)` devolve total e recorte por situação lado a
   * lado, sem agrupar em memória.
   *
   * Os documentos passaram a ser classificados por data civil, com o mesmo
   * critério da listagem. Antes o painel comparava o vencimento com o instante
   * atual e a listagem comparava com a meia-noite do dia: um documento que
   * vencia hoje aparecia como "a vencer" em uma tela e "vencido" na outra.
   */
  async getSummary(filters: DashboardFilters) {
    const [resumo] = await sql<
      {
        totalVehicles: string;
        activeVehicles: string;
        totalDrivers: string;
        activeDrivers: string;
        totalExpenses: string | null;
        averageExpense: string | null;
        expenseCount: string;
        pendingMaintenances: string;
        overdueMaintenances: string;
        expiringDocuments: string;
        expiredDocuments: string;
      }[]
    >`
      select
        (select count(*) from vehicles v where ${condicaoVeiculo(filters)})
          as total_vehicles,
        (select count(*) from vehicles v
          where ${condicaoVeiculo(filters)} and v.status = ${VehicleStatus.ACTIVE})
          as active_vehicles,

        (select count(*) from drivers dr where ${condicaoMotorista(filters)})
          as total_drivers,
        (select count(*) from drivers dr
          where ${condicaoMotorista(filters)} and dr.status = ${DriverStatus.ACTIVE})
          as active_drivers,

        (select sum(e.amount) from expenses e where ${condicaoDespesa(filters)})
          as total_expenses,
        (select avg(e.amount) from expenses e where ${condicaoDespesa(filters)})
          as average_expense,
        (select count(*) from expenses e where ${condicaoDespesa(filters)})
          as expense_count,

        (select count(*) from maintenances m
          where ${condicaoManutencao(filters)} and m.status = ${MaintenanceStatus.SCHEDULED})
          as pending_maintenances,
        (select count(*) from maintenances m
          where ${condicaoManutencao(filters)} and m.status = ${MaintenanceStatus.OVERDUE})
          as overdue_maintenances,

        (select count(*) from documents d
          where ${condicaoDocumento(filters)}
            and d.expiry_date >= current_date
            and d.expiry_date <= current_date + ${DIAS_DE_AVISO}::int)
          as expiring_documents,
        (select count(*) from documents d
          where ${condicaoDocumento(filters)} and d.expiry_date < current_date)
          as expired_documents
    `;

    return {
      totalVehicles: Number(resumo.totalVehicles),
      activeVehicles: Number(resumo.activeVehicles),
      totalDrivers: Number(resumo.totalDrivers),
      activeDrivers: Number(resumo.activeDrivers),
      totalExpenses: paraNumero(resumo.totalExpenses),
      averageExpense: paraNumero(resumo.averageExpense),
      expenseCount: Number(resumo.expenseCount),
      pendingMaintenances: Number(resumo.pendingMaintenances),
      expiringDocuments: Number(resumo.expiringDocuments),
      overdueMaintenances: Number(resumo.overdueMaintenances),
      expiredDocuments: Number(resumo.expiredDocuments),
    };
  },

  /**
   * Total por mês.
   *
   * Os meses do intervalo são gerados pelo próprio banco, de modo que um mês
   * sem lançamento apareça com zero em vez de sumir do gráfico. O agrupamento
   * usa `date_trunc`, que respeita o fuso da sessão do banco — UTC — o mesmo
   * em que a aplicação calculava os limites antes.
   */
  async getExpensesByMonth(months = 6, filters: DashboardFilters) {
    const temFiltroDeData = Boolean(filters.startDate || filters.endDate);

    // Sem filtro de data, o intervalo são os últimos `months` meses até o
    // mês corrente. Com filtro, o intervalo vem dele, limitado a 12 meses
    // para não gerar uma série arbitrariamente longa.
    const quantidade = temFiltroDeData ? 12 : months;

    const linhas = await sql<{ month: string; total: string | null }[]>`
      with intervalo as (
        select
          date_trunc('month', ${filters.startDate ?? null}::timestamptz) as inicio_filtro,
          date_trunc('month', coalesce(${filters.endDate ?? null}::timestamptz, now())) as fim
      ),
      meses as (
        select generate_series(
          coalesce(
            (select inicio_filtro from intervalo),
            (select fim from intervalo) - make_interval(months => ${quantidade - 1})
          ),
          (select fim from intervalo),
          interval '1 month'
        ) as mes
      )
      select
        to_char(m.mes, 'YYYY-MM') as month,
        sum(e.amount) as total
      from (select mes from meses order by mes desc limit ${quantidade}) m
      left join expenses e
        on date_trunc('month', e.date) = m.mes
       and ${condicaoDespesa(filters)}
      group by m.mes
      order by m.mes asc
    `;

    return linhas.map((linha) => ({
      month: linha.month,
      total: paraNumero(linha.total),
    }));
  },

  async getExpensesByType(filters: DashboardFilters) {
    const linhas = await sql<{ type: ExpenseType; total: string | null }[]>`
      select e.type, sum(e.amount) as total
      from expenses e
      where ${condicaoDespesa(filters)}
      group by e.type
    `;

    return linhas.map((linha) => ({
      type: linha.type,
      total: paraNumero(linha.total),
    }));
  },

  async getExpensesByVehicle(filters: DashboardFilters, limit = 5) {
    const linhas = await sql<
      { vehicleId: string; plate: string | null; label: string; total: string | null }[]
    >`
      select
        e.vehicle_id,
        v.plate,
        coalesce(v.plate || ' - ' || v.brand || ' ' || v.model, e.vehicle_id::text) as label,
        sum(e.amount) as total
      from expenses e
      left join vehicles v
        on v.id = e.vehicle_id and v.company_id = ${filters.companyId}
      where ${condicaoDespesa(filters)}
      group by e.vehicle_id, v.plate, v.brand, v.model
      order by sum(e.amount) desc
      limit ${limit}
    `;

    return linhas.map((linha) => ({
      vehicleId: linha.vehicleId,
      plate: linha.plate ?? 'N/A',
      label: linha.label,
      total: paraNumero(linha.total),
    }));
  },

  async getRecentExpenses(filters: DashboardFilters, limit = 5) {
    const linhas = await sql<
      {
        id: string;
        type: ExpenseType;
        amount: string;
        date: Date;
        description: string | null;
        vehiclePlate: string;
        vehicleLabel: string;
      }[]
    >`
      select
        e.id,
        e.type,
        e.amount,
        e.date,
        e.description,
        v.plate as vehicle_plate,
        v.plate || ' - ' || v.brand || ' ' || v.model as vehicle_label
      from expenses e
      join vehicles v on v.id = e.vehicle_id
      where ${condicaoDespesa(filters)}
      order by e.date desc
      limit ${limit}
    `;

    return linhas.map((linha) => ({
      id: linha.id,
      type: linha.type,
      amount: paraNumero(linha.amount),
      date: linha.date,
      description: linha.description,
      vehiclePlate: linha.vehiclePlate,
      vehicleLabel: linha.vehicleLabel,
    }));
  },
};
