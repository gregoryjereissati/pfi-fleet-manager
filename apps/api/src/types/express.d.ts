import { User } from '@prisma/client';
import type { SupabaseAuthUser } from '../lib/verify-token';

declare global {
  namespace Express {
    interface Request {
      /** Perfil do usuário na aplicação. Presente após `authenticate`. */
      user?: User;
      /** Conta de acesso no Supabase Auth. Presente após `requireSupabaseSession`. */
      authUser?: SupabaseAuthUser;
    }
  }
}

export {};
