import { useState } from 'react'

/**
 * Página escolhida numa listagem paginada, que volta à primeira quando os
 * filtros mudam.
 *
 * A escolha guarda os filtros em que foi feita. Com outros filtros, a página
 * 4 da busca anterior não significa nada — a lista recomeça do início, sem um
 * efeito extra que primeiro buscaria a página velha.
 */
export function usePagina(chaveDosFiltros: string) {
  const [escolha, setEscolha] = useState({ chave: chaveDosFiltros, numero: 0 })
  const pagina = escolha.chave === chaveDosFiltros ? escolha.numero : 0

  function irPara(numero: number) {
    setEscolha({ chave: chaveDosFiltros, numero: Math.max(0, numero) })
  }

  return [pagina, irPara] as const
}
