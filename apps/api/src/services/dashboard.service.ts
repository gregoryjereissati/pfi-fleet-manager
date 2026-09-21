import { dashboardRepository, type DashboardFilters } from '../repositories/dashboard.repository';
import { assignmentService } from './assignment.service';
import { authorFilter, type AccessScope } from '../lib/access-scope';

/** Filtros públicos do painel, antes do recorte de acesso. */
export type DashboardQuery = Omit<
  DashboardFilters,
  'companyId' | 'createdById' | 'driverScope'
>;

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

export const dashboardService = {
  /**
   * Indicadores do painel.
   *
   * Todo número respeita a empresa. No escopo do motorista, respeita também a
   * autoria: os indicadores cobrem o conjunto que ele pode ver, e não a
   * operação da empresa.
   */
  async getIndicators(scope: AccessScope, query: DashboardQuery = {}) {
    const driverScope = await assignmentService.driverDataScope(scope);

    const filters: DashboardFilters = {
      ...query,
      endDate: query.endDate ? endOfDay(query.endDate) : undefined,
      companyId: scope.companyId,
      createdById: authorFilter(scope),
      driverScope,
    };

    const [summary, expensesByMonth, expensesByType, expensesByVehicle, recentExpenses] =
      await Promise.all([
        dashboardRepository.getSummary(filters),
        dashboardRepository.getExpensesByMonth(6, filters),
        dashboardRepository.getExpensesByType(filters),
        dashboardRepository.getExpensesByVehicle(filters, 5),
        dashboardRepository.getRecentExpenses(filters, 5),
      ]);

    return {
      summary,
      expensesByMonth,
      expensesByType,
      expensesByVehicle,
      recentExpenses,
    };
  },
};
