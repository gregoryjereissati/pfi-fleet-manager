import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';

export const userService = {
  async listUsers() {
    return userRepository.findAll();
  },

  async getCurrentUser(auth0Id: string) {
    const user = await userRepository.findByAuth0Id(auth0Id);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async updateRole(id: string, role: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    return userRepository.updateRole(id, role);
  },
};
