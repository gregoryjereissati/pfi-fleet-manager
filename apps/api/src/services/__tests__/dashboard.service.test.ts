import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseType } from '@fleet-manager/shared';
import { dashboardService } from '../dashboard.service';
import { dashboardRepository } from '../../repositories/dashboard.repository';

vi.mock('../../repositories/dashboard.repository', () => ({
  dashboardRepository: {
    getSummary: vi.fn(),
    getExpensesByMonth: vi.fn(),
    getExpensesByType: vi.fn(),
  },
}));

const mockSummary = {
  totalVehicles: 5,
  activeVehicles: 3,
  totalDrivers: 4,
  activeDrivers: 4,
  expensesThisMonth: 1500,
  pendingMaintenances: 2,
  expiringDocuments: 1,
};

const mockMonthly = [
  { month: '2025-11', total: 900 },
  { month: '2025-12', total: 1100 },
  { month: '2026-01', total: 800 },
  { month: '2026-02', total: 600 },
  { month: '2026-03', total: 1200 },
  { month: '2026-04', total: 1500 },
];

const mockByType = [
  { type: ExpenseType.FUEL, total: 800 },
  { type: ExpenseType.MAINTENANCE, total: 700 },
];

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIndicators', () => {
    it('returns summary, expensesByMonth, and expensesByType', async () => {
      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(mockSummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue(mockMonthly);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue(mockByType);

      const result = await dashboardService.getIndicators();

      expect(result.summary).toEqual(mockSummary);
      expect(result.expensesByMonth).toEqual(mockMonthly);
      expect(result.expensesByType).toEqual(mockByType);
      expect(dashboardRepository.getExpensesByMonth).toHaveBeenCalledWith(6);
    });

    it('returns zero values when no data exists', async () => {
      const emptySummary = {
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        expensesThisMonth: 0,
        pendingMaintenances: 0,
        expiringDocuments: 0,
      };

      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(emptySummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue([]);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue([]);

      const result = await dashboardService.getIndicators();

      expect(result.summary.totalVehicles).toBe(0);
      expect(result.expensesByMonth).toHaveLength(0);
      expect(result.expensesByType).toHaveLength(0);
    });
  });
});
