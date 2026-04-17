import { MaintenanceStatus } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import {
  maintenanceRepository,
  type CreateMaintenanceData,
  type MaintenanceFilters,
  type UpdateMaintenanceData,
} from '../repositories/maintenance.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';

export const maintenanceService = {
  async listMaintenances(filters: MaintenanceFilters) {
    return maintenanceRepository.findMany(filters);
  },

  async getMaintenance(id: string) {
    const maintenance = await maintenanceRepository.findById(id);
    if (!maintenance) throw new AppError(404, 'Maintenance not found');
    return maintenance;
  },

  async createMaintenance(data: CreateMaintenanceData) {
    const vehicle = await vehicleRepository.findById(data.vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    return maintenanceRepository.create(data);
  },

  async updateMaintenance(id: string, data: UpdateMaintenanceData) {
    const maintenance = await maintenanceRepository.findById(id);
    if (!maintenance) throw new AppError(404, 'Maintenance not found');

    const normalizedData: UpdateMaintenanceData = { ...data };

    if (data.status === MaintenanceStatus.DONE) {
      normalizedData.completedDate = data.completedDate ?? maintenance.completedDate ?? new Date();
    } else if (data.status && data.completedDate === undefined) {
      normalizedData.completedDate = null;
    }

    return maintenanceRepository.update(id, normalizedData);
  },

  async deleteMaintenance(id: string) {
    const maintenance = await maintenanceRepository.findById(id);
    if (!maintenance) throw new AppError(404, 'Maintenance not found');

    return maintenanceRepository.delete(id);
  },
};
