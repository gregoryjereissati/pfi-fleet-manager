import { AuditAction, AuditEntity } from '../types/db';
import { UserRole, VehicleStatus } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import {
  vehicleRepository,
  type CreateVehicleData,
  type UpdateVehicleData,
  type VehicleFilters,
} from '../repositories/vehicle.repository';
import { assignmentRepository } from '../repositories/assignment.repository';
import { assignmentService } from './assignment.service';
import { diffFields, pickFields, recordChange } from '../lib/audit';
import { isDriverScope, type AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['plate', 'brand', 'model', 'year', 'color', 'status'] as const;

export const vehicleService = {
  /**
   * Lista os veículos ao alcance de quem consulta.
   *
   * O motorista enxerga os veículos a que está vinculado — não a frota
   * inteira. É a mesma lista que alimenta os seletores dos formulários.
   */
  async listVehicles(scope: AccessScope, filters: VehicleFilters = {}) {
    const allowed = await assignmentService.authorizedVehicleIds(scope);

    return vehicleRepository.findMany(scope.companyId, {
      ...filters,
      ...(allowed !== null && { vehicleIds: allowed }),
    });
  },

  async getVehicle(scope: AccessScope, id: string) {
    if (isDriverScope(scope)) {
      // Fora do vínculo, o veículo responde como inexistente: o motorista não
      // descobre a frota da empresa pedindo identificadores.
      await assignmentService.assertVehicleAllowed(scope, id).catch(() => {
        throw new AppError(404, 'Vehicle not found');
      });
    }

    const vehicle = await vehicleRepository.findById(id, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return vehicle;
  },

  async createVehicle(scope: AccessScope, data: CreateVehicleData) {
    const existingPlate = await vehicleRepository.findByPlate(scope.companyId, data.plate);
    if (existingPlate) throw new AppError(409, 'Plate already in use');

    return emTransacao(async (tx) => {
      const vehicle = await vehicleRepository.create(tx, scope.companyId, data);

      await recordChange(tx, {
        entityType: AuditEntity.VEHICLE,
        entityId: vehicle.id,
        action: AuditAction.CREATE,
        scope,
        changes: { plate: { de: null, para: vehicle.plate } },
      });

      return vehicle;
    });
  },

  async updateVehicle(scope: AccessScope, id: string, data: UpdateVehicleData) {
    const vehicle = await vehicleRepository.findSummaryById(id, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    if (data.plate && data.plate !== vehicle.plate) {
      const existingPlate = await vehicleRepository.findByPlate(scope.companyId, data.plate);
      if (existingPlate && existingPlate.id !== id) {
        throw new AppError(409, 'Plate already in use');
      }
    }

    const payload = pickFields<UpdateVehicleData>(data, AUDITED_FIELDS);
    const current = await vehicleRepository.findById(id, scope.companyId);
    const changes = diffFields(
      current as unknown as Record<string, unknown>,
      payload,
      AUDITED_FIELDS,
    );

    return emTransacao(async (tx) => {
      const updated = await vehicleRepository.update(tx, id, payload);

      if (changes) {
        await recordChange(tx, {
          entityType: AuditEntity.VEHICLE,
          entityId: id,
          action: AuditAction.UPDATE,
          scope,
          changes,
        });
      }

      return updated;
    });
  },

  /**
   * Inativa o veículo e encerra os vínculos vigentes.
   *
   * O histórico financeiro permanece intacto e continua somando nos períodos
   * em que ocorreu: inativar descreve o presente, não reescreve o passado.
   */
  async deleteVehicle(scope: AccessScope, id: string) {
    const vehicle = await vehicleRepository.findSummaryById(id, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return emTransacao(async (tx) => {
      const active = await assignmentRepository.activeIdsByVehicle(tx, scope.companyId, id);

      const endDate = new Date();

      for (const assignment of active) {
        await assignmentRepository.end(tx, assignment.id, endDate, scope.userId);
        await recordChange(tx, {
          entityType: AuditEntity.ASSIGNMENT,
          entityId: assignment.id,
          action: AuditAction.UNLINK,
          scope,
          reason: 'Veículo inativado',
        });
      }

      const updated = await vehicleRepository.setInactive(tx, id);

      await recordChange(tx, {
        entityType: AuditEntity.VEHICLE,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes: { status: { de: vehicle.status, para: VehicleStatus.INACTIVE } },
      });

      return updated;
    });
  },

  /**
   * Exclusão permanente: administrador da empresa, veículo já inativo.
   *
   * Cancelar e excluir não são a mesma coisa. Esta ação apaga em cascata
   * despesas, manutenções, documentos e vínculos — e não tem volta.
   */
  async hardDeleteVehicle(scope: AccessScope, id: string) {
    if (scope.role !== UserRole.ADMIN) throw new AppError(403, 'Insufficient permissions');

    const vehicle = await vehicleRepository.findSummaryById(id, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    if (vehicle.status !== VehicleStatus.INACTIVE) {
      throw new AppError(409, 'VEHICLE_MUST_BE_INACTIVE');
    }

    const dependents = await vehicleRepository.countDependents(id, scope.companyId);

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.VEHICLE,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: {
          placa: { de: vehicle.plate, para: null },
          despesas: { de: dependents.expenses, para: 0 },
          manutencoes: { de: dependents.maintenances, para: 0 },
          documentos: { de: dependents.documents, para: 0 },
          vinculos: { de: dependents.assignments, para: 0 },
        },
      });

      return vehicleRepository.hardDelete(tx, id);
    });
  },

  /** Contagem do que a exclusão permanente levaria junto, antes de confirmar. */
  async previewHardDelete(scope: AccessScope, id: string) {
    const vehicle = await vehicleRepository.findSummaryById(id, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.countDependents(id, scope.companyId);
  },
};
