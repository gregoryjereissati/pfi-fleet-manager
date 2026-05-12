import { UserRole, UserStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

interface CreateUserData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}

interface UpdateUserProfileData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  passwordHash?: string;
}

export const userRepository = {
  findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findByCpf(cpf: string) {
    return prisma.user.findUnique({ where: { cpf } });
  },

  createUser(data: CreateUserData) {
    return prisma.user.create({
      data: {
        ...data,
        status: UserStatus.PENDING,
      },
    });
  },

  updateRole(id: string, role: UserRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({ where: { id }, data: { status } });
  },

  updateProfile(id: string, data: UpdateUserProfileData) {
    return prisma.user.update({ where: { id }, data });
  },

  deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
