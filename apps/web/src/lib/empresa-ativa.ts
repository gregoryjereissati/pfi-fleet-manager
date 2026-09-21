/**
 * Empresa que o super administrador está operando.
 *
 * Só ele tem essa noção. Para todos os demais perfis a empresa vem do próprio
 * cadastro e o servidor a resolve sozinho — o que estiver guardado aqui é
 * simplesmente ignorado pela API.
 *
 * Fica no armazenamento local para sobreviver a recarregamentos da página. Não
 * é um dado de segurança: o servidor só aceita a escolha depois de confirmar,
 * no banco, que o perfil autenticado é de super administrador. Adulterar este
 * valor em outro perfil não produz efeito algum.
 */

const CHAVE = 'fleet-manager:empresa-ativa'

function ler(): string | null {
  try {
    return window.localStorage.getItem(CHAVE)
  } catch {
    // Navegação privada ou armazenamento bloqueado: seguimos sem empresa
    // escolhida, e a tela de seleção aparece a cada sessão.
    return null
  }
}

let emMemoria: string | null = ler()

/** Empresa escolhida, ou `null` quando ainda não houve escolha. */
export function empresaAtiva(): string | null {
  return emMemoria
}

/** Registra a escolha. `null` desfaz, levando de volta à tela de seleção. */
export function definirEmpresaAtiva(empresaId: string | null): void {
  emMemoria = empresaId

  try {
    if (empresaId) window.localStorage.setItem(CHAVE, empresaId)
    else window.localStorage.removeItem(CHAVE)
  } catch {
    // Sem armazenamento a escolha vale só enquanto a página estiver aberta.
  }
}
