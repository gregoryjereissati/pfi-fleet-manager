import { useEffect, useState } from 'react'
import type { DocumentDto, DocumentStatus, DocumentType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

export type DocumentItem = DocumentDto

export interface DocumentFilters {
  vehicleId?: string
  driverId?: string
  type?: DocumentType | ''
  status?: DocumentStatus | ''
  orderBy?: 'expiryDate' | 'createdAt'
  order?: 'asc' | 'desc'
}

export function useDocuments(filters: DocumentFilters = {}) {
  const getToken = useToken()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
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
        const queryFilters = JSON.parse(filterKey) as DocumentFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<DocumentItem[]>(
          `/documents${queryString ? `?${queryString}` : ''}`,
          token,
        )

        if (!cancelled) setDocuments(data)
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
    documents,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
