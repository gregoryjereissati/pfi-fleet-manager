import { AppError } from '../middlewares/error-handler';
import { expenseRepository, type ExpenseFilters, type CreateExpenseData, type UpdateExpenseData } from '../repositories/expense.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';

export const expenseService = {
  async listExpenses(filters: ExpenseFilters) {
    return expenseRepository.findMany(filters);
  },

  async getExpense(id: string) {
    const expense = await expenseRepository.findById(id);
    if (!expense) throw new AppError(404, 'Expense not found');
    return expense;
  },

  async createExpense(data: CreateExpenseData) {
    const vehicle = await vehicleRepository.findById(data.vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return expenseRepository.create(data);
  },

  async updateExpense(id: string, data: UpdateExpenseData) {
    const expense = await expenseRepository.findById(id);
    if (!expense) throw new AppError(404, 'Expense not found');

    return expenseRepository.update(id, data);
  },

  async deleteExpense(id: string) {
    const expense = await expenseRepository.findById(id);
    if (!expense) throw new AppError(404, 'Expense not found');

    return expenseRepository.delete(id);
  },
};
