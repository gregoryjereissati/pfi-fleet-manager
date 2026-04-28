import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByAuth0Id: vi.fn(),
    updateRole: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  auth0Id: 'auth0|1',
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

  describe('getCurrentUser', () => {
    it('lança AppError 404 quando usuário autenticado não existe', async () => {
      vi.mocked(userRepository.findByAuth0Id).mockResolvedValue(null);

      await expect(userService.getCurrentUser('auth0|missing')).rejects.toThrow(
        new AppError(404, 'User not found'),
      );
    });

    it('retorna o usuário autenticado quando encontrado', async () => {
      vi.mocked(userRepository.findByAuth0Id).mockResolvedValue(mockUser);

      const result = await userService.getCurrentUser('auth0|1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByAuth0Id).toHaveBeenCalledWith('auth0|1');
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
});
