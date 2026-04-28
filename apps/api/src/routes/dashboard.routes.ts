import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/indicators', dashboardController.getIndicators);
