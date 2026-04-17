import { useEffect, useState } from 'react'
import type { DriverDto, VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface DriverWithVehicles extends DriverDto {
  vehicles: VehicleDto[]
}

export function useDriver(id?: string) {
  const getToken = useToken()
  const [driver, setDriver] = useState<DriverWithVehicles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const data = await apiFetch<DriverWithVehicles>(`/drivers/${id}`, token)

        if (!cancelled) setDriver(data)
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
  }, [getToken, id])

  return { driver, loading, error }
}
