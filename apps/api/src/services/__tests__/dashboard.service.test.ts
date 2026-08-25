import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseType } from '@fleet-manager/shared';
import { dashboardService } from '../dashboard.service';
import { dashboardRepository } from '../../repositories/dashboard.repository';

vi.mock('../../repositories/dashboard.repository', () => ({
  dashboardRepository: {
    getSummary: vi.fn(),
    getExpensesByMonth: vi.fn(),
    getExpensesByType: vi.fn(),
    getExpensesByVehicle: vi.fn(),
    getRecentExpenses: vi.fn(),
  },
}));

const mockSummary = {
  totalVehicles: 5,
  activeVehicles: 3,
  totalDrivers: 4,
  activeDrivers: 4,
  totalExpenses: 1500,
  averageExpense: 750,
  expenseCount: 2,
  pendingMaintenances: 2,
  overdueMaintenances: 1,
  expiringDocuments: 1,
  expiredDocuments: 0,
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

const mockByVehicle = [
  { vehicleId: 'vehicle-1', plate: 'ABC-1234', label: 'ABC-1234 - TOYOTA COROLLA', total: 1200 },
];

const mockRecentExpenses = [
  {
    id: 'expense-1',
    type: ExpenseType.FUEL,
    amount: 800,
    date: new Date('2026-04-10T00:00:00.000Z'),
    description: 'Abastecimento',
    vehiclePlate: 'ABC-1234',
    vehicleLabel: 'ABC-1234 - TOYOTA COROLLA',
  },
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
      vi.mocked(dashboardRepository.getExpensesByVehicle).mockResolvedValue(mockByVehicle);
      vi.mocked(dashboardRepository.getRecentExpenses).mockResolvedValue(mockRecentExpenses);

      const result = await dashboardService.getIndicators();

      expect(result.summary).toEqual(mockSummary);
      expect(result.expensesByMonth).toEqual(mockMonthly);
      expect(result.expensesByType).toEqual(mockByType);
      expect(result.expensesByVehicle).toEqual(mockByVehicle);
      expect(result.recentExpenses).toEqual(mockRecentExpenses);
      expect(dashboardRepository.getExpensesByMonth).toHaveBeenCalledWith(6, {});
      expect(dashboardRepository.getExpensesByVehicle).toHaveBeenCalledWith({}, 5);
      expect(dashboardRepository.getRecentExpenses).toHaveBeenCalledWith({}, 5);
    });

    it('passes normalized filters to every dashboard repository query', async () => {
      const filters = {
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-09T00:00:00.000Z'),
      };
      const normalizedFilters = {
        ...filters,
        endDate: new Date('2026-06-09T23:59:59.999Z'),
      };

      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(mockSummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue(mockMonthly);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue(mockByType);
      vi.mocked(dashboardRepository.getExpensesByVehicle).mockResolvedValue(mockByVehicle);
      vi.mocked(dashboardRepository.getRecentExpenses).mockResolvedValue(mockRecentExpenses);

      await dashboardService.getIndicators(filters);

      expect(dashboardRepository.getSummary).toHaveBeenCalledWith(normalizedFilters);
      expect(dashboardRepository.getExpensesByMonth).toHaveBeenCalledWith(6, normalizedFilters);
      expect(dashboardRepository.getExpensesByType).toHaveBeenCalledWith(normalizedFilters);
      expect(dashboardRepository.getExpensesByVehicle).toHaveBeenCalledWith(normalizedFilters, 5);
      expect(dashboardRepository.getRecentExpenses).toHaveBeenCalledWith(normalizedFilters, 5);
    });

    it('returns zero values when no data exists', async () => {
      const emptySummary = {
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        totalExpenses: 0,
        averageExpense: 0,
        expenseCount: 0,
        pendingMaintenances: 0,
        overdueMaintenances: 0,
        expiringDocuments: 0,
        expiredDocuments: 0,
      };

      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(emptySummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue([]);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue([]);
      vi.mocked(dashboardRepository.getExpensesByVehicle).mockResolvedValue([]);
      vi.mocked(dashboardRepository.getRecentExpenses).mockResolvedValue([]);

      const result = await dashboardService.getIndicators();

      expect(result.summary.totalVehicles).toBe(0);
      expect(result.expensesByMonth).toHaveLength(0);
      expect(result.expensesByType).toHaveLength(0);
      expect(result.expensesByVehicle).toHaveLength(0);
      expect(result.recentExpenses).toHaveLength(0);
    });
  });
});
