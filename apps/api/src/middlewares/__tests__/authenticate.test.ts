import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../lib/verify-token', () => ({
  verifyJwt: vi.fn(),
}));

vi.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../config/env', () => ({
  env: { JWT_SECRET: 'test-secret-32-characters-long!!!' },
}));

import { verifyJwt } from '../../lib/verify-token';
import { prisma } from '../../config/database';
import { authenticate } from '../authenticate';

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  cpf: '000.000.000-00',
  phone: '(85) 99999-0000',
  passwordHash: 'hash',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  addressStreet: 'Rua A',
  addressNumber: '1',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
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
    vi.mocked(verifyJwt).mockRejectedValue(new Error('invalid'));
    const req = makeReq('Bearer bad-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('retorna 404 quando usuário não existe no banco', async () => {
    vi.mocked(verifyJwt).mockResolvedValue('user-missing');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('retorna 403 PENDING_APPROVAL quando usuário está pendente', async () => {
    vi.mocked(verifyJwt).mockResolvedValue('user-1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      status: 'PENDING' as const,
    });
    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'PENDING_APPROVAL' });
  });

  it('chama next e define req.user quando token é válido e usuário está ativo', async () => {
    vi.mocked(verifyJwt).mockResolvedValue('user-1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const req = makeReq('Bearer valid-token') as Request & { user?: typeof mockUser };
    const res = makeRes();
    const nextFn = vi.fn();

    await authenticate(req, res, nextFn);

    expect(req.user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });
});
