import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string(),
  AUTH0_DOMAIN: z.string(),
  AUTH0_AUDIENCE: z.string(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Variáveis de ambiente inválidas:', result.error.format());
  process.exit(1);
}

export const env = result.data;
