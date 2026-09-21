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

/**
 * O veículo passa a ser corrigível: um lançamento feito no veículo errado
 * desloca custo de um para outro, e a correção precisa ser possível sem
 * excluir e relançar. O serviço reaplica ao destino as mesmas verificações
 * de empresa e de vínculo.
 */
const updateExpenseSchema = z
  .object({
    vehicleId: z.string().trim().min(1).optional(),
    type: z.nativeEnum(ExpenseType).optional(),
    amount: z.number().positive().optional(),
    date: z.coerce.date().optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

/** Cancelar exige motivo: o registro permanece, e o porquê fica junto dele. */
const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const expenseRouter = Router();

expenseRouter.use(authenticate);

const anyRole = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR);

expenseRouter.get('/', anyRole, expenseController.list);
expenseRouter.get('/:id', anyRole, expenseController.getById);
expenseRouter.get('/:id/history', anyRole, expenseController.history);
expenseRouter.post('/', anyRole, validate(createExpenseSchema), expenseController.create);
expenseRouter.put('/:id', anyRole, validate(updateExpenseSchema), expenseController.update);
expenseRouter.patch(
  '/:id/cancel',
  anyRole,
  validate(cancelSchema),
  expenseController.cancel,
);
expenseRouter.patch('/:id/uncancel', anyRole, expenseController.uncancel);

// A exclusão física permanece restrita e distinta do cancelamento: aqui o
// registro deixa de existir.
expenseRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  expenseController.delete,
);
