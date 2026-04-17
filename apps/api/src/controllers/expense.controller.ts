import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ExpenseType } from '@fleet-manager/shared';
import { expenseService } from '../services/expense.service';

const expenseQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(ExpenseType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  orderBy: z.enum(['date', 'amount', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const expenseController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = expenseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const expenses = await expenseService.listExpenses(parsed.data);
      res.json(expenses);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.getExpense(req.params.id);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.createExpense(req.body);
      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.updateExpense(req.params.id, req.body);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.deleteExpense(req.params.id);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },
};
