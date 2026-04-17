import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
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
