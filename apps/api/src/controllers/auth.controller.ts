import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@fleet-manager/shared';
import { authService } from '../services/auth.service';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  cpf: z.string().min(11).max(18),
  phone: z.string().min(8).max(20),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
  requestedRole: z.nativeEnum(UserRole),
  addressStreet: z.string().min(1),
  addressNumber: z.string().min(1),
  addressDistrict: z.string().min(1),
  addressCity: z.string().min(1),
  addressState: z.string().min(2).max(2),
  addressZip: z.string().min(8).max(9),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
        return;
      }
      await authService.register(parsed.data);
      res.status(201).json({ message: 'Solicitação enviada. Aguarde aprovação.' });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid data' });
        return;
      }
      const result = await authService.login(parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
