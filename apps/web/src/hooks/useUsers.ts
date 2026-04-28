import { useCallback, useEffect, useState } from 'react'
import { type UpdateUserRoleDto, type UserDto, UserRole } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export function useUsers() {
  const getToken = useToken()
  const [users, setUsers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const data = await apiFetch<UserDto[]>('/users', token)
      setUsers(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const updateRole = useCallback(
    async (id: string, role: UserRole) => {
      setSavingId(id)

      try {
        const token = await getToken()
        const payload: UpdateUserRoleDto = { role }

        await apiFetch(`/users/${id}/role`, token, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

        await load()
      } finally {
        setSavingId(null)
      }
    },
    [getToken, load],
  )

  useEffect(() => {
    void load()
  }, [load])

  return {
    users,
    loading,
    error,
    savingId,
    updateRole,
    roles: Object.values(UserRole),
  }
}
