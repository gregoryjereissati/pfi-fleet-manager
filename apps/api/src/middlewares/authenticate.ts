import { Request, Response, NextFunction } from 'express';
import { UserStatus } from '@prisma/client';
import { verifySupabaseToken } from '../lib/verify-token';
import { prisma } from '../config/database';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Exige um token válido do Supabase Auth, mas **não** exige que o usuário já
 * possua perfil na aplicação.
 *
 * É usado no cadastro: entre criar a conta no Supabase e criar o perfil no
 * Fleet Manager existe um intervalo em que a pessoa está autenticada mas
 * ainda não tem registro em `User`.
 */
export async function requireSupabaseSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  try {
    req.authUser = await verifySupabaseToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Exige token válido do Supabase Auth **e** perfil ativo na aplicação.
 *
 * O perfil é reconsultado no banco a cada requisição, de modo que bloqueios e
 * alterações de papel tenham efeito imediato, sem depender da expiração do
 * token emitido pelo Supabase.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  let authUser;

  try {
    authUser = await verifySupabaseToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { authUserId: authUser.authUserId } });

  if (!user) {
    // Conta de acesso válida, porém sem perfil no Fleet Manager. O frontend
    // interpreta este código redirecionando para a conclusão do cadastro.
    res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
    return;
  }

  if (user.status === UserStatus.PENDING) {
    res.status(403).json({ error: 'PENDING_APPROVAL' });
    return;
  }

  if (user.status === UserStatus.BLOCKED) {
    res.status(403).json({ error: 'BLOCKED' });
    return;
  }

  req.user = user;
  req.authUser = authUser;
  next();
}
