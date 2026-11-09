import { NextFunction, Request, Response } from 'express';
import { alertService } from '../services/alert.service';
import { getScope } from '../lib/request-scope';

export const alertController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await alertService.list(getScope(req)));
    } catch (error) {
      next(error);
    }
  },

  async count(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await alertService.count(getScope(req)));
    } catch (error) {
      next(error);
    }
  },
};
