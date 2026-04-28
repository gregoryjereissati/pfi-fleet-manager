import { NextFunction, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  async getIndicators(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const indicators = await dashboardService.getIndicators();
      res.json(indicators);
    } catch (error) {
      next(error);
    }
  },
};
