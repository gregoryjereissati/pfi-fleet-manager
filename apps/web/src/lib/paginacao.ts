/**
 * Registros por página nas listagens de lançamentos.
 *
 * Igual ao padrão da API. Despesas e manutenções acumulam com os anos; a tela
 * busca e desenha uma página por vez, e o tempo de abertura não depende do
 * volume da empresa.
 */
export const TAMANHO_PAGINA = 50

/** Parâmetros `limit` e `offset` da página `pagina` (começando em zero). */
export function parametrosDaPagina(pagina: number): Record<'limit' | 'offset', string> {
  return { limit: String(TAMANHO_PAGINA), offset: String(pagina * TAMANHO_PAGINA) }
}
