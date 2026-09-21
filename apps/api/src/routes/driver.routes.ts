import { Router } from 'express';
import { z } from 'zod';
import { dataCivil } from '../lib/validators';
import { DriverStatus, UserRole } from '@fleet-manager/shared';
import { driverController } from '../controllers/driver.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

/**
 * A ficha nasce de um usuário da empresa: nome, CPF e identidade continuam no
 * cadastro da pessoa e não são redigitados aqui.
 */
const createDriverSchema = z.object({
  userId: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

/** Só dados operacionais. A identidade é editada no perfil do usuário. */
const updateDriverSchema = z
  .object({
    cnh: z.string().trim().min(1).nullable().optional(),
    cnhExpiry: dataCivil.nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    status: z.nativeEnum(DriverStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const driverRouter = Router();

driverRouter.use(authenticate);

const anyRole = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR);
const fleetManager = authorize(UserRole.ADMIN, UserRole.MANAGER);

// O motorista alcança a própria ficha; gerente e administrador, a equipe.
driverRouter.get('/', anyRole, driverController.list);
driverRouter.get('/:id', anyRole, driverController.getById);
driverRouter.get('/:id/vehicles', anyRole, driverController.listVehicles);

driverRouter.post('/', fleetManager, validate(createDriverSchema), driverController.create);
driverRouter.put('/:id', fleetManager, validate(updateDriverSchema), driverController.update);
driverRouter.delete('/:id', fleetManager, driverController.delete);

driverRouter.get('/:id/delete-preview', authorize(UserRole.ADMIN), driverController.deletePreview);
driverRouter.delete('/:id/permanent', authorize(UserRole.ADMIN), driverController.permanentDelete);
