import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { AppError, errorHandler } from '../error-handler';

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function responder(err: Error): Response {
  const res = makeRes();
  errorHandler(err, {} as Request, res, vi.fn());
  return res;
}

/** Forma do erro que o postgres.js lança: código e rotina vêm do servidor. */
function erroPostgres(code: string, routine: string, message: string): Error {
  return Object.assign(new Error(message), { name: 'PostgresError', code, routine });
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde AppError com o status e a mensagem dela', () => {
    const res = responder(new AppError(409, 'Plate already in use'));

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Plate already in use' });
  });

  it('identificador que não é UUID responde como inexistente', () => {
    const res = responder(
      erroPostgres('22P02', 'string_to_uuid', 'invalid input syntax for type uuid: "abc"'),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('outra conversão inválida no banco continua sendo erro do servidor', () => {
    const res = responder(
      erroPostgres('22P02', 'enum_in', 'invalid input value for enum user_role: "z"'),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(console.error).toHaveBeenCalled();
  });

  it('JSON malformado no corpo responde 400', () => {
    const erro = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
      status: 400,
      expose: true,
      type: 'entity.parse.failed',
    });

    const res = responder(erro);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid JSON body' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('corpo acima do limite responde com o status do body-parser', () => {
    const erro = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
      type: 'entity.too.large',
    });

    const res = responder(erro);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: 'request entity too large' });
  });

  it('erro com status 4xx não exposto não vaza a mensagem', () => {
    const erro = Object.assign(new Error('detalhe interno'), { status: 400, expose: false });

    const res = responder(erro);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it.each(['CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND'])(
    'banco inalcançável (%s) responde 503',
    (code) => {
      const res = responder(Object.assign(new Error(code), { code }));

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    },
  );

  it('erro desconhecido responde 500 sem detalhes', () => {
    const res = responder(new Error('falha qualquer'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('com a resposta já enviada, registra o erro tardio sem responder de novo', () => {
    const res = makeRes();
    Object.assign(res, { headersSent: true });
    const erro = Object.assign(new Error('write CONNECT_TIMEOUT'), { code: 'CONNECT_TIMEOUT' });

    errorHandler(erro, {} as Request, res, vi.fn());

    expect(console.error).toHaveBeenCalledWith('[erro após a resposta]', 'CONNECT_TIMEOUT');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('resposta tardia depois do tempo-limite é descartada em silêncio', () => {
    const res = makeRes();
    Object.assign(res, { headersSent: true });
    const next = vi.fn();
    const erro = Object.assign(new Error('Cannot set headers after they are sent'), {
      code: 'ERR_HTTP_HEADERS_SENT',
    });

    errorHandler(erro, {} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
