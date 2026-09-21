import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@fleet-manager/shared';

/**
 * Autorização por papel.
 *
 * Decide sobre o papel **efetivo** — o do recorte de acesso — e não sobre o
 * papel gravado no perfil. Os dois coincidem para quase todo mundo; diferem
 * para o super administrador da plataforma, cujo recorte nasce como ADMIN da
 * empresa que ele escolheu operar. Olhar o recorte faz esse caso funcionar sem
 * exceção alguma espalhada pelas rotas.
 *
 * Exigir o recorte aqui também torna explícito o estado em que o super
 * administrador está autenticado mas ainda não escolheu empresa: em vez de uma
 * falha genérica mais adiante, a resposta diz o que falta.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    if (!req.scope) {
      res.status(403).json({ error: 'COMPANY_NOT_SELECTED' });
      return;
    }

    if (!roles.includes(req.scope.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Restringe a rota ao super administrador da plataforma.
 *
 * Usada nas rotas que existem **fora** de qualquer empresa — listar e criar
 * empresas, ativá-las e desativá-las. Não exige recorte: são exatamente as
 * rotas que ele precisa alcançar antes de escolher onde entrar.
 */
export function authorizePlatform() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    if (!req.user.isSuperAdmin) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
