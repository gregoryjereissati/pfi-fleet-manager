import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

vi.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://api.test.com',
  },
}));

import { jwtVerify } from 'jose';
import { prisma } from '../../config/database';
import { authenticate } from '../authenticate';

const mockUser = {
  id: 'user-1',
  auth0Id: 'auth0|123',
  name: 'Test User',
  email: 'test@test.com',
  role: 'ADMIN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authenticate', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('retorna 401 quando header Authorization está ausente', async () => {
    const req = makeReq();
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando token é inválido', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid'));
    const req = makeReq('Bearer bad-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('cadastra automaticamente um novo usuário como OPERATOR no primeiro acesso', async () => {
    const createdUser = {
      ...mockUser,
      id: 'user-2',
      auth0Id: 'auth0|unknown',
      name: 'New User',
      email: 'new-user@test.com',
      role: 'OPERATOR' as const,
    };

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: 'auth0|unknown',
        name: 'New User',
        email: 'new-user@test.com',
      },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);
    const req = makeReq('Bearer valid-token') as Request & { user?: typeof createdUser };
    const res = makeRes();
    const nextFn = vi.fn();

    await authenticate(req, res, nextFn);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        auth0Id: 'auth0|unknown',
        name: 'New User',
        email: 'new-user@test.com',
        role: 'OPERATOR',
      },
    });
    expect(req.user).toEqual(createdUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('usa valores de fallback quando o token não traz nome e email', async () => {
    const createdUser = {
      ...mockUser,
      id: 'user-3',
      auth0Id: 'auth0|unknown',
      name: 'auth0 unknown',
      email: 'auth0.unknown@auth0.local',
      role: 'OPERATOR' as const,
    };

    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|unknown' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);
    const req = makeReq('Bearer valid-token') as Request & { user?: typeof createdUser };
    const res = makeRes();
    const nextFn = vi.fn();

    await authenticate(req, res, nextFn);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        auth0Id: 'auth0|unknown',
        name: 'auth0 unknown',
        email: 'auth0.unknown@auth0.local',
        role: 'OPERATOR',
      },
    });
    expect(req.user).toEqual(createdUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('chama next e define req.user quando token é válido', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|123' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const req = makeReq('Bearer valid-token') as Request & { user?: typeof mockUser };
    const res = makeRes();
    const nextFn = vi.fn();

    await authenticate(req, res, nextFn);

    expect(req.user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });
});
