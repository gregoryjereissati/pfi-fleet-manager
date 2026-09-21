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

const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);

const anyRole = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR);

maintenanceRouter.get('/', anyRole, maintenanceController.list);
maintenanceRouter.get('/:id', anyRole, maintenanceController.getById);
maintenanceRouter.get('/:id/history', anyRole, maintenanceController.history);
maintenanceRouter.post(
  '/',
  anyRole,
  validate(createMaintenanceSchema),
  maintenanceController.create,
);
maintenanceRouter.put(
  '/:id',
  anyRole,
  validate(updateMaintenanceSchema),
  maintenanceController.update,
);
maintenanceRouter.patch(
  '/:id/cancel',
  anyRole,
  validate(cancelSchema),
  maintenanceController.cancel,
);
maintenanceRouter.patch('/:id/uncancel', anyRole, maintenanceController.uncancel);

maintenanceRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  maintenanceController.delete,
);
