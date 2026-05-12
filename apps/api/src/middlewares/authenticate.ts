import { Request, Response, NextFunction } from 'express';
import { UserStatus } from '@prisma/client';
import { verifyJwt } from '../lib/verify-token';
import { prisma } from '../config/database';

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
    const userId = await verifyJwt(token);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
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
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
