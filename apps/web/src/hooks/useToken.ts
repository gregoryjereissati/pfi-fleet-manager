import { useCallback } from 'react'
import { getAccessToken } from '@/lib/supabase'

/**
 * Fornece o token de acesso da sessão do Supabase para as chamadas à API.
 *
 * O cliente do Supabase renova o token automaticamente, de modo que cada
 * chamada obtém sempre uma credencial válida.
 */
export function useToken() {
  return useCallback(() => getAccessToken(), [])
}
