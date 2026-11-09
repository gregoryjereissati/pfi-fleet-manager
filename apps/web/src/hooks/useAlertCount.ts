import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

const POLL_INTERVAL_MS = 5 * 60 * 1000

/** Contagem da central de alertas: o total e quanto vem de cada frente. */
export interface AlertCounts {
  count: number
  documents: number
  maintenances: number
  licenses: number
}

const ZERADO: AlertCounts = { count: 0, documents: 0, maintenances: 0, licenses: 0 }

export function useAlertCount() {
  const getToken = useToken()
  const [counts, setCounts] = useState<AlertCounts>(ZERADO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        const data = await apiFetch<AlertCounts>('/alerts/count', token)

        if (!cancelled) {
          setCounts(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    const interval = window.setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [getToken])

  return { count: counts.count, counts, loading, error }
}
