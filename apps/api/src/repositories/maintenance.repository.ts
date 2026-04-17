import {
  MaintenanceStatus,
  MaintenanceType,
  type CreateMaintenanceDto,
  type UpdateMaintenanceDto,
} from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface MaintenanceFilters {
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  startDate?: Date;
  endDate?: Date;
  orderBy?: 'scheduledDate' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

export interface CreateMaintenanceData extends Omit<CreateMaintenanceDto, 'scheduledDate'> {
  scheduledDate: Date;
}

export interface UpdateMaintenanceData
  extends Omit<UpdateMaintenanceDto, 'scheduledDate' | 'completedDate'> {
  scheduledDate?: Date;
  completedDate?: Date | null;
}

const validOrderBy = new Set(['scheduledDate', 'createdAt', 'status']);

const maintenanceVehicleSelect = {
  id: true,
  plate: true,
  brand: true,
  model: true,
} as const;

export const maintenanceRepository = {
  findMany(filters: MaintenanceFilters = {}) {
    const {
      vehicleId,
      type,
      status,
      startDate,
      endDate,
      orderBy = 'scheduledDate',
      order = 'asc',
    } = filters;

    const safeOrderBy = validOrderBy.has(orderBy) ? orderBy : 'scheduledDate';

    return prisma.maintenance.findMany({
      where: {
        ...(vehicleId && { vehicleId }),
        ...(type && { type }),
        ...(status && { status }),
        ...((startDate || endDate) && {
          scheduledDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }),
      },
      include: {
        vehicle: {
          select: maintenanceVehicleSelect,
        },
      },
      orderBy: { [safeOrderBy]: order },
    });
  },

  findById(id: string) {
    return prisma.maintenance.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: maintenanceVehicleSelect,
        },
      },
    });
  },

  create(data: CreateMaintenanceData) {
    return prisma.maintenance.create({
      data,
      include: {
        vehicle: {
          select: maintenanceVehicleSelect,
        },
      },
    });
  },

  update(id: string, data: UpdateMaintenanceData) {
    return prisma.maintenance.update({
      where: { id },
      data,
      include: {
        vehicle: {
          select: maintenanceVehicleSelect,
        },
      },
    });
  },

  delete(id: string) {
    return prisma.maintenance.delete({
      where: { id },
      include: {
        vehicle: {
          select: maintenanceVehicleSelect,
        },
      },
    });
  },
};
