import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus } from '@fleet-manager/shared';
import { authService } from '../services/auth.service';
import { toCurrentUserDto } from '../lib/user-dto';

const registerProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  cpf: z.string().trim().min(11).max(18),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email(),
  requestedRole: z.nativeEnum(UserRole).default(UserRole.OPERATOR),
  addressStreet: z.string().trim().min(1),
  addressNumber: z.string().trim().min(1),
  addressDistrict: z.string().trim().min(1),
  addressCity: z.string().trim().min(1),
  addressState: z.string().trim().min(2).max(2),
  addressZip: z.string().trim().min(8).max(9),
});

export const authController = {
  /**
   * Cria o perfil da aplicação para uma conta já autenticada no Supabase Auth.
   * A rota exige um token válido, mas não exige perfil preexistente.
   */
  async registerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.authUser) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

      const parsed = registerProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
        return;
      }

      const user = await authService.registerProfile(req.authUser, parsed.data);

      // O perfil pode ter sido criado como PENDING ou vinculado a um perfil
      // preexistente já aprovado. A mensagem reflete o caso ocorrido.
      const message =
        user.status === UserStatus.ACTIVE
          ? 'Cadastro concluído. Seu acesso já está liberado.'
          : 'Cadastro recebido. Aguarde a aprovação de um administrador.';

      res.status(201).json({ message, user: toCurrentUserDto(user) });
    } catch (err) {
      next(err);
    }
  },
};
