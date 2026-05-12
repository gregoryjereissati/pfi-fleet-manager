import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@fleet-manager/shared';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

export const userRouter = Router();

const optionalPasswordSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(6).optional(),
);

const updateCurrentUserSchema = z.object({
  name: z.string().trim().min(1),
  cpf: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email(),
  addressStreet: z.string().trim().min(1),
  addressNumber: z.string().trim().min(1),
  addressDistrict: z.string().trim().min(1),
  addressCity: z.string().trim().min(1),
  addressState: z.string().trim().min(2).max(2),
  addressZip: z.string().trim().min(1),
  password: optionalPasswordSchema,
  confirmPassword: optionalPasswordSchema,
});

userRouter.use(authenticate);
userRouter.get('/me', userController.getCurrentUser);
userRouter.put('/me', validate(updateCurrentUserSchema), userController.updateCurrentUser);
userRouter.get('/', authorize(UserRole.ADMIN), userController.listUsers);
userRouter.patch('/:id/role', authorize(UserRole.ADMIN), userController.updateRole);
userRouter.patch('/:id/status', authorize(UserRole.ADMIN), userController.updateStatus);
userRouter.delete('/:id', authorize(UserRole.ADMIN), userController.deleteUser);
