import express from 'express';
import './jobs/alertCron';
import { router } from './routes';
import { errorHandler } from './middlewares/error-handler';
import { env, corsOrigins } from './config/env';

export const app = express();

/** Aceita qualquer porta de localhost, para o ambiente de desenvolvimento. */
const LOCALHOST = /^https?:\/\/localhost:\d+$/;

/**
 * Uma origem é autorizada quando consta em CORS_ORIGINS ou, fora de produção,
 * quando é localhost. Em produção, apenas a lista explícita vale — o domínio
 * do frontend publicado precisa ser declarado na variável de ambiente.
 */
function isAllowedOrigin(origin: string): boolean {
  if (corsOrigins.includes(origin.replace(/\/$/, ''))) return true;
  return env.NODE_ENV !== 'production' && LOCALHOST.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use(errorHandler);
