import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { prisma } from '../config/database';

const JWKS = createRemoteJWKSet(
  new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`),
);

function getStringClaim(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildFallbackName(auth0Id: string) {
  return auth0Id.replace(/[|._-]+/g, ' ').trim() || 'User';
}

function buildFallbackEmail(auth0Id: string) {
  const normalized = auth0Id.replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `${normalized || 'user'}@auth0.local`.toLowerCase();
}

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

    let user = await prisma.user.findUnique({ where: { auth0Id: payload.sub } });

    if (!user) {
      const name =
        getStringClaim(payload.name) ??
        getStringClaim(payload.nickname) ??
        buildFallbackName(payload.sub);
      const email = getStringClaim(payload.email) ?? buildFallbackEmail(payload.sub);

      user = await prisma.user.create({
        data: {
          auth0Id: payload.sub,
          name,
          email,
          role: UserRole.OPERATOR,
        },
      });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
