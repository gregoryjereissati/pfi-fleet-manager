import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared';
import { maintenanceService } from '../services/maintenance.service';
import { getScope } from '../lib/request-scope';

const maintenanceQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(MaintenanceType).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  orderBy: z.enum(['scheduledDate', 'createdAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const maintenanceController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = maintenanceQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const maintenances = await maintenanceService.listMaintenances(
        getScope(req),
        parsed.data,
      );
      res.json(maintenances);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.getMaintenance(
        getScope(req),
        req.params.id,
      );
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async history(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await maintenanceService.getMaintenanceHistory(
        getScope(req),
        req.params.id,
      );
      res.json(history);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.createMaintenance(
        getScope(req),
        req.body,
      );
      res.status(201).json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.updateMaintenance(
        getScope(req),
        req.params.id,
        req.body,
      );
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.cancelMaintenance(
        getScope(req),
        req.params.id,
        req.body.reason,
      );
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async uncancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.uncancelMaintenance(
        getScope(req),
        req.params.id,
      );
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.deleteMaintenance(
        getScope(req),
        req.params.id,
      );
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },
};
