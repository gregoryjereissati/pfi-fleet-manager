import {
  DriverStatus,
  MaintenanceStatus,
  Prisma,
  VehicleStatus,
} from '@prisma/client';
import { ExpenseType } from '@fleet-manager/shared';
import { prisma } from '../config/database';

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

export const dashboardRepository = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      expensesAgg,
      pendingMaintenances,
      expiringDocuments,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: VehicleStatus.ACTIVE } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: DriverStatus.ACTIVE } }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: startOfMonth } },
      }),
      prisma.maintenance.count({ where: { status: MaintenanceStatus.SCHEDULED } }),
      prisma.document.count({ where: { expiryDate: { lte: in30Days } } }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      expensesThisMonth: toNumber(expensesAgg._sum.amount),
      pendingMaintenances,
      expiringDocuments,
    };
  },

  async getExpensesByMonth(months = 6) {
    const now = new Date();

    const monthRanges = Array.from({ length: months }, (_, index) => {
      const offset = months - 1 - index;
      const currentMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);

      return {
        label: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
        start: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
      };
    });

    const totals = await Promise.all(
      monthRanges.map(({ start, end }) =>
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } },
        }),
      ),
    );

    return monthRanges.map(({ label }, index) => ({
      month: label,
      total: toNumber(totals[index]?._sum.amount),
    }));
  },

  async getExpensesByType() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const groups = await prisma.expense.groupBy({
      by: ['type'],
      where: { date: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    return groups.map((group) => ({
      type: group.type as ExpenseType,
      total: toNumber(group._sum.amount),
    }));
  },
};
