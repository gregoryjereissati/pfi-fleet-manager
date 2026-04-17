import { UserRole } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export const userRepository = {
  findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByAuth0Id(auth0Id: string) {
    return prisma.user.findUnique({ where: { auth0Id } });
  },

  updateRole(id: string, role: UserRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },
};
