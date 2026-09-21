import { sql } from '../config/database';

/**
 * Resolve os nomes dos autores de um conjunto de lançamentos.
 *
 * A autoria é guardada como identificador no próprio lançamento, sem relação
 * declarada: remover um usuário não deve apagar nem alterar os lançamentos que
 * ele registrou. O nome é buscado à parte, em **uma** consulta por listagem, e
 * sempre dentro da empresa — um identificador de outra empresa simplesmente
 * não resolve.
 *
 * Lançamentos anteriores ao registro de autoria não têm autor. Eles devolvem
 * `null`, e a interface apresenta "autor não registrado" — a autoria nunca é
 * atribuída a quem estiver consultando.
 */
export async function resolveAuthorNames(
  companyId: string,
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];

  if (unique.length === 0) return new Map();

  const users = await sql<{ id: string; name: string }[]>`
    select id, name
    from users
    where id = any(${unique}::uuid[])
      and company_id = ${companyId}
  `;

  return new Map(users.map((user) => [user.id, user.name]));
}

/** Nome do autor, ou `null` quando o lançamento não registra autoria. */
export function authorName(
  names: Map<string, string>,
  id: string | null,
): string | null {
  if (!id) return null;
  return names.get(id) ?? null;
}
