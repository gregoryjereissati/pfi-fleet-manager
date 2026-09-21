import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EntryStatus, ExpenseType } from '@fleet-manager/shared'
import { useExpenses } from '@/hooks/useExpenses'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CancelEntryDialog } from '@/components/CancelEntryDialog'
import { formatDate } from '@/lib/utils'

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
  const { vehicles } = useVehicleOptions()
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<ExpenseType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCancelled, setShowCancelled] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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
    // Sem o filtro, a API devolve ativos e cancelados; os cancelados vêm
    // marcados e o usuário decide se quer vê-los.
    status: showCancelled ? '' : EntryStatus.ACTIVE,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  async function executar(acao: (token: string) => Promise<unknown>) {
    try {
      setActionError(null)
      const token = await getToken()
      await acao(token)
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  function handleCancel(id: string, reason: string) {
    setCancellingId(null)
    void executar((token) =>
      apiFetch(`/expenses/${id}/cancel`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
    )
  }

  function handleRestore(id: string) {
    setDialog({
      title: t('actions.restoreEntry'),
      message: t('entries.restoreConfirm'),
      confirmLabel: t('actions.restoreEntry'),
      variant: 'default',
      onConfirm: () => {
        closeDialog()
        void executar((token) =>
          apiFetch(`/expenses/${id}/uncancel`, token, { method: 'PATCH' }),
        )
      },
    })
  }

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
        <label className="flex items-center gap-2 text-sm text-white/55">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(event) => setShowCancelled(event.target.checked)}
          />
          {t('entries.showCancelled')}
        </label>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

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
                  expenses.map((expense) => {
                    const cancelled = expense.status === EntryStatus.CANCELLED

                    return (
                      <tr
                        key={expense.id}
                        className={`hover:bg-white/[0.025] ${cancelled ? 'opacity-55' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {expense.vehicle.plate}
                          <div className="text-xs text-white/40">
                            {expense.vehicle.brand} {expense.vehicle.model}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {t(`expenses.types.${expense.type}`)}
                          {cancelled && (
                            <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                              {t('entries.cancelled')}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-white/70 ${cancelled ? 'line-through' : ''}`}
                        >
                          {formatMoney(expense.amount)}
                        </td>
                        <td className="px-4 py-3 text-white/70">{formatDate(expense.date)}</td>
                        <td className="px-4 py-3 text-white/50">
                          {expense.description || '-'}
                          {cancelled && expense.cancelReason && (
                            <div className="text-xs text-amber-400/70">
                              {expense.cancelReason}
                            </div>
                          )}
                          {!expense.createdById && (
                            <div className="text-xs text-white/25">
                              {t('entries.authorUnknown')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            {cancelled ? (
                              <button
                                onClick={() => handleRestore(expense.id)}
                                className="text-gold hover:underline"
                              >
                                {t('actions.restoreEntry')}
                              </button>
                            ) : (
                              <>
                                <Link
                                  to={`/expenses/${expense.id}/edit`}
                                  className="text-white/55 hover:underline"
                                >
                                  {t('actions.edit')}
                                </Link>
                                <button
                                  onClick={() => setCancellingId(expense.id)}
                                  className="text-amber-400 hover:underline"
                                >
                                  {t('actions.cancelEntry')}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-400 hover:underline"
                              >
                                {t('actions.remove')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cancellingId && (
        <CancelEntryDialog
          onConfirm={(reason) => handleCancel(cancellingId, reason)}
          onClose={() => setCancellingId(null)}
        />
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
