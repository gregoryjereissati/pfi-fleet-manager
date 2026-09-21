import { AuditAction, AuditEntity } from '../types/db';
import { MaintenanceStatus, MaintenanceType, UserRole } from '@fleet-manager/shared';
import { emTransacao } from '../config/database';
import { AppError } from '../middlewares/error-handler';
import {
  maintenanceRepository,
  type MaintenanceFilters,
  type UpdateMaintenanceData,
} from '../repositories/maintenance.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { assignmentService } from './assignment.service';
import { diffFields, listChanges, pickFields, recordChange } from '../lib/audit';
import { authorFilter, type AccessScope } from '../lib/access-scope';

const AUDITED_FIELDS = ['status', 'description', 'scheduledDate', 'completedDate'] as const;

export type MaintenanceQuery = Omit<MaintenanceFilters, 'companyId' | 'createdById'>;

export interface CreateMaintenanceInput {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: Date;
}

export const maintenanceService = {
  async listMaintenances(scope: AccessScope, filters: MaintenanceQuery = {}) {
    return maintenanceRepository.findMany({
      ...filters,
      companyId: scope.companyId,
      createdById: authorFilter(scope),
    });
  },

  async getMaintenance(scope: AccessScope, id: string) {
    const maintenance = await maintenanceRepository.findById(
      id,
      scope.companyId,
      authorFilter(scope),
    );

    if (!maintenance) throw new AppError(404, 'Maintenance not found');
    return maintenance;
  },

  async getMaintenanceHistory(scope: AccessScope, id: string) {
    await this.getMaintenance(scope, id);
    return listChanges(scope.companyId, AuditEntity.MAINTENANCE, id);
  },

  /**
   * Registra uma manutenção.
   *
   * O motorista pode registrar preventiva ou corretiva dos veículos a que está
   * vinculado — inclusive situações encontradas na estrada. O formulário
   * continua com os mesmos quatro campos.
   */
  async createMaintenance(scope: AccessScope, data: CreateMaintenanceInput) {
    const vehicle = await vehicleRepository.findSummaryById(data.vehicleId, scope.companyId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    await assignmentService.assertVehicleAllowed(scope, data.vehicleId);

    return emTransacao(async (tx) => {
      const maintenance = await maintenanceRepository.create(tx, {
        ...data,
        companyId: scope.companyId,
        createdById: scope.userId,
      });

      await recordChange(tx, {
        entityType: AuditEntity.MAINTENANCE,
        entityId: maintenance.id,
        action: AuditAction.CREATE,
        scope,
        changes: {
          vehicleId: { de: null, para: data.vehicleId },
          scheduledDate: { de: null, para: data.scheduledDate.toISOString() },
        },
      });

      return maintenance;
    });
  },

  async updateMaintenance(scope: AccessScope, id: string, data: UpdateMaintenanceData) {
    const maintenance = await maintenanceRepository.findById(
      id,
      scope.companyId,
      authorFilter(scope),
    );

    if (!maintenance) throw new AppError(404, 'Maintenance not found');

    if (maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new AppError(409, 'MAINTENANCE_CANCELLED');
    }

    // O cancelamento tem rota própria, porque exige motivo.
    if (data.status === MaintenanceStatus.CANCELLED) {
      throw new AppError(400, 'USE_CANCEL_ENDPOINT');
    }

    const normalizedData = pickFields<UpdateMaintenanceData>(data, AUDITED_FIELDS);

    if (data.status === MaintenanceStatus.DONE) {
      normalizedData.completedDate = data.completedDate ?? maintenance.completedDate ?? new Date();
    } else if (data.status && data.completedDate === undefined) {
      normalizedData.completedDate = null;
    }

    const changes = diffFields(
      maintenance as unknown as Record<string, unknown>,
      normalizedData,
      AUDITED_FIELDS,
    );

    if (!changes) return maintenance;

    return emTransacao(async (tx) => {
      const updated = await maintenanceRepository.update(tx, id, normalizedData, scope.userId);

      await recordChange(tx, {
        entityType: AuditEntity.MAINTENANCE,
        entityId: id,
        action: AuditAction.UPDATE,
        scope,
        changes,
      });

      return updated;
    });
  },

  async cancelMaintenance(scope: AccessScope, id: string, reason: string) {
    const maintenance = await maintenanceRepository.findById(
      id,
      scope.companyId,
      authorFilter(scope),
    );

    if (!maintenance) throw new AppError(404, 'Maintenance not found');
    if (maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new AppError(409, 'ALREADY_CANCELLED');
    }

    return emTransacao(async (tx) => {
      const cancelled = await maintenanceRepository.cancel(tx, id, scope.userId, reason);

      await recordChange(tx, {
        entityType: AuditEntity.MAINTENANCE,
        entityId: id,
        action: AuditAction.CANCEL,
        scope,
        reason,
        changes: { status: { de: maintenance.status, para: MaintenanceStatus.CANCELLED } },
      });

      return cancelled;
    });
  },

  async uncancelMaintenance(scope: AccessScope, id: string) {
    const maintenance = await maintenanceRepository.findById(
      id,
      scope.companyId,
      authorFilter(scope),
    );

    if (!maintenance) throw new AppError(404, 'Maintenance not found');
    if (maintenance.status !== MaintenanceStatus.CANCELLED) {
      throw new AppError(409, 'NOT_CANCELLED');
    }

    return emTransacao(async (tx) => {
      const restored = await maintenanceRepository.uncancel(tx, id, scope.userId);

      await recordChange(tx, {
        entityType: AuditEntity.MAINTENANCE,
        entityId: id,
        action: AuditAction.UNCANCEL,
        scope,
        changes: {
          status: { de: MaintenanceStatus.CANCELLED, para: MaintenanceStatus.SCHEDULED },
        },
      });

      return restored;
    });
  },

  async deleteMaintenance(scope: AccessScope, id: string) {
    if (scope.role === UserRole.OPERATOR) throw new AppError(403, 'Insufficient permissions');

    const maintenance = await maintenanceRepository.findById(id, scope.companyId);
    if (!maintenance) throw new AppError(404, 'Maintenance not found');

    return emTransacao(async (tx) => {
      await recordChange(tx, {
        entityType: AuditEntity.MAINTENANCE,
        entityId: id,
        action: AuditAction.DELETE,
        scope,
        changes: {
          description: { de: maintenance.description, para: null },
          scheduledDate: { de: maintenance.scheduledDate.toISOString(), para: null },
        },
      });

      return maintenanceRepository.delete(tx, id);
    });
  },
};
