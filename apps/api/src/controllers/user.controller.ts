import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { userService } from '../services/user.service';
import { toCurrentUserDto, toUserDto } from '../lib/user-dto';

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  role: z.nativeEnum(UserRole).optional(),
});

export const userController = {
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    res.json(toCurrentUserDto(req.user!));
  },

  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.json(users.map(toUserDto));
    } catch (err) {
      next(err);
    }
  },

  async updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateCurrentUser(req.user!.id, req.body);
      res.json(toCurrentUserDto(user));
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
      res.json(toUserDto(user));
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      const user = await userService.updateStatus(
        req.params.id,
        parsed.data.status,
        parsed.data.role,
      );
      res.json(toUserDto(user));
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
