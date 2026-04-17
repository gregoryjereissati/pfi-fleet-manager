import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared';
import { maintenanceService } from '../services/maintenance.service';

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

      const maintenances = await maintenanceService.listMaintenances(parsed.data);
      res.json(maintenances);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.getMaintenance(req.params.id);
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.createMaintenance(req.body);
      res.status(201).json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.updateMaintenance(req.params.id, req.body);
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenance = await maintenanceService.deleteMaintenance(req.params.id);
      res.json(maintenance);
    } catch (err) {
      next(err);
    }
  },
};
