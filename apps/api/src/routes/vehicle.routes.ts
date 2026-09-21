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
  /** Início do vínculo. Ausente, vale a partir de agora. */
  startDate: z.coerce.date().optional(),
});

const unlinkDriverSchema = z
  .object({
    /** Fim do vínculo. Ausente, encerra agora. */
    endDate: z.coerce.date().optional(),
  })
  .optional();

export const vehicleRouter = Router();

vehicleRouter.use(authenticate);

const anyRole = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR);
const fleetManager = authorize(UserRole.ADMIN, UserRole.MANAGER);

// A listagem devolve a frota da empresa para gerente e administrador, e
// apenas os veículos vinculados para o motorista — o recorte é do serviço.
vehicleRouter.get('/', anyRole, vehicleController.list);
vehicleRouter.get('/:id', anyRole, vehicleController.getById);
vehicleRouter.get('/:id/drivers', anyRole, vehicleController.listDrivers);

vehicleRouter.post('/', fleetManager, validate(createVehicleSchema), vehicleController.create);
vehicleRouter.put('/:id', fleetManager, validate(updateVehicleSchema), vehicleController.update);
vehicleRouter.delete('/:id', fleetManager, vehicleController.delete);

// A exclusão permanente apaga em cascata o histórico financeiro do veículo.
// Fica com o administrador da empresa, que primeiro consulta o que será
// apagado; o serviço ainda exige que o veículo esteja inativo.
vehicleRouter.get('/:id/delete-preview', authorize(UserRole.ADMIN), vehicleController.deletePreview);
vehicleRouter.delete('/:id/permanent', authorize(UserRole.ADMIN), vehicleController.permanentDelete);

// Vínculos: o gerente atribui e encerra.
vehicleRouter.post(
  '/:id/drivers',
  fleetManager,
  validate(linkDriversSchema),
  vehicleController.linkDrivers,
);
vehicleRouter.delete(
  '/:vehicleId/drivers/:driverId',
  fleetManager,
  validate(unlinkDriverSchema),
  vehicleController.unlinkDriver,
);
