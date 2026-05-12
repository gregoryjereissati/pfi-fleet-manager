import { useCallback, useEffect, useState } from 'react'
import {
  type UpdateUserRoleDto,
  type UpdateUserStatusDto,
  type UserDto,
  UserRole,
  UserStatus,
} from '@fleet-manager/shared'
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

  const updateStatus = useCallback(
    async (id: string, status: UserStatus, role?: UserRole) => {
      setSavingId(id)
      try {
        const token = await getToken()
        const payload: UpdateUserStatusDto = { status, ...(role && { role }) }
        await apiFetch(`/users/${id}/status`, token, {
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

  const deleteUser = useCallback(
    async (id: string) => {
      setSavingId(id)
      try {
        const token = await getToken()
        await apiFetch(`/users/${id}`, token, { method: 'DELETE' })
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

  const pendingCount = users.filter((u) => u.status === UserStatus.PENDING).length

  return {
    users,
    loading,
    error,
    savingId,
    updateRole,
    updateStatus,
    deleteUser,
    pendingCount,
    roles: Object.values(UserRole),
  }
}
