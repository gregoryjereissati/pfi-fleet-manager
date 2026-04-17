import {
  ExpenseType,
  type CreateExpenseDto,
  type UpdateExpenseDto,
} from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface ExpenseFilters {
  vehicleId?: string;
  type?: ExpenseType;
  startDate?: Date;
  endDate?: Date;
  orderBy?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateExpenseData extends Omit<CreateExpenseDto, 'date'> {
  date: Date;
}

export interface UpdateExpenseData extends Omit<UpdateExpenseDto, 'date'> {
  date?: Date;
}

const validOrderBy = new Set(['date', 'amount', 'createdAt']);

const expenseVehicleSelect = {
  id: true,
  plate: true,
  brand: true,
  model: true,
} as const;

export const expenseRepository = {
  findMany(filters: ExpenseFilters = {}) {
    const {
      vehicleId,
      type,
      startDate,
      endDate,
      orderBy = 'date',
      order = 'desc',
    } = filters;

    const safeOrderBy = validOrderBy.has(orderBy) ? orderBy : 'date';

    return prisma.expense.findMany({
      where: {
        ...(vehicleId && { vehicleId }),
        ...(type && { type }),
        ...((startDate || endDate) && {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }),
      },
      include: {
        vehicle: {
          select: expenseVehicleSelect,
        },
      },
      orderBy: { [safeOrderBy]: order },
    });
  },

  findById(id: string) {
    return prisma.expense.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: expenseVehicleSelect,
        },
      },
    });
  },

  create(data: CreateExpenseData) {
    return prisma.expense.create({
      data,
      include: {
        vehicle: {
          select: expenseVehicleSelect,
        },
      },
    });
  },

  update(id: string, data: UpdateExpenseData) {
    return prisma.expense.update({
      where: { id },
      data,
      include: {
        vehicle: {
          select: expenseVehicleSelect,
        },
      },
    });
  },

  delete(id: string) {
    return prisma.expense.delete({
      where: { id },
      include: {
        vehicle: {
          select: expenseVehicleSelect,
        },
      },
    });
  },
};
