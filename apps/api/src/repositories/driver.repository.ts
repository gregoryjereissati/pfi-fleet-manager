import { DriverStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface DriverFilters {
  name?: string;
  cpf?: string;
  status?: DriverStatus;
}

export interface CreateDriverData {
  name: string;
  cpf: string;
  cnh: string;
  cnhExpiry: Date;
  phone?: string;
  status?: DriverStatus;
}

export interface UpdateDriverData {
  name?: string;
  cpf?: string;
  cnh?: string;
  cnhExpiry?: Date;
  phone?: string;
  status?: DriverStatus;
}

export const driverRepository = {
  findMany(filters: DriverFilters = {}) {
    const { name, cpf, status } = filters;

    return prisma.driver.findMany({
      where: {
        ...(name && {
          OR: [
            { name: { contains: name, mode: 'insensitive' } },
            { cpf: { contains: name } },
          ],
        }),
        ...(cpf && { cpf: { contains: cpf } }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.driver.findUnique({
      where: { id },
      include: {
        vehicles: true,
      },
    });
  },

  findByCpf(cpf: string) {
    return prisma.driver.findUnique({ where: { cpf } });
  },

  findByCnh(cnh: string) {
    return prisma.driver.findUnique({ where: { cnh } });
  },

  findManyByIds(ids: string[]) {
    return prisma.driver.findMany({
      where: {
        id: { in: ids },
      },
    });
  },

  create(data: CreateDriverData) {
    return prisma.driver.create({ data });
  },

  update(id: string, data: UpdateDriverData) {
    return prisma.driver.update({ where: { id }, data });
  },

  setInactive(id: string) {
    return prisma.driver.update({
      where: { id },
      data: { status: DriverStatus.INACTIVE },
    });
  },
};
