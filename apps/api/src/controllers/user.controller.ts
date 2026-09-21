import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { userService } from '../services/user.service';
import { companyRepository } from '../repositories/company.repository';
import { toCurrentUserDto, toUserDto } from '../lib/user-dto';
import { getScope } from '../lib/request-scope';
import { AppError } from '../middlewares/error-handler';

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  role: z.nativeEnum(UserRole).optional(),
});

const listUsersQuerySchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const userController = {
  /**
   * O próprio perfil.
   *
   * Não passa por `getScope` de propósito: o super administrador precisa se
   * identificar **antes** de escolher uma empresa, e nesse momento não existe
   * recorte. A empresa informada é a que ele escolheu, quando houver, ou a do
   * perfil, para todos os demais.
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Unauthenticated');

      const user = await userService.getOwnProfile(req.user.id);
      const companyId = req.scope?.companyId ?? req.user.companyId;
      const company = companyId ? await companyRepository.findById(companyId) : null;

      res.json(toCurrentUserDto(user, company));
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listUsersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }

      const users = await userService.listUsers(getScope(req), parsed.data);
      res.json(users.map(toUserDto));
    } catch (err) {
      next(err);
    }
  },

  async updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scope = getScope(req);
      const user = await userService.updateCurrentUser(scope.userId, req.body);
      const company = await companyRepository.findById(scope.companyId);
      res.json(toCurrentUserDto(user, company));
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

      const user = await userService.updateRole(getScope(req), req.params.id, parsed.data.role);
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
        getScope(req),
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
      await userService.deleteUser(getScope(req), req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
