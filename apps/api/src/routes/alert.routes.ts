import { Router } from 'express';
import { UserRole } from '@fleet-manager/shared';
import { alertController } from '../controllers/alert.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

export const alertRouter = Router();

alertRouter.use(authenticate);

/**
 * Os três papéis consultam a central. O que cada um enxerga é decidido pelo
 * serviço, com o mesmo recorte das telas de documentos, manutenções e
 * motoristas.
 */
const anyRole = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR);

alertRouter.get('/', anyRole, alertController.list);
alertRouter.get('/count', anyRole, alertController.count);
