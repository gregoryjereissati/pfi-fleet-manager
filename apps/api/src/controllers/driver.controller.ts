import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DriverStatus } from '@fleet-manager/shared';
import { driverService } from '../services/driver.service';
import { assignmentService } from '../services/assignment.service';
import { getScope } from '../lib/request-scope';
import { toAssignmentDto, toDriverDto } from '../lib/driver-dto';

const driverQuerySchema = z.object({
  search: z.string().optional(),
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

      const drivers = await driverService.listDrivers(getScope(req), parsed.data);
      res.json(drivers.map(toDriverDto));
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignments, ...driver } = await driverService.getDriver(
        getScope(req),
        req.params.id,
      );
      res.json({ ...toDriverDto(driver), assignments: assignments.map(toAssignmentDto) });
    } catch (err) {
      next(err);
    }
  },

  /** Histórico de vínculos do motorista, com períodos. */
  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await assignmentService.listByDriver(
        getScope(req),
        req.params.id,
      );
      res.json(assignments.map(toAssignmentDto));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Cria a ficha operacional de alguém que já tem conta na empresa.
   * Não há cadastro de pessoa a partir do zero: a identidade vem do usuário.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.createDriverForUser(
        getScope(req),
        req.body.userId,
        req.body.phone,
      );
      res.status(201).json(toDriverDto(driver));
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.updateDriver(
        getScope(req),
        req.params.id,
        req.body,
      );
      res.json(toDriverDto(driver));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.deleteDriver(getScope(req), req.params.id);
      res.json(toDriverDto(driver));
    } catch (err) {
      next(err);
    }
  },

  async deletePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counts = await driverService.previewHardDelete(getScope(req), req.params.id);
      res.json(counts);
    } catch (err) {
      next(err);
    }
  },

  async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await driverService.hardDeleteDriver(getScope(req), req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
