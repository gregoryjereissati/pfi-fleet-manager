import {
  type DashboardFilters,
  dashboardRepository,
} from '../repositories/dashboard.repository';

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function normalizeFilters(filters: DashboardFilters = {}): DashboardFilters {
  return {
    ...filters,
    endDate: filters.endDate ? endOfDay(filters.endDate) : undefined,
  };
}

export const dashboardService = {
  async getIndicators(filters: DashboardFilters = {}) {
    const normalizedFilters = normalizeFilters(filters);

    const [
      summary,
      expensesByMonth,
      expensesByType,
      expensesByVehicle,
      recentExpenses,
    ] = await Promise.all([
      dashboardRepository.getSummary(normalizedFilters),
      dashboardRepository.getExpensesByMonth(6, normalizedFilters),
      dashboardRepository.getExpensesByType(normalizedFilters),
      dashboardRepository.getExpensesByVehicle(normalizedFilters, 5),
      dashboardRepository.getRecentExpenses(normalizedFilters, 5),
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
