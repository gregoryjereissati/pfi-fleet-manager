import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CurrentUserDto, VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { getAccessToken, supabase } from '@/lib/supabase'

/**
 * Dados que a aplicação inteira compartilha: o perfil de quem está usando e a
 * lista de veículos que alimenta os seletores e filtros.
 *
 * Antes, cada tela buscava os dois por conta própria — `/users/me` chegava a
 * ser pedido três vezes na entrada e uma a cada navegação, e `/vehicles` era
 * refeito em oito telas. Aqui cada um é buscado **uma vez** e revalidado
 * quando muda.
 *
 * Duas garantias que um cache precisa ter para não virar um problema pior que
 * o que resolve:
 *
 * 1. **Não mistura sessões.** O conteúdo é amarrado a uma chave de escopo
 *    formada por usuário, empresa e papel. Mudou qualquer um dos três, o que
 *    estava guardado é descartado — nunca reaproveitado.
 * 2. **Não substitui o servidor.** Isto acelera leitura; ele não decide
 *    permissão. Uma permissão revogada continua valendo na hora, porque o
 *    servidor reconsulta o perfil a cada requisição.
 */

interface SessionData {
  currentUser: CurrentUserDto | null
  loading: boolean
  error: string | null
  /** Recarrega o perfil a partir do servidor. */
  refreshCurrentUser: () => Promise<void>
  /** Publica um perfil recém-salvo sem uma nova ida ao servidor. */
  applyCurrentUser: (user: CurrentUserDto) => void
  /** Veículos ao alcance do usuário, compartilhados por todas as telas. */
  vehicles: VehicleDto[]
  vehiclesLoading: boolean
  /** Recarrega a lista — usar após cadastrar, editar ou inativar um veículo. */
  invalidateVehicles: () => void
  /** Descarta tudo. Chamado ao sair. */
  clear: () => void
}

const SessionDataContext = createContext<SessionData | null>(null)

/** Identidade do escopo: mudou, o que estava guardado deixa de valer. */
function scopeKeyOf(user: CurrentUserDto | null): string | null {
  if (!user) return null
  return `${user.id}:${user.companyId ?? 'sem-empresa'}:${user.role}`
}

export function SessionDataProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehiclesToken, setVehiclesToken] = useState(0)

  /** Escopo cujos dados auxiliares estão em memória. */
  const loadedScope = useRef<string | null>(null)
  const scopeKey = scopeKeyOf(currentUser)

  const loadCurrentUser = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()

      if (!token) {
        setCurrentUser(null)
        setError(null)
        return
      }

      const data = await apiFetch<CurrentUserDto>('/users/me', token)
      setCurrentUser(data)
      setError(null)
    } catch (err) {
      setCurrentUser(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setCurrentUser(null)
    setVehicles([])
    setError(null)
    loadedScope.current = null
  }, [])

  useEffect(() => {
    void loadCurrentUser()

    // Trocar de conta, ou sair, invalida tudo: o próximo usuário não herda o
    // que o anterior tinha carregado.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clear()
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        clear()
        void loadCurrentUser()
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [clear, loadCurrentUser])

  // Os veículos só são buscados quando há escopo, e são descartados assim que
  // o escopo muda.
  useEffect(() => {
    if (!scopeKey) {
      setVehicles([])
      loadedScope.current = null
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function load() {
      try {
        setVehiclesLoading(true)
        const token = await getAccessToken()
        const data = await apiFetch<VehicleDto[]>('/vehicles', token, {
          signal: controller.signal,
        })

        if (!cancelled) {
          setVehicles(data)
          loadedScope.current = scopeKey
        }
      } catch {
        // A lista é de apoio: uma falha aqui não derruba a tela, que continua
        // funcionando com o seletor vazio e mensagem própria.
        if (!cancelled) setVehicles([])
      } finally {
        if (!cancelled) setVehiclesLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [scopeKey, vehiclesToken])

  const value = useMemo<SessionData>(
    () => ({
      currentUser,
      loading,
      error,
      refreshCurrentUser: loadCurrentUser,
      applyCurrentUser: (user: CurrentUserDto) => {
        setCurrentUser(user)
        setError(null)
        setLoading(false)
      },
      vehicles,
      vehiclesLoading,
      invalidateVehicles: () => setVehiclesToken((token) => token + 1),
      clear,
    }),
    [currentUser, loading, error, loadCurrentUser, vehicles, vehiclesLoading, clear],
  )

  return <SessionDataContext.Provider value={value}>{children}</SessionDataContext.Provider>
}

export function useSessionData(): SessionData {
  const context = useContext(SessionDataContext)

  if (!context) {
    throw new Error('useSessionData exige SessionDataProvider acima na árvore.')
  }

  return context
}
