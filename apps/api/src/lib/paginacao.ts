import { z } from 'zod';

/**
 * Paginação das listagens de lançamentos.
 *
 * Despesas e manutenções crescem sem limite ao longo dos anos de uso de uma
 * frota. Sem página, a listagem devolvia todas as linhas da empresa numa
 * resposta só: com 50 mil despesas eram 27 MB — acima do teto de 4,5 MB que a
 * Vercel impõe à resposta de uma função — e o navegador travava desenhando a
 * tabela. Com página, a resposta tem tamanho fixo, qualquer que seja o volume.
 *
 * O corpo continua sendo a lista; o total de registros que atendem aos filtros
 * vai no cabeçalho `X-Total-Count`, para que a tela monte a navegação.
 */

/** Registros por página quando a requisição não informa. */
export const LIMITE_PADRAO = 50;

/** Teto por página. Acima dele a resposta voltaria a crescer com o volume. */
export const LIMITE_MAXIMO = 200;

export const CABECALHO_TOTAL = 'X-Total-Count';

/** Campos de paginação, para compor o esquema de consulta de cada listagem. */
export const camposDePaginacao = {
  limit: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_PADRAO),
  offset: z.coerce.number().int().min(0).default(0),
};

export interface Paginacao {
  limit: number;
  offset: number;
}
