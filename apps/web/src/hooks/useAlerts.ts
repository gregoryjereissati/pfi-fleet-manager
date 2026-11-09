import { useEffect, useState } from 'react'
import type { DocumentDto, MaintenanceType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export interface MaintenanceAlert {
  id: string
  vehicle: { id: string; plate: string; brand: string; model: string }
  type: MaintenanceType
  description: string
  scheduledDate: string
  status: 'OVERDUE' | 'SCHEDULED'
}

export interface LicenseAlert {
  driverId: string
  driverName: string
  cnhExpiry: string
  status: 'EXPIRED' | 'EXPIRING_SOON'
}

export interface Alerts {
  documents: DocumentDto[]
  maintenances: MaintenanceAlert[]
  licenses: LicenseAlert[]
}

const VAZIO: Alerts = { documents: [], maintenances: [], licenses: [] }

/** As três frentes da central de alertas, numa única consulta. */
export function useAlerts() {
  const getToken = useToken()
  const [alerts, setAlerts] = useState<Alerts>(VAZIO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const token = await getToken()
        const data = await apiFetch<Alerts>('/alerts', token)
        if (!cancelled) setAlerts(data)
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
  }, [getToken])

  return { alerts, loading, error }
}
