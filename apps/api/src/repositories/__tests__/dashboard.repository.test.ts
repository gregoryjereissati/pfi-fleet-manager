import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { ExpenseType } from '@fleet-manager/shared';
import { dashboardRepository } from '../dashboard.repository';
import { prisma } from '../../config/database';

vi.mock('../../config/database', () => ({
  prisma: {
    expense: {
      groupBy: vi.fn(),
    },
  },
}));

describe('dashboardRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExpensesByType', () => {
    it('groups all expenses by type without limiting to the current month', async () => {
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([
        {
          id: 'fuel-group',
          vehicleId: 'vehicle-1',
          type: ExpenseType.FUEL,
          amount: new Prisma.Decimal(0),
          date: new Date('2026-06-01T00:00:00.000Z'),
          description: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          _count: undefined,
          _avg: undefined,
          _sum: { amount: new Prisma.Decimal(2990) },
          _min: undefined,
          _max: undefined,
        },
        {
          id: 'maintenance-group',
          vehicleId: 'vehicle-1',
          type: ExpenseType.MAINTENANCE,
          amount: new Prisma.Decimal(0),
          date: new Date('2026-06-01T00:00:00.000Z'),
          description: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          _count: undefined,
          _avg: undefined,
          _sum: { amount: new Prisma.Decimal(9310) },
          _min: undefined,
          _max: undefined,
        },
      ]);

      const result = await dashboardRepository.getExpensesByType();

      expect(prisma.expense.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: {},
        _sum: { amount: true },
      });
      expect(result).toEqual([
        { type: ExpenseType.FUEL, total: 2990 },
        { type: ExpenseType.MAINTENANCE, total: 9310 },
      ]);
    });
  });
});
