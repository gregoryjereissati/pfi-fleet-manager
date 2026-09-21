import type { Request } from 'express';
import { AppError } from '../middlewares/error-handler';
import type { AccessScope } from './access-scope';

/**
 * Recorte de acesso da requisição.
 *
 * `authenticate` sempre o define; esta função existe para que os controllers
 * não precisem afirmar isso com `!` e para que uma rota protegida por engano
 * sem o middleware falhe de forma explícita, em vez de consultar sem recorte.
 */
export function getScope(req: Request): AccessScope {
  if (!req.scope) throw new AppError(401, 'Unauthenticated');
  return req.scope;
}
