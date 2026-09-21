import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Conexão usada pela aplicação em tempo de execução (pooler). */
  DATABASE_URL: z.string().min(1),

  /**
   * Conexão direta (porta 5432), usada para aplicar migrations e para os
   * scripts de manutenção da base. O pooler em modo de transação não sustenta
   * DDL longo nem lock consultivo entre comandos.
   */
  DIRECT_URL: z.string().min(1),

  /**
   * URL do projeto Supabase, sem barra ao final.
   * Usada para localizar o JWKS e validar o emissor dos tokens de acesso.
   */
  SUPABASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/$/, '')),

  /**
   * Chave `service_role` do projeto Supabase.
   *
   * Necessária **em tempo de execução**: os anexos deixaram de ser alcançados
   * pelo navegador, e é a API que assina as URLs de leitura e de envio junto
   * ao Storage. Antes só os scripts de manutenção a usavam, e por isso ela não
   * constava aqui.
   *
   * Sem ela cadastrada no ambiente de publicação, a aplicação sobe e falha ao
   * abrir ou enviar um anexo.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  /**
   * Origens autorizadas pelo CORS, separadas por vírgula.
   * Em desenvolvimento, qualquer porta de localhost é aceita mesmo sem esta
   * variável; em produção, o domínio do frontend precisa constar aqui.
   */
  CORS_ORIGINS: z.string().default(''),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const faltando = Object.entries(result.error.format())
    .filter(([chave]) => chave !== '_errors')
    .map(([chave, valor]) => `${chave}: ${(valor as { _errors: string[] })._errors.join(', ')}`)
    .join(' | ');

  const mensagem = `Variáveis de ambiente inválidas -> ${faltando}`;
  console.error(mensagem);

  // Em ambiente serverless não há processo a encerrar: `process.exit` produz
  // uma falha genérica, sem indicar a causa. Lançar o erro faz a mensagem
  // aparecer no log da plataforma.
  if (process.env.VERCEL === '1') {
    throw new Error(mensagem);
  }

  process.exit(1);
}

export const env = result.data;

/** Origens explicitamente autorizadas pelo CORS, já normalizadas. */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin) => origin.length > 0);
