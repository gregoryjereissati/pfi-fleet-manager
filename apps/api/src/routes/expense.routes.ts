import { Router } from 'express';
import { z } from 'zod';
import { ExpenseType, UserRole } from '@fleet-manager/shared';
import { expenseController } from '../controllers/expense.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createExpenseSchema = z.object({
  vehicleId: z.string().trim().min(1),
  type: z.nativeEnum(ExpenseType),
  amount: z.number().positive(),
  date: z.coerce.date(),
  description: z.string().trim().optional(),
});

const updateExpenseSchema = z
  .object({
    type: z.nativeEnum(ExpenseType).optional(),
    amount: z.number().positive().optional(),
    date: z.coerce.date().optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const expenseRouter = Router();

expenseRouter.use(authenticate);

expenseRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  expenseController.list,
);
expenseRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  expenseController.getById,
);
expenseRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  validate(createExpenseSchema),
  expenseController.create,
);
expenseRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  validate(updateExpenseSchema),
  expenseController.update,
);
expenseRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  expenseController.delete,
);
