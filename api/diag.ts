/**
 * Função de diagnóstico do ambiente serverless.
 *
 * Carrega cada dependência isoladamente, dentro de try/catch, para revelar
 * qual delas impede a inicialização da API — informação que a mensagem
 * genérica FUNCTION_INVOCATION_FAILED não fornece.
 *
 * Temporária: removida assim que a publicação estiver estável.
 */
import type { IncomingMessage, ServerResponse } from 'http';

interface Etapa {
  etapa: string;
  ok: boolean;
  detalhe?: string;
}

function tentar(nome: string, fn: () => unknown): Etapa {
  try {
    fn();
    return { etapa: nome, ok: true };
  } catch (erro) {
    return { etapa: nome, ok: false, detalhe: (erro as Error).message?.slice(0, 400) };
  }
}

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const variaveis = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'CRON_SECRET'].reduce(
    (acc, chave) => ({ ...acc, [chave]: process.env[chave] ? 'definida' : 'AUSENTE' }),
    {} as Record<string, string>,
  );

  const etapas: Etapa[] = [
    tentar('require express', () => require('express')),
    tentar('require node-cron', () => require('node-cron')),
    tentar('require jose', () => require('jose')),
    tentar('require @fleet-manager/shared', () => require('@fleet-manager/shared')),
    tentar('require @prisma/client', () => require('@prisma/client')),
    tentar('instanciar PrismaClient', () => {
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient();
    }),
    tentar('carregar config/env', () => require('../apps/api/src/config/env')),
    tentar('carregar app completo', () => require('../apps/api/src/app')),
  ];

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify(
      { runtime: process.version, vercel: process.env.VERCEL ?? null, variaveis, etapas },
      null,
      2,
    ),
  );
}
