import { useEffect, useState } from 'react'
import type { DriverDto } from '@fleet-manager/shared'
import { apiFetch, isAbortError } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface DriverFilters {
  /** Busca por nome ou CPF, na ficha ou no usuário vinculado. */
  search?: string
  status?: string
}

export function useDrivers(filters: DriverFilters = {}) {
  const getToken = useToken()
  const [drivers, setDrivers] = useState<DriverDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false
    // A requisição anterior é cancelada de fato quando outra começa, em vez de
    // seguir até o fim para ter o resultado descartado.
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const queryFilters = JSON.parse(filterKey) as DriverFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<DriverDto[]>(
          `/drivers${queryString ? `?${queryString}` : ''}`,
          token,
          { signal: controller.signal },
        )

        if (!cancelled) setDrivers(data)
      } catch (err) {
        if (cancelled || isAbortError(err)) return
        setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [filterKey, getToken, reloadToken])

  return {
    drivers,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
