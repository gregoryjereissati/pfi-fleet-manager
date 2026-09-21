import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { EntryStatus } from '../types/db';
import { ExpenseType } from '@fleet-manager/shared';
import { expenseService } from '../services/expense.service';
import { getScope } from '../lib/request-scope';

const expenseQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(ExpenseType).optional(),
  status: z.nativeEnum(EntryStatus).optional(),
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

      const expenses = await expenseService.listExpenses(getScope(req), parsed.data);
      res.json(expenses);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.getExpense(getScope(req), req.params.id);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async history(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await expenseService.getExpenseHistory(getScope(req), req.params.id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.createExpense(getScope(req), req.body);
      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.updateExpense(
        getScope(req),
        req.params.id,
        req.body,
      );
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.cancelExpense(
        getScope(req),
        req.params.id,
        req.body.reason,
      );
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async uncancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.uncancelExpense(getScope(req), req.params.id);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.deleteExpense(getScope(req), req.params.id);
      res.json(expense);
    } catch (err) {
      next(err);
    }
  },
};
