import { useCallback, useEffect, useState } from 'react'
import type { CompanySummaryDto, CreateCompanyDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

/**
 * Empresas da plataforma.
 *
 * Só o super administrador alcança estes dados. Para os demais perfis a API
 * responde 403, e este hook não chega a ser montado: as telas que o usam ficam
 * fora do alcance deles.
 */
export function useCompanies() {
  const getToken = useToken()
  const [companies, setCompanies] = useState<CompanySummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const token = await getToken()
      setCompanies(await apiFetch<CompanySummaryDto[]>('/companies', token))
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(
    async (dados: CreateCompanyDto) => {
      const token = await getToken()
      await apiFetch('/companies', token, { method: 'POST', body: JSON.stringify(dados) })
      await load()
    },
    [getToken, load],
  )

  const setStatus = useCallback(
    async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
      const token = await getToken()
      await apiFetch(`/companies/${id}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await load()
    },
    [getToken, load],
  )

  return { companies, loading, error, reload: load, create, setStatus }
}
