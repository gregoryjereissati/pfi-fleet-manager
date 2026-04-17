import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { prisma } from '../config/database';

const JWKS = createRemoteJWKSet(
  new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`),
);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: env.AUTH0_AUDIENCE,
      issuer: `https://${env.AUTH0_DOMAIN}/`,
    });

    if (!payload.sub) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { auth0Id: payload.sub } });

    if (!user) {
      res.status(401).json({ error: 'User not registered' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
