import { sql } from '../config/database';

/** Prazo da consulta de verificação. Um banco saudável responde em milissegundos. */
const PRAZO_MS = 3_000;

/**
 * Confere se o banco responde.
 *
 * Sem esta verificação, `/health` respondia "ok" sempre que a função estava
 * de pé, mesmo com o banco fora do ar — e um monitor externo não teria como
 * distinguir os dois casos. A consulta é a mais barata possível; o prazo
 * evita que a própria verificação fique presa quando o banco não responde.
 */
export async function bancoResponde(
  consultar: () => Promise<unknown> = () => sql`select 1`,
  prazoMs: number = PRAZO_MS,
): Promise<boolean> {
  let relogio: NodeJS.Timeout | undefined;
  const prazo = new Promise<false>((resolve) => {
    relogio = setTimeout(() => resolve(false), prazoMs);
  });

  // A falha da consulta é tratada na própria promessa: se o prazo vencer
  // primeiro, a rejeição que chega depois não fica sem tratamento.
  const consulta = consultar().then(
    () => true,
    () => false,
  );

  try {
    return await Promise.race([consulta, prazo]);
  } finally {
    clearTimeout(relogio);
  }
}
