import { Router } from 'express';
import { z } from 'zod';
import { DocumentType, UserRole } from '@fleet-manager/shared';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createDocumentSchema = z
  .object({
    vehicleId: z.string().trim().min(1).optional(),
    driverId: z.string().trim().min(1).optional(),
    type: z.nativeEnum(DocumentType),
    expiryDate: z.coerce.date(),
    fileUrl: z.string().trim().url().optional(),
  })
  .refine((data) => Boolean(data.vehicleId) !== Boolean(data.driverId), {
    message: 'Provide either vehicleId or driverId',
  });

const updateDocumentSchema = z
  .object({
    type: z.nativeEnum(DocumentType).optional(),
    expiryDate: z.coerce.date().optional(),
    fileUrl: z.string().trim().url().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.list,
);
documentRouter.get(
  '/alerts/count',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.getAlertCount,
);
documentRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.getById,
);
documentRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(createDocumentSchema),
  documentController.create,
);
documentRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateDocumentSchema),
  documentController.update,
);
documentRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  documentController.delete,
);
