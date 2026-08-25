import { useEffect, useState } from 'react'
import { ExpenseType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface DashboardSummary {
  totalVehicles: number
  activeVehicles: number
  totalDrivers: number
  activeDrivers: number
  totalExpenses: number
  averageExpense: number
  expenseCount: number
  pendingMaintenances: number
  overdueMaintenances: number
  expiringDocuments: number
  expiredDocuments: number
}

interface MonthlyExpense {
  month: string
  total: number
}

interface TypeExpense {
  type: ExpenseType
  total: number
}

interface VehicleExpense {
  vehicleId: string
  plate: string
  label: string
  total: number
}

interface RecentExpense {
  id: string
  type: ExpenseType
  amount: number
  date: string
  description: string | null
  vehiclePlate: string
  vehicleLabel: string
}

export interface DashboardFilters {
  vehicleId?: string
  type?: ExpenseType | ''
  startDate?: string
  endDate?: string
}

export interface DashboardData {
  summary: DashboardSummary
  expensesByMonth: MonthlyExpense[]
  expensesByType: TypeExpense[]
  expensesByVehicle: VehicleExpense[]
  recentExpenses: RecentExpense[]
}

export function useDashboard(filters: DashboardFilters = {}) {
  const getToken = useToken()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const token = await getToken()
        const params = new URLSearchParams()
        const queryFilters = JSON.parse(filterKey) as DashboardFilters

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const result = await apiFetch<DashboardData>(
          `/dashboard/indicators${queryString ? `?${queryString}` : ''}`,
          token,
        )

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
  }, [filterKey, getToken])

  return { data, loading, error }
}
