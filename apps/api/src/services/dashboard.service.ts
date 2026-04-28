import { dashboardRepository } from '../repositories/dashboard.repository';

export const dashboardService = {
  async getIndicators() {
    const [summary, expensesByMonth, expensesByType] = await Promise.all([
      dashboardRepository.getSummary(),
      dashboardRepository.getExpensesByMonth(6),
      dashboardRepository.getExpensesByType(),
    ]);

    return {
      summary,
      expensesByMonth,
      expensesByType,
    };
  },
};
