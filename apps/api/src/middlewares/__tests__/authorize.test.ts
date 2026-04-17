import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize } from '../authorize';
import { UserRole } from '@fleet-manager/shared';

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
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
    const req = { user: { role: UserRole.OPERATOR } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next quando role do usuário está permitido', () => {
    const req = { user: { role: UserRole.MANAGER } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next quando somente um role é exigido e o usuário o possui', () => {
    const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
