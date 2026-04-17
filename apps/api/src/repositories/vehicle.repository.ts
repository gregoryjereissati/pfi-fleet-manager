import { VehicleStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface VehicleFilters {
  plate?: string;
  brand?: string;
  model?: string;
  status?: VehicleStatus;
  yearMin?: number;
  yearMax?: number;
  orderBy?: 'plate' | 'brand' | 'model' | 'year' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateVehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  status?: VehicleStatus;
}

export interface UpdateVehicleData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: VehicleStatus;
}

const validOrderBy = new Set(['plate', 'brand', 'model', 'year', 'createdAt']);

export const vehicleRepository = {
  findMany(filters: VehicleFilters = {}) {
    const {
      plate,
      brand,
      model,
      status,
      yearMin,
      yearMax,
      orderBy = 'createdAt',
      order = 'desc',
    } = filters;

    const safeOrderBy = validOrderBy.has(orderBy) ? orderBy : 'createdAt';

    return prisma.vehicle.findMany({
      where: {
        ...(plate && {
          OR: [
            { plate: { contains: plate, mode: 'insensitive' } },
            { brand: { contains: plate, mode: 'insensitive' } },
            { model: { contains: plate, mode: 'insensitive' } },
          ],
        }),
        ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
        ...(model && { model: { contains: model, mode: 'insensitive' } }),
        ...(status && { status }),
        ...((yearMin || yearMax) && {
          year: {
            ...(yearMin ? { gte: yearMin } : {}),
            ...(yearMax ? { lte: yearMax } : {}),
          },
        }),
      },
      orderBy: { [safeOrderBy]: order },
    });
  },

  findById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
      include: {
        drivers: true,
        expenses: { orderBy: { date: 'desc' }, take: 5 },
        maintenances: { orderBy: { scheduledDate: 'desc' }, take: 5 },
      },
    });
  },

  findByPlate(plate: string) {
    return prisma.vehicle.findUnique({ where: { plate } });
  },

  create(data: CreateVehicleData) {
    return prisma.vehicle.create({
      data: {
        ...data,
        color: data.color ?? '',
      },
    });
  },

  update(id: string, data: UpdateVehicleData) {
    return prisma.vehicle.update({ where: { id }, data });
  },

  setInactive(id: string) {
    return prisma.vehicle.update({
      where: { id },
      data: { status: VehicleStatus.INACTIVE },
    });
  },

  connectDrivers(vehicleId: string, driverIds: string[]) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        drivers: {
          connect: driverIds.map((id) => ({ id })),
        },
      },
      include: {
        drivers: true,
        expenses: { orderBy: { date: 'desc' }, take: 5 },
        maintenances: { orderBy: { scheduledDate: 'desc' }, take: 5 },
      },
    });
  },

  disconnectDriver(vehicleId: string, driverId: string) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        drivers: {
          disconnect: { id: driverId },
        },
      },
      include: {
        drivers: true,
        expenses: { orderBy: { date: 'desc' }, take: 5 },
        maintenances: { orderBy: { scheduledDate: 'desc' }, take: 5 },
      },
    });
  },
};
