import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new-hash'),
  },
}));

import bcrypt from 'bcryptjs';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    updateProfile: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  cpf: '000.000.000-00',
  phone: '(85) 99999-0000',
  passwordHash: 'hash',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  addressStreet: 'Rua A',
  addressNumber: '1',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('userService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listUsers', () => {
    it('retorna a lista de usuários', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([mockUser]);

      const result = await userService.listUsers();

      expect(result).toEqual([mockUser]);
      expect(userRepository.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('updateRole', () => {
    it('lança AppError 404 quando usuário não existe', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.updateRole('inexistente', UserRole.MANAGER)).rejects.toThrow(
        new AppError(404, 'User not found'),
      );
      expect(userRepository.updateRole).not.toHaveBeenCalled();
    });

    it('atualiza e retorna o usuário com o novo role', async () => {
      const updated = { ...mockUser, role: UserRole.MANAGER };
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.updateRole).mockResolvedValue(updated);

      const result = await userService.updateRole('user-1', UserRole.MANAGER);

      expect(result).toEqual(updated);
      expect(userRepository.updateRole).toHaveBeenCalledWith('user-1', UserRole.MANAGER);
    });
  });

  describe('updateStatus', () => {
    it('atualiza status sem alterar role quando role não é informado', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.updateStatus).mockResolvedValue({
        ...mockUser,
        status: UserStatus.BLOCKED,
      });

      await userService.updateStatus('user-1', UserStatus.BLOCKED);

      expect(userRepository.updateRole).not.toHaveBeenCalled();
      expect(userRepository.updateStatus).toHaveBeenCalledWith('user-1', UserStatus.BLOCKED);
    });

    it('atualiza role e status quando role é informado', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING,
      });
      vi.mocked(userRepository.updateRole).mockResolvedValue(mockUser);
      vi.mocked(userRepository.updateStatus).mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
        role: UserRole.MANAGER,
      });

      await userService.updateStatus('user-1', UserStatus.ACTIVE, UserRole.MANAGER);

      expect(userRepository.updateRole).toHaveBeenCalledWith('user-1', UserRole.MANAGER);
      expect(userRepository.updateStatus).toHaveBeenCalledWith('user-1', UserStatus.ACTIVE);
    });
  });

  describe('updateCurrentUser', () => {
    const profilePayload = {
      name: 'Admin Atualizado',
      cpf: '111.111.111-11',
      phone: '(85) 98888-0000',
      email: 'admin-updated@test.com',
      addressStreet: 'Rua B',
      addressNumber: '22',
      addressDistrict: 'Aldeota',
      addressCity: 'Fortaleza',
      addressState: 'ce',
      addressZip: '60110-000',
    };

    it('lança AppError 404 quando usuário não existe', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.updateCurrentUser('inexistente', profilePayload)).rejects.toThrow(
        new AppError(404, 'User not found'),
      );
      expect(userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('lança 409 EMAIL_TAKEN quando outro usuário já usa o e-mail', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        ...mockUser,
        id: 'user-2',
        email: profilePayload.email,
      });

      await expect(userService.updateCurrentUser('user-1', profilePayload)).rejects.toThrow(
        new AppError(409, 'EMAIL_TAKEN'),
      );
      expect(userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('lança 409 CPF_TAKEN quando outro usuário já usa o CPF', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.findByCpf).mockResolvedValue({
        ...mockUser,
        id: 'user-2',
        cpf: profilePayload.cpf,
      });

      await expect(userService.updateCurrentUser('user-1', profilePayload)).rejects.toThrow(
        new AppError(409, 'CPF_TAKEN'),
      );
      expect(userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('lança 400 PASSWORD_MISMATCH quando senha e confirmação não conferem', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.findByCpf).mockResolvedValue(null);

      await expect(
        userService.updateCurrentUser('user-1', {
          ...profilePayload,
          password: 'nova-senha',
          confirmPassword: 'outra-senha',
        }),
      ).rejects.toThrow(new AppError(400, 'PASSWORD_MISMATCH'));
      expect(userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('atualiza o próprio perfil sem trocar a senha quando password não é informado', async () => {
      const updatedUser = {
        ...mockUser,
        ...profilePayload,
        addressState: 'CE',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(userRepository.updateProfile).mockResolvedValue(updatedUser);

      const result = await userService.updateCurrentUser('user-1', profilePayload);

      expect(userRepository.updateProfile).toHaveBeenCalledWith('user-1', {
        ...profilePayload,
        addressState: 'CE',
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });

    it('atualiza o próprio perfil e troca a senha quando informado', async () => {
      const updatedUser = {
        ...mockUser,
        ...profilePayload,
        addressState: 'CE',
        passwordHash: 'new-hash',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(userRepository.updateProfile).mockResolvedValue(updatedUser);

      const result = await userService.updateCurrentUser('user-1', {
        ...profilePayload,
        password: 'nova-senha',
        confirmPassword: 'nova-senha',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('nova-senha', 10);
      expect(userRepository.updateProfile).toHaveBeenCalledWith('user-1', {
        ...profilePayload,
        addressState: 'CE',
        passwordHash: 'new-hash',
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
