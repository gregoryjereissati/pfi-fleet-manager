import { sql } from '../config/database';

/**
 * Fragmentos SQL reaproveitados entre repositórios.
 *
 * Os objetos aninhados que a API devolve — o veículo resumido dentro de um
 * lançamento, a identidade do motorista dentro de um vínculo — aparecem em
 * mais de uma consulta. Mantê-los aqui evita que duas telas montem o mesmo
 * objeto com campos diferentes.
 *
 * As chaves são escritas já no formato da resposta. O driver converte nomes de
 * coluna entre snake_case e camelCase, mas não toca no conteúdo de `json`: o
 * que estiver escrito aqui é exatamente o que chega ao cliente.
 */

/**
 * Instante no formato ISO com milissegundos e sufixo `Z`.
 *
 * Dentro de `json_build_object` o PostgreSQL renderiza `timestamptz` como
 * `2026-09-21T12:00:00+00:00`. Fora do json, o driver entrega `Date`, que o
 * `JSON.stringify` da resposta serializa como `2026-09-21T12:00:00.000Z`. Os
 * dois formatos são válidos, mas diferentes — e o mesmo campo apareceria com
 * uma forma em objeto aninhado e outra no nível de cima.
 *
 * Esta função impõe o segundo formato, que é o que a API já devolvia.
 */
export function instanteIso(expressao: string) {
  return sql`to_char(${sql.unsafe(expressao)} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/** Veículo resumido, como aparece dentro de lançamentos e documentos. */
export function veiculoResumido(alias: string) {
  const a = sql.unsafe(alias);
  return sql`
    json_build_object(
      'id', ${a}.id,
      'plate', ${a}.plate,
      'brand', ${a}.brand,
      'model', ${a}.model
    )
  `;
}

/**
 * Usuário vinculado a uma ficha de motorista, ou `null`.
 *
 * É a fonte da identidade quando a ficha tem conta: `resolveDriverIdentity`
 * decide entre este objeto e as colunas próprias da ficha.
 */
export function usuarioDaFicha(alias: string) {
  const a = sql.unsafe(alias);
  return sql`
    case when ${a}.id is null then null else
      json_build_object(
        'id', ${a}.id,
        'name', ${a}.name,
        'cpf', ${a}.cpf,
        'email', ${a}.email
      )
    end
  `;
}

/**
 * Ficha de motorista com a identidade resolvível, como aparece dentro de um
 * vínculo. `usuarioAlias` é o alias do LEFT JOIN com `users`.
 */
export function motoristaComIdentidade(driverAlias: string, usuarioAlias: string) {
  const d = sql.unsafe(driverAlias);
  return sql`
    json_build_object(
      'id', ${d}.id,
      'name', ${d}.name,
      'cpf', ${d}.cpf,
      'status', ${d}.status,
      'user', ${usuarioDaFicha(usuarioAlias)}
    )
  `;
}
