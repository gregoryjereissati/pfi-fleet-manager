import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authorize, authorizePlatform } from '../authorize';
import { UserRole } from '@fleet-manager/shared';

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

/**
 * Requisição já autenticada.
 *
 * `authorize` decide sobre o papel do **recorte**, não sobre o gravado no
 * perfil: os dois coincidem para perfis comuns e divergem para o super
 * administrador, cujo recorte nasce como ADMIN da empresa que escolheu.
 */
function makeReq(role: UserRole | null, opcoes: { isSuperAdmin?: boolean } = {}): Request {
  return {
    user: { id: 'user-1', name: 'Fulano', isSuperAdmin: opcoes.isSuperAdmin ?? false },
    scope:
      role === null
        ? undefined
        : {
            userId: 'user-1',
            userName: 'Fulano',
            companyId: 'company-a',
            role,
            driverId: null,
            isSuperAdmin: opcoes.isSuperAdmin ?? false,
          },
  } as unknown as Request;
}

describe('authorize', () => {
  it('retorna 401 quando req.user não está definido', () => {
    const req = { user: undefined } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 quando role do usuário não está na lista permitida', () => {
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(makeReq(UserRole.OPERATOR), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next quando role do usuário está permitido', () => {
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(makeReq(UserRole.MANAGER), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next quando somente um role é exigido e o usuário o possui', () => {
    const next = vi.fn();

    authorize(UserRole.ADMIN)(makeReq(UserRole.ADMIN), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('recusa com COMPANY_NOT_SELECTED quando ainda não há empresa escolhida', () => {
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN)(makeReq(null, { isSuperAdmin: true }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'COMPANY_NOT_SELECTED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('o super administrador passa como ADMIN da empresa que escolheu', () => {
    const next = vi.fn();

    authorize(UserRole.ADMIN)(makeReq(UserRole.ADMIN, { isSuperAdmin: true }), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe('authorizePlatform', () => {
  it('recusa quem não é super administrador', () => {
    const res = makeRes();
    const next = vi.fn();

    authorizePlatform()(makeReq(UserRole.ADMIN), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('aceita o super administrador mesmo sem empresa escolhida', () => {
    const next = vi.fn();

    authorizePlatform()(makeReq(null, { isSuperAdmin: true }), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('retorna 401 sem autenticação', () => {
    const res = makeRes();
    const next = vi.fn();

    authorizePlatform()({ user: undefined } as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
