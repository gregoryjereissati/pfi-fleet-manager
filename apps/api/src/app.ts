import express from 'express';
import './jobs/alertCron';
import { router } from './routes';
import { errorHandler } from './middlewares/error-handler';
import { registrarRequisicao, tempoLimite } from './middlewares/observabilidade';
import { env, corsOrigins } from './config/env';
import { CABECALHO_TOTAL } from './lib/paginacao';
import { bancoResponde } from './lib/saude';

export const app = express();

app.use(registrarRequisicao);

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

  // `X-Company-Id` é onde o super administrador informa em qual empresa está
  // operando. Sem constar aqui, o navegador barraria a requisição antes de ela
  // chegar à API — e a falha apareceria como erro de CORS, não como falta de
  // permissão, o que despista.
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-Id');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  // O total das listagens paginadas vai em cabeçalho; entre origens diferentes
  // o navegador só o entrega ao frontend se ele estiver exposto.
  res.header('Access-Control-Expose-Headers', CABECALHO_TOTAL);

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get('/health', async (_req, res) => {
  const banco = await bancoResponde();
  res.status(banco ? 200 : 503).json({
    status: banco ? 'ok' : 'unavailable',
    database: banco ? 'ok' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', tempoLimite(), router);
app.use(errorHandler);
