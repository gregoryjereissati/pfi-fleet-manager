import { useSessionData } from '@/lib/session-data'

/**
 * Perfil do usuário autenticado.
 *
 * O perfil é buscado uma vez por sessão e compartilhado. Este gancho continua
 * com a mesma assinatura de antes; o que mudou é que dez chamadas dele não
 * produzem mais dez requisições.
 */
export function useCurrentUser() {
  const { currentUser, loading, error } = useSessionData()
  return { currentUser, loading, error }
}
