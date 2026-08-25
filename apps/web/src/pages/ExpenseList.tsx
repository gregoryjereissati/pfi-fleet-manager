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
import { ConfirmDialog } from '@/components/ConfirmDialog'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass =
  'rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

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
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  const canDelete = canManageFleet(currentUser?.role)

  const { expenses, loading, error, reload } = useExpenses({
    vehicleId: vehicleId || undefined,
    type,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  function closeDialog() {
    setDialog(null)
  }

  function handleDelete(id: string) {
    setDialog({
      title: t('actions.delete'),
      message: t('expenses.deleteConfirm'),
      confirmLabel: t('actions.delete'),
      variant: 'danger',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/expenses/${id}`, token, { method: 'DELETE' })
          reload()
        } catch (err) {
          window.alert((err as Error).message)
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('expenses.title')}</h1>
          <p className="text-sm text-white/40">{t('expenses.subtitle')}</p>
        </div>
        <Link
          to="/expenses/new"
          className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover"
        >
          {t('expenses.new')}
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-fleet-card p-4 md:grid-cols-4">
        <select
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          className={inputClass}
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
          className={inputClass}
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
          className={inputClass}
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className={inputClass}
        />
      </div>

      {loading ? (
        <p className="text-sm text-white/40">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-fleet-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-fleet-darker">
                <tr className="border-b border-white/[0.07] text-left text-white/40">
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.vehicle')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.amount')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('expenses.columns.description')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                      {t('expenses.empty')}
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-3 font-medium text-white">
                        {expense.vehicle.plate}
                        <div className="text-xs text-white/40">
                          {expense.vehicle.brand} {expense.vehicle.model}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {t(`expenses.types.${expense.type}`)}
                      </td>
                      <td className="px-4 py-3 text-white/70">{formatMoney(expense.amount)}</td>
                      <td className="px-4 py-3 text-white/70">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-white/50">{expense.description || '-'}</td>
                      <td className="px-4 py-3">
                        {canDelete ? (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-400 hover:underline"
                          >
                            {t('actions.remove')}
                          </button>
                        ) : (
                          <span className="text-white/25">-</span>
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

      {dialog && (
        <ConfirmDialog
          isOpen
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={t('actions.cancel')}
          variant={dialog.variant}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  )
}
