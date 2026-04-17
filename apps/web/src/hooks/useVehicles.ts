import { useEffect, useState } from 'react'
import type { VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface VehicleFilters {
  plate?: string
  status?: string
  yearMin?: string
  yearMax?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}

export function useVehicles(filters: VehicleFilters = {}) {
  const getToken = useToken()
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
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
        const queryFilters = JSON.parse(filterKey) as VehicleFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<VehicleDto[]>(
          `/vehicles${queryString ? `?${queryString}` : ''}`,
          token,
        )

        if (!cancelled) setVehicles(data)
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
    vehicles,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
