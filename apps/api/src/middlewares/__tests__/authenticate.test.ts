import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../lib/verify-token', () => ({
  verifySupabaseToken: vi.fn(),
}));

vi.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../config/env', () => ({
  env: { SUPABASE_URL: 'https://projeto.supabase.co' },
}));

import { verifySupabaseToken } from '../../lib/verify-token';
import { prisma } from '../../config/database';
import { authenticate, requireSupabaseSession } from '../authenticate';

const authUser = { authUserId: 'auth-uuid-1', email: 'test@test.com' };

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  cpf: '00000000000',
  phone: '(85) 99999-0000',
  authUserId: 'auth-uuid-1',
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

  it('retorna 401 quando o header Authorization está ausente', async () => {
    const res = makeRes();

    await authenticate(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token do Supabase é inválido', async () => {
    vi.mocked(verifySupabaseToken).mockRejectedValue(new Error('invalid'));
    const res = makeRes();

    await authenticate(makeReq('Bearer bad-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('retorna 404 PROFILE_NOT_FOUND quando a conta ainda não tem perfil', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'PROFILE_NOT_FOUND' });
  });

  it('busca o perfil pelo identificador do Supabase Auth', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    await authenticate(makeReq('Bearer valid-token'), makeRes(), vi.fn());

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { authUserId: 'auth-uuid-1' },
    });
  });

  it('retorna 403 PENDING_APPROVAL quando o perfil aguarda aprovação', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      status: 'PENDING' as const,
    });
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'PENDING_APPROVAL' });
  });

  it('retorna 403 BLOCKED mesmo com token válido e não expirado', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      status: 'BLOCKED' as const,
    });
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'BLOCKED' });
  });

  it('define req.user e req.authUser quando o perfil está ativo', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const req = makeReq('Bearer valid-token');
    const nextFn = vi.fn();

    await authenticate(req, makeRes(), nextFn);

    expect(req.user).toEqual(mockUser);
    expect(req.authUser).toEqual(authUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });
});

describe('requireSupabaseSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 401 quando o header Authorization está ausente', async () => {
    const res = makeRes();

    await requireSupabaseSession(makeReq(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('libera a requisição sem exigir perfil na aplicação', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    const req = makeReq('Bearer valid-token');
    const nextFn = vi.fn();

    await requireSupabaseSession(req, makeRes(), nextFn);

    expect(req.authUser).toEqual(authUser);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(nextFn).toHaveBeenCalledOnce();
  });
});
