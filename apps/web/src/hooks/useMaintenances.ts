import { useEffect, useState } from 'react'
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface MaintenanceVehicleSummary {
  id: string
  plate: string
  brand: string
  model: string
}

export interface MaintenanceItem {
  id: string
  vehicleId: string
  type: MaintenanceType
  status: MaintenanceStatus
  description: string
  scheduledDate: string
  completedDate: string | null
  createdAt: string
  vehicle: MaintenanceVehicleSummary
}

export interface MaintenanceFilters {
  vehicleId?: string
  type?: MaintenanceType | ''
  status?: MaintenanceStatus | ''
  startDate?: string
  endDate?: string
  orderBy?: 'scheduledDate' | 'createdAt' | 'status'
  order?: 'asc' | 'desc'
}

export function useMaintenances(filters: MaintenanceFilters = {}) {
  const getToken = useToken()
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([])
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
        const queryFilters = JSON.parse(filterKey) as MaintenanceFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<MaintenanceItem[]>(
          `/maintenances${queryString ? `?${queryString}` : ''}`,
          token,
        )

        if (!cancelled) setMaintenances(data)
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
    maintenances,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
