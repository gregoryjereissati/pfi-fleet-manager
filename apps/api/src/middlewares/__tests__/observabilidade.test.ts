import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { registrarRequisicao, tempoLimite } from '../observabilidade';

function makeReq(): Request {
  return { method: 'GET', originalUrl: '/api/vehicles?status=ACTIVE' } as Request;
}

/** Resposta mínima: emite eventos e registra o que foi enviado. */
function makeRes() {
  const res = new EventEmitter() as EventEmitter & Response;
  Object.assign(res, { headersSent: false, statusCode: 200 });
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as Response['status'];
  res.json = vi.fn(() => {
    (res as { headersSent: boolean }).headersSent = true;
    return res;
  }) as unknown as Response['json'];
  return res;
}

describe('tempoLimite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('responde 503 quando a requisição passa do limite', () => {
    const res = makeRes();
    const next = vi.fn();

    tempoLimite(1_000)(makeReq(), res, next);
    expect(next).toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
  });

  it('não interfere numa resposta que termina a tempo', () => {
    const res = makeRes();

    tempoLimite(1_000)(makeReq(), res, vi.fn());
    res.emit('finish');
    vi.advanceTimersByTime(5_000);

    expect(res.status).not.toHaveBeenCalled();
  });

  it('não responde duas vezes se a resposta já saiu', () => {
    const res = makeRes();
    (res as { headersSent: boolean }).headersSent = true;

    tempoLimite(1_000)(makeReq(), res, vi.fn());
    vi.advanceTimersByTime(1_000);

    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('registrarRequisicao', () => {
  const ambienteOriginal = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ambienteOriginal;
    vi.restoreAllMocks();
  });

  it('registra método, caminho sem a query string, status e duração', () => {
    process.env.NODE_ENV = 'production';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = makeRes();

    registrarRequisicao(makeReq(), res, vi.fn());
    res.emit('finish');

    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\[req\] GET \/api\/vehicles 200 \d+ms$/));
  });

  it('fica em silêncio nos testes', () => {
    process.env.NODE_ENV = 'test';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = makeRes();
    const next = vi.fn();

    registrarRequisicao(makeReq(), res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
