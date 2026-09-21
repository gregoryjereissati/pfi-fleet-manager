import type { User } from './db';
import type { SupabaseAuthUser } from '../lib/verify-token';
import type { AccessScope } from '../lib/access-scope';

declare global {
  namespace Express {
    interface Request {
      /** Perfil do usuário na aplicação. Presente após `authenticate`. */
      user?: User;
      /** Conta de acesso no Supabase Auth. Presente após `requireSupabaseSession`. */
      authUser?: SupabaseAuthUser;
      /**
       * Recorte de acesso — empresa, papel e autoria — derivado do perfil
       * consultado no banco. Presente após `authenticate`.
       *
       * É a única fonte de `companyId` aceita pela aplicação: um identificador
       * de empresa vindo do cliente nunca é usado para decidir acesso.
       */
      scope?: AccessScope;
    }
  }
}

export {};
