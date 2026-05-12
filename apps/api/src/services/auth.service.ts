import bcrypt from 'bcryptjs';
import { UserStatus } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';
import { signJwt } from '../lib/verify-token';
import type { RegisterDto, LoginDto } from '@fleet-manager/shared';

export const authService = {
  async register(data: RegisterDto) {
    const emailExists = await userRepository.findByEmail(data.email);
    if (emailExists) throw new AppError(409, 'EMAIL_TAKEN');

    const cpfExists = await userRepository.findByCpf(data.cpf);
    if (cpfExists) throw new AppError(409, 'CPF_TAKEN');

    if (data.password !== data.confirmPassword) {
      throw new AppError(400, 'PASSWORD_MISMATCH');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return userRepository.createUser({
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      email: data.email,
      passwordHash,
      role: data.requestedRole,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressDistrict: data.addressDistrict,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZip: data.addressZip,
    });
  },

  async login(data: LoginDto) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS');

    if (user.status === UserStatus.PENDING) throw new AppError(403, 'PENDING_APPROVAL');
    if (user.status === UserStatus.BLOCKED) throw new AppError(403, 'BLOCKED');

    const token = await signJwt(user.id, user.role);
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },
};
