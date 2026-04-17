import { useEffect, useState } from 'react'
import type { DriverDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface DriverFilters {
  name?: string
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
        )

        if (!cancelled) setDrivers(data)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filterKey, getToken, reloadToken])

  return {
    drivers,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
