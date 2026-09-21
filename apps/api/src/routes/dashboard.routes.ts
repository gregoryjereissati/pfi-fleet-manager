import { Router } from 'express';
import { UserRole } from '@fleet-manager/shared';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

/**
 * Os três papéis consultam o painel, e a autorização passa a ser declarada em
 * vez de resultar de omissão. O recorte dos números é do serviço: empresa para
 * todos, e também autoria para o motorista.
 */
dashboardRouter.get(
  '/indicators',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  dashboardController.getIndicators,
);
