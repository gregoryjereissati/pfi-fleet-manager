import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';
import { driverRouter } from './driver.routes';
import { expenseRouter } from './expense.routes';
import { maintenanceRouter } from './maintenance.routes';
import { documentRouter } from './document.routes';
import { dashboardRouter } from './dashboard.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/vehicles', vehicleRouter);
router.use('/drivers', driverRouter);
router.use('/expenses', expenseRouter);
router.use('/maintenances', maintenanceRouter);
router.use('/documents', documentRouter);
router.use('/dashboard', dashboardRouter);
