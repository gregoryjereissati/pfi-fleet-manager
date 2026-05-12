import { useEffect, useState } from 'react'
import type { CurrentUserDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { subscribeToCurrentUserUpdates } from '@/lib/current-user'
import { useToken } from '@/hooks/useToken'

export function useCurrentUser() {
  const getToken = useToken()
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const token = await getToken()
        const data = await apiFetch<CurrentUserDto>('/users/me', token)

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

    const unsubscribe = subscribeToCurrentUserUpdates((user) => {
      setCurrentUser(user)
      setError(null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [getToken])

  return { currentUser, loading, error }
}
