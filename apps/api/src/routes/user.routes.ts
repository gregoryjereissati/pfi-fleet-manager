import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { UserRole } from '@fleet-manager/shared';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/', authorize(UserRole.ADMIN), userController.listUsers);
userRouter.patch('/:id/role', authorize(UserRole.ADMIN), userController.updateRole);
