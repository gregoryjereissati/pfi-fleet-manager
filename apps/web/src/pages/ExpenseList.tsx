import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Receipt } from 'lucide-react'
import { EntryStatus, ExpenseType } from '@fleet-manager/shared'
import { useExpenses } from '@/hooks/useExpenses'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CancelEntryDialog } from '@/components/CancelEntryDialog'
import { EmptyState, LoadingState, PageHeader } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'
import { useToast } from '@/components/ledger/Toast'
import { formatDate } from '@/lib/utils'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass = 'lg-input w-full'

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
  const toast = useToast()
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
          toast.error((err as Error).message)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        actions={
          <Link to="/expenses/new" className="lg-btn-accent">
            <Plus size={14} strokeWidth={2} /> {t('expenses.new')}
          </Link>
        }
      />

      <div className="lg-inner grid gap-3 p-4 md:grid-cols-4">
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
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(event) => setShowCancelled(event.target.checked)}
          />
          {t('entries.showCancelled')}
        </label>
      </div>

      {actionError && <p className="lg-alert lg-alert-error">{actionError}</p>}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        <p className="lg-alert lg-alert-error">{error}</p>
      ) : (
        <div className="lg-inner overflow-hidden">
          <div className="overflow-x-auto">
            <table className="lg-table min-w-full">
              <thead>
                <tr>
                  <th>{t('expenses.columns.vehicle')}</th>
                  <th>{t('expenses.columns.type')}</th>
                  <th>{t('expenses.columns.amount')}</th>
                  <th>{t('expenses.columns.date')}</th>
                  <th>{t('expenses.columns.description')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<Receipt size={20} strokeWidth={1.5} />}
                        message={t('expenses.empty')}
                        action={
                          <Link to="/expenses/new" className="lg-btn-accent">
                            <Plus size={14} strokeWidth={2} />
                            {t('expenses.new')}
                          </Link>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => {
                    const cancelled = expense.status === EntryStatus.CANCELLED

                    return (
                      <tr key={expense.id} className={cancelled ? 'opacity-55' : ''}>
                        <td className="font-medium text-white">
                          {expense.vehicle.plate}
                          <div className="text-xs font-normal text-neutral-500">
                            {expense.vehicle.brand} {expense.vehicle.model}
                          </div>
                        </td>
                        <td>
                          {t(`expenses.types.${expense.type}`)}
                          {cancelled && (
                            <span className="lg-tag lg-tag-muted ml-2">
                              {t('entries.cancelled')}
                            </span>
                          )}
                        </td>
                        <td
                          className={
                            cancelled
                              ? 'tabular-nums text-neutral-600 line-through'
                              : 'font-semibold tabular-nums text-white'
                          }
                        >
                          {formatMoney(expense.amount)}
                        </td>
                        <td className="whitespace-nowrap">{formatDate(expense.date)}</td>
                        <td className="text-neutral-400">
                          {expense.description || '-'}
                          {cancelled && expense.cancelReason && (
                            <div className="text-xs text-orange-400/80">
                              {expense.cancelReason}
                            </div>
                          )}
                          {!expense.createdById && (
                            <div className="text-xs text-neutral-600">
                              {t('entries.authorUnknown')}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            {cancelled ? (
                              <button
                                onClick={() => handleRestore(expense.id)}
                                className="lg-action"
                              >
                                {t('actions.restoreEntry')}
                              </button>
                            ) : (
                              <Link to={`/expenses/${expense.id}/edit`} className="lg-action">
                                {t('actions.edit')}
                              </Link>
                            )}
                            <RowActions
                              actions={[
                                !cancelled && {
                                  label: t('actions.cancelEntry'),
                                  onSelect: () => setCancellingId(expense.id),
                                  tone: 'warn',
                                },
                                canDelete && {
                                  label: t('actions.remove'),
                                  onSelect: () => handleDelete(expense.id),
                                  tone: 'danger',
                                },
                              ]}
                            />
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
