import { useEffect, useState } from 'react'
import type { UserDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export function useCurrentUser() {
  const getToken = useToken()
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const token = await getToken()
        const data = await apiFetch<UserDto>('/users/me', token)

        if (!cancelled) {
          setCurrentUser(data)
          setError(null)
        }
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

  return { currentUser, loading, error }
}
