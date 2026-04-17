import { Router } from 'express';
import { z } from 'zod';
import { UserRole, VehicleStatus } from '@fleet-manager/shared';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createVehicleSchema = z.object({
  plate: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.number().int().min(1900).max(2030),
  color: z.string().trim().optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

const updateVehicleSchema = createVehicleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const linkDriversSchema = z.object({
  driverIds: z.array(z.string().trim().min(1)).min(1),
});

export const vehicleRouter = Router();

vehicleRouter.use(authenticate);

vehicleRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  vehicleController.list,
);
vehicleRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  vehicleController.getById,
);
vehicleRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(createVehicleSchema),
  vehicleController.create,
);
vehicleRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateVehicleSchema),
  vehicleController.update,
);
vehicleRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  vehicleController.delete,
);
vehicleRouter.post(
  '/:id/drivers',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(linkDriversSchema),
  vehicleController.linkDrivers,
);
vehicleRouter.delete(
  '/:vehicleId/drivers/:driverId',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  vehicleController.unlinkDriver,
);
