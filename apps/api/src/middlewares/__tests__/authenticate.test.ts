import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../lib/verify-token', () => ({
  verifySupabaseToken: vi.fn(),
}));

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findForAuthentication: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  env: { SUPABASE_URL: 'https://projeto.supabase.co' },
}));

vi.mock('../../repositories/company.repository', () => ({
  companyRepository: { findById: vi.fn() },
}));

import { verifySupabaseToken } from '../../lib/verify-token';
import { userRepository } from '../../repositories/user.repository';
import { companyRepository } from '../../repositories/company.repository';
import { authenticate, requireSupabaseSession } from '../authenticate';

const authUser = { authUserId: 'auth-uuid-1', email: 'test@test.com' };

const empresaAtiva = { id: 'company-a', status: 'ACTIVE' as const };

const mockUser = {
  id: 'user-1',
  companyId: 'company-a',
  name: 'Test User',
  email: 'test@test.com',
  cpf: '00000000000',
  phone: '(85) 99999-0000',
  authUserId: 'auth-uuid-1',
  role: 'ADMIN' as const,
  requestedRole: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  addressStreet: 'Rua A',
  addressNumber: '1',
  addressDistrict: 'Centro',
  addressCity: 'Fortaleza',
  addressState: 'CE',
  addressZip: '60000-000',
  createdAt: new Date(),
  updatedAt: new Date(),
  isSuperAdmin: false,
  company: empresaAtiva,
  driverProfile: null,
};

/** Perfil como o repositório o entrega, com empresa e ficha resolvidas. */
function perfil(overrides: Record<string, unknown> = {}) {
  return { ...mockUser, ...overrides } as never;
}

function makeReq(authHeader?: string, empresaEscolhida?: string): Request {
  const headers: Record<string, string | undefined> = { authorization: authHeader };
  if (empresaEscolhida) headers['x-company-id'] = empresaEscolhida;

  return {
    headers,
    header: (nome: string) => headers[nome.toLowerCase()],
  } as unknown as Request;
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
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(null);
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'PROFILE_NOT_FOUND' });
  });

  it('busca o perfil pelo identificador do Supabase Auth', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil());

    await authenticate(makeReq('Bearer valid-token'), makeRes(), vi.fn());

    expect(userRepository.findForAuthentication).toHaveBeenCalledWith('auth-uuid-1');
  });

  it('retorna 403 PENDING_APPROVAL quando o perfil aguarda aprovação', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil({ status: 'PENDING' }));
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'PENDING_APPROVAL' });
  });

  it('retorna 403 REJECTED quando a solicitação foi recusada', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(
      perfil({ status: 'REJECTED' }),
    );
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'REJECTED' });
  });

  it('retorna 403 BLOCKED mesmo com token válido e não expirado', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil({ status: 'BLOCKED' }));
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'BLOCKED' });
  });

  it('retorna 403 NO_COMPANY quando o perfil não pertence a empresa alguma', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(
      perfil({ companyId: null as never, company: null as never }),
    );
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'NO_COMPANY' });
  });

  it('retorna 403 COMPANY_INACTIVE quando a empresa está inativa', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(
      perfil({ company: { id: 'company-a', status: 'INACTIVE' } as never }),
    );
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'COMPANY_INACTIVE' });
  });

  it('define req.user e req.authUser quando o perfil está ativo', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil());
    const req = makeReq('Bearer valid-token');
    const nextFn = vi.fn();

    await authenticate(req, makeRes(), nextFn);

    expect(req.user).toMatchObject({ id: 'user-1', email: 'test@test.com' });
    expect(req.authUser).toEqual(authUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('monta o recorte de acesso a partir do perfil consultado, não do token', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(
      perfil({ role: 'OPERATOR' as never, driverProfile: { id: 'driver-9' } as never }),
    );
    const req = makeReq('Bearer valid-token');

    await authenticate(req, makeRes(), vi.fn());

    expect(req.scope).toEqual({
      userId: 'user-1',
      userName: 'Test User',
      companyId: 'company-a',
      role: 'OPERATOR',
      driverId: 'driver-9',
      isSuperAdmin: false,
    });
  });

  it('não expõe a empresa nem a ficha dentro de req.user', async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil());
    const req = makeReq('Bearer valid-token');

    await authenticate(req, makeRes(), vi.fn());

    expect(req.user).not.toHaveProperty('company');
    expect(req.user).not.toHaveProperty('driverProfile');
  });
});

describe('authenticate — super administrador da plataforma', () => {
  const superAdmin = () =>
    perfil({ isSuperAdmin: true, companyId: null as never, company: null as never });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySupabaseToken).mockResolvedValue(authUser);
  });

  it('autentica sem empresa e segue sem recorte, para alcançar as rotas de plataforma', async () => {
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(superAdmin());
    const req = makeReq('Bearer valid-token');
    const nextFn = vi.fn();

    await authenticate(req, makeRes(), nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ isSuperAdmin: true });
    // Sem recorte: `authorize` recusa o que for operacional com
    // COMPANY_NOT_SELECTED, e só as rotas de plataforma seguem alcançáveis.
    expect(req.scope).toBeUndefined();
  });

  it('com empresa escolhida, age como ADMIN dela', async () => {
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(superAdmin());
    vi.mocked(companyRepository.findById).mockResolvedValue({
      id: 'company-b',
      status: 'ACTIVE',
    } as never);

    const req = makeReq('Bearer valid-token', 'company-b');

    await authenticate(req, makeRes(), vi.fn());

    expect(req.scope).toEqual({
      userId: 'user-1',
      userName: 'Test User',
      companyId: 'company-b',
      role: 'ADMIN',
      driverId: null,
      isSuperAdmin: true,
    });
  });

  it('recusa empresa inexistente', async () => {
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(superAdmin());
    vi.mocked(companyRepository.findById).mockResolvedValue(null);
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token', 'nao-existe'), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'COMPANY_NOT_FOUND' });
  });

  it('recusa empresa inativa', async () => {
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(superAdmin());
    vi.mocked(companyRepository.findById).mockResolvedValue({
      id: 'company-b',
      status: 'INACTIVE',
    } as never);
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token', 'company-b'), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'COMPANY_INACTIVE' });
  });

  it('IGNORA o cabeçalho de empresa para quem não é super administrador', async () => {
    // A garantia central do desenho: a escolha vinda do cliente só é
    // considerada depois que o banco confirmou a condição. Para um perfil
    // comum, o cabeçalho não tem efeito algum.
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(perfil());
    const req = makeReq('Bearer valid-token', 'company-de-outra-empresa');

    await authenticate(req, makeRes(), vi.fn());

    expect(req.scope?.companyId).toBe('company-a');
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it('as verificações de situação valem também para o super administrador', async () => {
    vi.mocked(userRepository.findForAuthentication).mockResolvedValue(
      perfil({ isSuperAdmin: true, companyId: null as never, company: null as never, status: 'BLOCKED' }),
    );
    const res = makeRes();

    await authenticate(makeReq('Bearer valid-token'), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'BLOCKED' });
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
    expect(userRepository.findForAuthentication).not.toHaveBeenCalled();
    expect(nextFn).toHaveBeenCalledOnce();
  });
});
