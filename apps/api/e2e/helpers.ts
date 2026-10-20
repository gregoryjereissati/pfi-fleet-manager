import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'dotenv';
import request from 'supertest';
import { app } from '../src/app';

/**
 * Apoio da suíte de ponta a ponta.
 *
 * A suíte exercita o app Express inteiro — rotas, middlewares, controllers,
 * serviços e repositórios — contra o Supabase local do Docker, com tokens
 * reais emitidos pelo Supabase Auth. Nada é simulado.
 *
 * Ela grava no banco: cria veículos, lançamentos, documentos, uma empresa e
 * uma conta nova. Por isso roda à parte da suíte padrão e só contra a base
 * local. Para voltar ao estado do seed:
 *
 *   npx supabase db reset && npm run db:migrate && npm run db:seed
 */

export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const SENHA = process.env.SEED_PASSWORD ?? '';

/**
 * A chave pública é a que o navegador usa para entrar. Ela fica no `.env` do
 * frontend; a API não precisa dela.
 */
function lerChavePublica(): string {
  try {
    const web = parse(readFileSync(resolve(__dirname, '../../web/.env')));
    return web.VITE_SUPABASE_ANON_KEY ?? SERVICE_ROLE;
  } catch {
    return SERVICE_ROLE;
  }
}

export const CHAVE_PUBLICA = lerChavePublica();

/** A suíte só aceita rodar contra o Supabase local, nunca contra um projeto hospedado. */
export const ehAmbienteLocal = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(SUPABASE_URL);

export const PESSOAS = {
  helena: 'helena.admin@example.com',
  rogerio: 'rogerio.gerente@example.com',
  claudia: 'claudia.motorista@example.com',
  iranildo: 'iranildo.motorista@example.com',
  marcos: 'marcos.pendente@example.com',
  vanda: 'vanda.recusada@example.com',
  otavio: 'otavio.admin@example.com',
  sandra: 'sandra.gerente@example.com',
  debora: 'debora.motorista@example.com',
  plataforma: 'plataforma.super@example.com',
} as const;

export type Pessoa = keyof typeof PESSOAS;

interface Sessao {
  access_token: string;
  user: { id: string };
}

export async function entrar(email: string, senha = SENHA): Promise<string> {
  const resposta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: CHAVE_PUBLICA, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao entrar como ${email}: ${resposta.status} ${await resposta.text()}`);
  }
  return ((await resposta.json()) as Sessao).access_token;
}

/** Cria conta pelo mesmo caminho do formulário de cadastro (signUp). */
export async function criarConta(email: string, senha: string): Promise<string> {
  const resposta = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: CHAVE_PUBLICA, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha no signUp de ${email}: ${resposta.status} ${await resposta.text()}`);
  }
  const corpo = (await resposta.json()) as Sessao;
  if (!corpo.access_token) {
    throw new Error('signUp sem sessão: a confirmação de e-mail está ativa no Supabase local');
  }
  return corpo.access_token;
}

type Metodo = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** Cliente HTTP do app em processo, autenticado com o token informado. */
export function cliente(token?: string, empresa?: string) {
  const chamar = (metodo: Metodo, caminho: string, corpo?: object) => {
    let req = request(app)[metodo](`/api${caminho}`);
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    if (empresa) req = req.set('X-Company-Id', empresa);
    return corpo === undefined ? req : req.send(corpo);
  };

  return {
    get: (caminho: string) => chamar('get', caminho),
    post: (caminho: string, corpo: object = {}) => chamar('post', caminho, corpo),
    put: (caminho: string, corpo: object = {}) => chamar('put', caminho, corpo),
    patch: (caminho: string, corpo: object = {}) => chamar('patch', caminho, corpo),
    delete: (caminho: string, corpo?: object) => chamar('delete', caminho, corpo),
  };
}

export type Cliente = ReturnType<typeof cliente>;

/** Sufixo curto e único por execução, para placas, e-mails e códigos. */
export const SUFIXO = Date.now().toString(36).slice(-5).toUpperCase();

/** CPF com dígitos verificadores válidos, distinto a cada chamada. */
export function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const digito = (numeros: number[]) => {
    const soma = numeros.reduce((acc, n, i) => acc + n * (numeros.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join('');
}

/** Hoje como data civil, no fuso de São Paulo. */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function diasAPartirDeHoje(dias: number): string {
  const data = new Date(`${hoje()}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Lista os nomes de arquivo sob um prefixo do bucket, com a service_role. */
export async function listarArquivos(prefixo: string): Promise<string[]> {
  const resposta = await fetch(`${SUPABASE_URL}/storage/v1/object/list/documents`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: prefixo, limit: 100 }),
  });
  const itens = (await resposta.json()) as { name: string }[];
  return itens.map((item) => item.name);
}
