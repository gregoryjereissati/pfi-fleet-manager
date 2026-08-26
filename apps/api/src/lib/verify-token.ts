import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';

/**
 * Conjunto de chaves públicas do projeto Supabase.
 *
 * O Supabase assina os tokens de acesso com chave assimétrica (ES256) e
 * publica a chave pública correspondente no endpoint JWKS. A verificação é,
 * portanto, feita localmente com a chave pública — a API não compartilha
 * nenhum segredo com o serviço de autenticação.
 *
 * `createRemoteJWKSet` mantém as chaves em cache e as recarrega
 * automaticamente quando encontra um `kid` desconhecido, o que permite a
 * rotação de chaves sem reinicializar a aplicação.
 */
const JWKS = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export interface SupabaseAuthUser {
  /** Identificador do usuário no Supabase Auth (`auth.users.id`). */
  authUserId: string;
  /** E-mail associado à conta de acesso, normalizado em minúsculas. */
  email: string;
}

/**
 * Valida um token de acesso emitido pelo Supabase Auth.
 *
 * Lança exceção quando o token está ausente, expirado, assinado por outra
 * chave, ou quando o emissor e o público não correspondem ao projeto.
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseAuthUser> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${env.SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });

  if (!payload.sub) {
    throw new Error('Token sem a claim "sub"');
  }

  const email = typeof payload.email === 'string' ? payload.email : '';

  return {
    authUserId: payload.sub,
    email: email.trim().toLowerCase(),
  };
}
