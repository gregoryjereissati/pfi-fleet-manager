import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DriverStatus } from '@fleet-manager/shared';
import { driverService } from '../services/driver.service';

const driverQuerySchema = z.object({
  name: z.string().optional(),
  cpf: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
});

export const driverController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = driverQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const drivers = await driverService.listDrivers(parsed.data);
      res.json(drivers);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.getDriver(req.params.id);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.createDriver(req.body);
      res.status(201).json(driver);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.updateDriver(req.params.id, req.body);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.deleteDriver(req.params.id);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },

  async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await driverService.hardDeleteDriver(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
