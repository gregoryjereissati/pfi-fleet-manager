import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { VehicleStatus } from '@fleet-manager/shared';
import { vehicleService } from '../services/vehicle.service';

const vehicleQuerySchema = z.object({
  plate: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  yearMin: z.coerce.number().int().min(1900).max(2030).optional(),
  yearMax: z.coerce.number().int().min(1900).max(2030).optional(),
  orderBy: z.enum(['plate', 'brand', 'model', 'year', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const vehicleController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = vehicleQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const vehicles = await vehicleService.listVehicles(parsed.data);
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.getVehicle(req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.deleteVehicle(req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await vehicleService.hardDeleteVehicle(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async linkDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.linkDrivers(req.params.id, req.body.driverIds);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async unlinkDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.unlinkDriver(req.params.vehicleId, req.params.driverId);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },
};
