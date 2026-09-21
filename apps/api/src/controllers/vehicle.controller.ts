import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { VehicleStatus } from '@fleet-manager/shared';
import { vehicleService } from '../services/vehicle.service';
import { assignmentService } from '../services/assignment.service';
import { getScope } from '../lib/request-scope';
import { toAssignmentDto, toDriverSummaryDto } from '../lib/driver-dto';

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

      const vehicles = await vehicleService.listVehicles(getScope(req), parsed.data);
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignments, ...vehicle } = await vehicleService.getVehicle(
        getScope(req),
        req.params.id,
      );

      res.json({
        ...vehicle,
        // Motoristas vigentes, já resolvidos, e o vínculo que os sustenta.
        drivers: assignments.map((assignment) => ({
          ...toDriverSummaryDto(assignment.driver),
          assignmentId: assignment.id,
          // Já vem como texto ISO: este vínculo é montado em `json_build_object`
          // dentro da consulta do veículo, não é uma coluna de nível superior.
          assignmentStart: assignment.startDate,
          assignmentStartEstimated: assignment.startEstimated,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.createVehicle(getScope(req), req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.updateVehicle(
        getScope(req),
        req.params.id,
        req.body,
      );
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.deleteVehicle(getScope(req), req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  /** O que a exclusão permanente apagaria, em números, antes de confirmar. */
  async deletePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counts = await vehicleService.previewHardDelete(getScope(req), req.params.id);
      res.json(counts);
    } catch (err) {
      next(err);
    }
  },

  async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await vehicleService.hardDeleteVehicle(getScope(req), req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  /** Histórico de vínculos do veículo: vigentes e encerrados. */
  async listDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await assignmentService.listByVehicle(
        getScope(req),
        req.params.id,
      );
      res.json(assignments.map(toAssignmentDto));
    } catch (err) {
      next(err);
    }
  },

  async linkDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await assignmentService.assignDrivers(
        getScope(req),
        req.params.id,
        req.body.driverIds,
        req.body.startDate,
      );
      res.json(assignments.map(toAssignmentDto));
    } catch (err) {
      next(err);
    }
  },

  async unlinkDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await assignmentService.endAssignment(
        getScope(req),
        req.params.vehicleId,
        req.params.driverId,
        req.body?.endDate ? new Date(req.body.endDate) : undefined,
      );
      res.json(assignments.map(toAssignmentDto));
    } catch (err) {
      next(err);
    }
  },
};
