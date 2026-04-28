import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExpenseType } from '@fleet-manager/shared'
import { useExpenses } from '@/hooks/useExpenses'
import { useVehicles } from '@/hooks/useVehicles'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'

function formatMoney(value: string) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function ExpenseList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
  const { vehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<ExpenseType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canDelete = canManageFleet(currentUser?.role)

  const { expenses, loading, error, reload } = useExpenses({
    vehicleId: vehicleId || undefined,
    type,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  async function handleDelete(id: string) {
    if (!window.confirm(t('expenses.deleteConfirm'))) return

    try {
      const token = await getToken()
      await apiFetch(`/expenses/${id}`, token, { method: 'DELETE' })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('expenses.title')}</h1>
          <p className="text-sm text-gray-500">{t('expenses.subtitle')}</p>
        </div>
        <Link
          to="/expenses/new"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('expenses.new')}
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <select
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('expenses.filters.allVehicles')}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plate} • {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ExpenseType | '')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('expenses.filters.allTypes')}</option>
          {Object.values(ExpenseType).map((expenseType) => (
            <option key={expenseType} value={expenseType}>
              {t(`expenses.types.${expenseType}`)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.vehicle')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.amount')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.description')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {t('expenses.empty')}
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {expense.vehicle.plate}
                        <div className="text-xs text-gray-500">
                          {expense.vehicle.brand} {expense.vehicle.model}
                        </div>
                      </td>
                      <td className="px-4 py-3">{t(`expenses.types.${expense.type}`)}</td>
                      <td className="px-4 py-3">{formatMoney(expense.amount)}</td>
                      <td className="px-4 py-3">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{expense.description || '-'}</td>
                      <td className="px-4 py-3">
                        {canDelete ? (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:underline"
                          >
                            {t('actions.remove')}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
