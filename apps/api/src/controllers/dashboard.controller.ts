import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ExpenseType } from '@fleet-manager/shared';
import { dashboardService } from '../services/dashboard.service';

const dashboardQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(ExpenseType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const dashboardController = {
  async getIndicators(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = dashboardQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const indicators = await dashboardService.getIndicators(parsed.data);
      res.json(indicators);
    } catch (error) {
      next(error);
    }
  },
};
