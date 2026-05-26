import { Router } from 'express';
import { z } from 'zod';
import { DriverStatus, UserRole } from '@fleet-manager/shared';
import { driverController } from '../controllers/driver.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createDriverSchema = z.object({
  name: z.string().trim().min(1),
  cpf: z.string().trim().regex(/^\d{11}$/),
  cnh: z.string().trim().min(1),
  cnhExpiry: z.coerce.date(),
  phone: z.string().trim().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
});

const updateDriverSchema = createDriverSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const driverRouter = Router();

driverRouter.use(authenticate);

driverRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  driverController.list,
);
driverRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  driverController.getById,
);
driverRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(createDriverSchema),
  driverController.create,
);
driverRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateDriverSchema),
  driverController.update,
);
driverRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  driverController.delete,
);
driverRouter.delete(
  '/:id/permanent',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  driverController.permanentDelete,
);
