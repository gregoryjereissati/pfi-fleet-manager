import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@fleet-manager/shared';
import { userService } from '../services/user.service';

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const userController = {
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }
      const user = await userService.updateRole(req.params.id, parsed.data.role);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
};
