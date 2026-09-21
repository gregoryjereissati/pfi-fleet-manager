import { useCallback, useEffect, useState } from 'react'
import type { AssignmentDto, DriverDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

/**
 * Ficha do motorista com o histórico de vínculos.
 *
 * Os vínculos vêm com período: os vigentes têm `endDate` nulo, e os encerrados
 * permanecem na resposta — a relação anterior não desaparece.
 */
export interface DriverWithAssignments extends DriverDto {
  assignments: AssignmentDto[]
}

export function useDriver(id?: string) {
  const getToken = useToken()
  const [driver, setDriver] = useState<DriverWithAssignments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!id) {
      setDriver(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const data = await apiFetch<DriverWithAssignments>(`/drivers/${id}`, token)

        if (!cancelled) setDriver(data)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [getToken, id, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { driver, loading, error, reload }
}
