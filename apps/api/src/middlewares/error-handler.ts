import { Request, Response, NextFunction } from 'express';
import { ehBancoIndisponivel, ehIdentificadorInvalido } from '../lib/db-errors';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // A resposta já saiu inteira — o tempo-limite respondeu 503 antes de o
  // handler terminar. Não há o que responder. A tentativa de responder de novo
  // é esperada e descartada; outro erro tardio fica registrado numa linha.
  if (res.headersSent) {
    const { code } = err as Error & { code?: string };
    if (code !== 'ERR_HTTP_HEADERS_SENT') console.error('[erro após a resposta]', code ?? err.message);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Um identificador que não é UUID não existe — responde como qualquer outro
  // registro fora do alcance de quem pede, sem revelar o motivo.
  if (ehIdentificadorInvalido(err)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Banco fora do alcance: o serviço está indisponível, não com defeito.
  if (ehBancoIndisponivel(err)) {
    console.error('[db] banco indisponível:', (err as Error & { code?: string }).code);
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }

  // Erros do body-parser (JSON malformado, corpo grande demais) já trazem o
  // status 4xx e marcam com `expose` quando a mensagem pode ir ao cliente.
  const { status, expose, type } = err as Error & {
    status?: number;
    expose?: boolean;
    type?: string;
  };
  if (expose && typeof status === 'number' && status >= 400 && status < 500) {
    const mensagem = type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message;
    res.status(status).json({ error: mensagem });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
