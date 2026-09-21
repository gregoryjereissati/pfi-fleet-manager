import { useCallback, useEffect, useState } from 'react'
import type { AssignmentDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

/**
 * Histórico de vínculos entre motorista e veículo.
 *
 * Devolve vigentes e encerrados: desvincular grava a data de fim, não apaga a
 * linha, e é isso que permite responder quem estava vinculado em uma data
 * passada — dentro do período que o sistema chegou a gravar.
 */
export function useAssignments(path: string | null) {
  const getToken = useToken()
  const [assignments, setAssignments] = useState<AssignmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!path) {
      setAssignments([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const data = await apiFetch<AssignmentDto[]>(path as string, token)

        if (!cancelled) setAssignments(data)
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
  }, [getToken, path, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return {
    assignments,
    /** Vínculos sem data de fim. */
    active: assignments.filter((assignment) => !assignment.endDate),
    /** Vínculos encerrados, do mais recente ao mais antigo. */
    ended: assignments.filter((assignment) => assignment.endDate),
    loading,
    error,
    reload,
  }
}
