import bcrypt from 'bcryptjs';
import { UserRole, UserStatus, type UpdateCurrentUserDto } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';

const PROTECTED_EMAIL = 'admin@fleet-manager.com';

export const userService = {
  async listUsers() {
    return userRepository.findAll();
  },

  async updateRole(id: string, role: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');
    return userRepository.updateRole(id, role);
  },

  async updateStatus(id: string, status: UserStatus, role?: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');
    if (role) await userRepository.updateRole(id, role);
    return userRepository.updateStatus(id, status);
  },

  async updateCurrentUser(id: string, data: UpdateCurrentUserDto) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');

    const emailOwner = await userRepository.findByEmail(data.email);
    if (emailOwner && emailOwner.id !== id) throw new AppError(409, 'EMAIL_TAKEN');

    const cpfOwner = await userRepository.findByCpf(data.cpf);
    if (cpfOwner && cpfOwner.id !== id) throw new AppError(409, 'CPF_TAKEN');

    if ((data.password || data.confirmPassword) && data.password !== data.confirmPassword) {
      throw new AppError(400, 'PASSWORD_MISMATCH');
    }

    const payload = {
      name: data.name.trim(),
      cpf: data.cpf.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      addressStreet: data.addressStreet.trim(),
      addressNumber: data.addressNumber.trim(),
      addressDistrict: data.addressDistrict.trim(),
      addressCity: data.addressCity.trim(),
      addressState: data.addressState.trim().toUpperCase(),
      addressZip: data.addressZip.trim(),
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    };

    return userRepository.updateProfile(id, payload);
  },

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    if (user.email === PROTECTED_EMAIL) throw new AppError(403, 'PROTECTED_ACCOUNT');
    return userRepository.deleteUser(id);
  },
};
