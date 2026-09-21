import { MaintenanceType, MaintenanceStatus } from '../enums';

export interface MaintenanceDto {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  createdById: string | null;
  updatedById: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceDto {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
}

export interface UpdateMaintenanceDto {
  status?: MaintenanceStatus;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
}
