import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../validate';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  year: z.number().int().min(1900).max(2100),
});

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('validate', () => {
  it('retorna 400 com detalhes quando body é inválido', () => {
    const req = { body: { name: '', year: 1800 } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error', details: expect.any(Object) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next e sobrescreve req.body com dados parseados quando válido', () => {
    const req = { body: { name: 'Toyota', year: 2022 } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'Toyota', year: 2022 });
  });

  it('remove campos extras do body (strip)', () => {
    const req = { body: { name: 'Toyota', year: 2022, extra: 'campo' } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Toyota', year: 2022 });
    expect(req.body.extra).toBeUndefined();
  });
});
