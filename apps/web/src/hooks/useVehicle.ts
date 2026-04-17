import { useEffect, useState } from 'react'
import type { DriverDto, VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface VehicleExpense {
  id: string
  type: string
  amount: string
  date: string
}

export interface VehicleMaintenance {
  id: string
  type: string
  status: string
  scheduledDate: string
}

export interface VehicleWithRelations extends VehicleDto {
  drivers: DriverDto[]
  expenses: VehicleExpense[]
  maintenances: VehicleMaintenance[]
}

export function useVehicle(id?: string) {
  const getToken = useToken()
  const [vehicle, setVehicle] = useState<VehicleWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!id) {
      setVehicle(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const data = await apiFetch<VehicleWithRelations>(`/vehicles/${id}`, token)

        if (!cancelled) setVehicle(data)
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
  }, [getToken, id, reloadToken])

  return {
    vehicle,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
