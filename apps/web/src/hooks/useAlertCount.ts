import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

const POLL_INTERVAL_MS = 5 * 60 * 1000

export function useAlertCount() {
  const getToken = useToken()
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        const data = await apiFetch<{ count: number }>('/documents/alerts/count', token)

        if (!cancelled) {
          setCount(data.count)
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

  return { count, loading, error }
}
