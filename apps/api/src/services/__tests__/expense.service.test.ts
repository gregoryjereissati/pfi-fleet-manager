import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, VehicleStatus } from '@prisma/client';
import { ExpenseType } from '@fleet-manager/shared';
import { expenseService } from '../expense.service';
import { expenseRepository } from '../../repositories/expense.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/expense.repository', () => ({
  expenseRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findById: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'vehicle-1',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
};

const mockExpense = {
  id: 'expense-1',
  vehicleId: 'vehicle-1',
  type: ExpenseType.FUEL,
  amount: new Prisma.Decimal(150.75),
  date: new Date('2026-04-10T00:00:00.000Z'),
  description: 'Abastecimento',
  createdAt: new Date('2026-04-10T10:00:00.000Z'),
  vehicle: mockVehicle,
};

describe('expenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listExpenses', () => {
    it('returns the expense list with filters', async () => {
      vi.mocked(expenseRepository.findMany).mockResolvedValue([mockExpense]);

      const result = await expenseService.listExpenses({
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
      });

      expect(result).toEqual([mockExpense]);
      expect(expenseRepository.findMany).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
      });
    });
  });

  describe('getExpense', () => {
    it('throws AppError 404 when expense does not exist', async () => {
      vi.mocked(expenseRepository.findById).mockResolvedValue(null);

      await expect(expenseService.getExpense('missing')).rejects.toThrow(
        new AppError(404, 'Expense not found'),
      );
    });

    it('returns the expense when found', async () => {
      vi.mocked(expenseRepository.findById).mockResolvedValue(mockExpense);

      const result = await expenseService.getExpense('expense-1');

      expect(result).toEqual(mockExpense);
      expect(expenseRepository.findById).toHaveBeenCalledWith('expense-1');
    });
  });

  describe('createExpense', () => {
    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(
        expenseService.createExpense({
          vehicleId: 'vehicle-1',
          type: ExpenseType.FUEL,
          amount: 150.75,
          date: new Date('2026-04-10T00:00:00.000Z'),
          description: 'Abastecimento',
        }),
      ).rejects.toThrow(new AppError(404, 'Vehicle not found'));

      expect(expenseRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the expense', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue({
        ...mockVehicle,
        year: 2022,
        color: 'Prata',
        status: VehicleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        drivers: [],
        expenses: [],
        maintenances: [],
      });
      vi.mocked(expenseRepository.create).mockResolvedValue(mockExpense);

      const result = await expenseService.createExpense({
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        amount: 150.75,
        date: new Date('2026-04-10T00:00:00.000Z'),
        description: 'Abastecimento',
      });

      expect(result).toEqual(mockExpense);
      expect(expenseRepository.create).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        type: ExpenseType.FUEL,
        amount: 150.75,
        date: new Date('2026-04-10T00:00:00.000Z'),
        description: 'Abastecimento',
      });
    });
  });

  describe('updateExpense', () => {
    it('throws AppError 404 when expense does not exist', async () => {
      vi.mocked(expenseRepository.findById).mockResolvedValue(null);

      await expect(
        expenseService.updateExpense('missing', { description: 'Atualizada' }),
      ).rejects.toThrow(new AppError(404, 'Expense not found'));
    });

    it('updates and returns the expense', async () => {
      const updatedExpense = { ...mockExpense, description: 'Atualizada' };
      vi.mocked(expenseRepository.findById).mockResolvedValue(mockExpense);
      vi.mocked(expenseRepository.update).mockResolvedValue(updatedExpense);

      const result = await expenseService.updateExpense('expense-1', {
        description: 'Atualizada',
      });

      expect(result).toEqual(updatedExpense);
      expect(expenseRepository.update).toHaveBeenCalledWith('expense-1', {
        description: 'Atualizada',
      });
    });
  });

  describe('deleteExpense', () => {
    it('throws AppError 404 when expense does not exist', async () => {
      vi.mocked(expenseRepository.findById).mockResolvedValue(null);

      await expect(expenseService.deleteExpense('missing')).rejects.toThrow(
        new AppError(404, 'Expense not found'),
      );
    });

    it('deletes the expense', async () => {
      vi.mocked(expenseRepository.findById).mockResolvedValue(mockExpense);
      vi.mocked(expenseRepository.delete).mockResolvedValue(mockExpense);

      const result = await expenseService.deleteExpense('expense-1');

      expect(result).toEqual(mockExpense);
      expect(expenseRepository.delete).toHaveBeenCalledWith('expense-1');
    });
  });
});
