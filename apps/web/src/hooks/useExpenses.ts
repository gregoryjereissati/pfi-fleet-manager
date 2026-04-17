import { useEffect, useState } from 'react'
import { ExpenseType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface ExpenseVehicleSummary {
  id: string
  plate: string
  brand: string
  model: string
}

export interface ExpenseItem {
  id: string
  vehicleId: string
  type: ExpenseType
  amount: string
  date: string
  description: string | null
  createdAt: string
  vehicle: ExpenseVehicleSummary
}

export interface ExpenseFilters {
  vehicleId?: string
  type?: ExpenseType | ''
  startDate?: string
  endDate?: string
  orderBy?: 'date' | 'amount' | 'createdAt'
  order?: 'asc' | 'desc'
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const getToken = useToken()
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
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
        const queryFilters = JSON.parse(filterKey) as ExpenseFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<ExpenseItem[]>(
          `/expenses${queryString ? `?${queryString}` : ''}`,
          token,
        )

        if (!cancelled) setExpenses(data)
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
    expenses,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
