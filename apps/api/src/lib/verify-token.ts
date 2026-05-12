import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signJwt(userId: string, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub) throw new Error('Missing sub claim');
  return payload.sub;
}
