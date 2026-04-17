import { Router } from 'express';
import { z } from 'zod';
import { MaintenanceStatus, MaintenanceType, UserRole } from '@fleet-manager/shared';
import { maintenanceController } from '../controllers/maintenance.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createMaintenanceSchema = z.object({
  vehicleId: z.string().trim().min(1),
  type: z.nativeEnum(MaintenanceType),
  description: z.string().trim().min(1),
  scheduledDate: z.coerce.date(),
});

const updateMaintenanceSchema = z
  .object({
    status: z.nativeEnum(MaintenanceStatus).optional(),
    description: z.string().trim().min(1).optional(),
    scheduledDate: z.coerce.date().optional(),
    completedDate: z.union([z.coerce.date(), z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);

maintenanceRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  maintenanceController.list,
);
maintenanceRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  maintenanceController.getById,
);
maintenanceRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  validate(createMaintenanceSchema),
  maintenanceController.create,
);
maintenanceRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  validate(updateMaintenanceSchema),
  maintenanceController.update,
);
maintenanceRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  maintenanceController.delete,
);
