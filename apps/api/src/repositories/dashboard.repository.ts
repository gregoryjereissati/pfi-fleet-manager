import {
  DriverStatus,
  MaintenanceStatus,
  Prisma,
  VehicleStatus,
} from '@prisma/client';
import { ExpenseType } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface DashboardFilters {
  vehicleId?: string;
  type?: ExpenseType;
  startDate?: Date;
  endDate?: Date;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function buildExpenseWhere(filters: DashboardFilters = {}): Prisma.ExpenseWhereInput {
  const { vehicleId, type, startDate, endDate } = filters;

  return {
    ...(vehicleId && { vehicleId }),
    ...(type && { type }),
    ...((startDate || endDate) && {
      date: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    }),
  };
}

function buildVehicleScopedWhere(vehicleId?: string) {
  return vehicleId ? { vehicleId } : {};
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export const dashboardRepository = {
  async getSummary(filters: DashboardFilters = {}) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expenseWhere = buildExpenseWhere(filters);
    const vehicleScopedWhere = buildVehicleScopedWhere(filters.vehicleId);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      expensesAgg,
      expenseCount,
      pendingMaintenances,
      overdueMaintenances,
      expiringDocuments,
      expiredDocuments,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: VehicleStatus.ACTIVE } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: DriverStatus.ACTIVE } }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        _avg: { amount: true },
        where: expenseWhere,
      }),
      prisma.expense.count({ where: expenseWhere }),
      prisma.maintenance.count({
        where: { ...vehicleScopedWhere, status: MaintenanceStatus.SCHEDULED },
      }),
      prisma.maintenance.count({
        where: { ...vehicleScopedWhere, status: MaintenanceStatus.OVERDUE },
      }),
      prisma.document.count({
        where: {
          ...vehicleScopedWhere,
          expiryDate: { gte: now, lte: in30Days },
        },
      }),
      prisma.document.count({
        where: {
          ...vehicleScopedWhere,
          expiryDate: { lt: now },
        },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      totalExpenses: toNumber(expensesAgg._sum.amount),
      averageExpense: toNumber(expensesAgg._avg.amount),
      expenseCount,
      pendingMaintenances,
      expiringDocuments,
      overdueMaintenances,
      expiredDocuments,
    };
  },

  async getExpensesByMonth(months = 6, filters: DashboardFilters = {}) {
    const now = new Date();
    const hasDateFilter = Boolean(filters.startDate || filters.endDate);
    const rangeEnd = filters.endDate ?? now;
    const rangeStart = filters.startDate ?? addMonths(startOfMonth(rangeEnd), -(months - 1));
    const firstMonth = startOfMonth(rangeStart);
    const lastMonth = startOfMonth(rangeEnd);
    const monthCount = hasDateFilter
      ? Math.min(
          12,
          (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 +
            lastMonth.getMonth() -
            firstMonth.getMonth() +
            1,
        )
      : months;

    const monthRanges = Array.from({ length: monthCount }, (_, index) => {
      const currentMonth = addMonths(firstMonth, index);

      return {
        label: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
        start: currentMonth,
        end: addMonths(currentMonth, 1),
      };
    });

    const totals = await Promise.all(
      monthRanges.map(({ start, end }) =>
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            ...buildExpenseWhere(filters),
            date: {
              gte: filters.startDate && filters.startDate > start ? filters.startDate : start,
              lt: filters.endDate && filters.endDate < end ? filters.endDate : end,
            },
          },
        }),
      ),
    );

    return monthRanges.map(({ label }, index) => ({
      month: label,
      total: toNumber(totals[index]?._sum.amount),
    }));
  },

  async getExpensesByType(filters: DashboardFilters = {}) {
    const groups = await prisma.expense.groupBy({
      by: ['type'],
      where: buildExpenseWhere(filters),
      _sum: { amount: true },
    });

    return groups.map((group) => ({
      type: group.type as ExpenseType,
      total: toNumber(group._sum.amount),
    }));
  },

  async getExpensesByVehicle(filters: DashboardFilters = {}, limit = 5) {
    const groups = await prisma.expense.groupBy({
      by: ['vehicleId'],
      where: buildExpenseWhere(filters),
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: groups.map((group) => group.vehicleId) } },
      select: { id: true, plate: true, brand: true, model: true },
    });

    return groups.map((group) => {
      const vehicle = vehicles.find((item) => item.id === group.vehicleId);

      return {
        vehicleId: group.vehicleId,
        plate: vehicle?.plate ?? 'N/A',
        label: vehicle ? `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}` : group.vehicleId,
        total: toNumber(group._sum.amount),
      };
    });
  },

  async getRecentExpenses(filters: DashboardFilters = {}, limit = 5) {
    const expenses = await prisma.expense.findMany({
      where: buildExpenseWhere(filters),
      include: {
        vehicle: {
          select: { plate: true, brand: true, model: true },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return expenses.map((expense) => ({
      id: expense.id,
      type: expense.type as ExpenseType,
      amount: toNumber(expense.amount),
      date: expense.date,
      description: expense.description,
      vehiclePlate: expense.vehicle.plate,
      vehicleLabel: `${expense.vehicle.plate} - ${expense.vehicle.brand} ${expense.vehicle.model}`,
    }));
  },
};
