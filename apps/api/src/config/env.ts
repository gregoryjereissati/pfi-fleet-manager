import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Conexão usada pela aplicação em tempo de execução (pooler). */
  DATABASE_URL: z.string().min(1),

  /**
   * Conexão direta, exigida pelo Prisma para aplicar migrations.
   * O pooler em modo de transação não aceita comandos DDL.
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
   * Origens autorizadas pelo CORS, separadas por vírgula.
   * Em desenvolvimento, qualquer porta de localhost é aceita mesmo sem esta
   * variável; em produção, o domínio do frontend precisa constar aqui.
   */
  CORS_ORIGINS: z.string().default(''),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Variáveis de ambiente inválidas:', result.error.format());
  process.exit(1);
}

export const env = result.data;

/** Origens explicitamente autorizadas pelo CORS, já normalizadas. */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin) => origin.length > 0);
