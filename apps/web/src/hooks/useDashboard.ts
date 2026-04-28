import { useEffect, useState } from 'react'
import { ExpenseType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface DashboardSummary {
  totalVehicles: number
  activeVehicles: number
  totalDrivers: number
  activeDrivers: number
  expensesThisMonth: number
  pendingMaintenances: number
  expiringDocuments: number
}

interface MonthlyExpense {
  month: string
  total: number
}

interface TypeExpense {
  type: ExpenseType
  total: number
}

export interface DashboardData {
  summary: DashboardSummary
  expensesByMonth: MonthlyExpense[]
  expensesByType: TypeExpense[]
}

export function useDashboard() {
  const getToken = useToken()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const token = await getToken()
        const result = await apiFetch<DashboardData>('/dashboard/indicators', token)

        if (!cancelled) {
          setData(result)
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

  return { data, loading, error }
}
