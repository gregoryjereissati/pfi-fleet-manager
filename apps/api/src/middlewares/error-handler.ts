import { Request, Response, NextFunction } from 'express';
import { ehIdentificadorInvalido } from '../lib/db-errors';

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
