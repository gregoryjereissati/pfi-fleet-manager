import { UserRole, UserStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

interface CreateUserData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  authUserId: string;
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

  findByAuthUserId(authUserId: string) {
    return prisma.user.findUnique({ where: { authUserId } });
  },

  /**
   * Vincula um perfil já existente a uma conta do Supabase Auth.
   * Usado quando o perfil foi criado previamente (por exemplo, pelo seed) e
   * a conta de acesso correspondente é criada depois.
   */
  linkAuthUser(id: string, authUserId: string) {
    return prisma.user.update({ where: { id }, data: { authUserId } });
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
