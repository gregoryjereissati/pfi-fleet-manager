import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DriverStatus } from '@fleet-manager/shared'
import { useDrivers } from '@/hooks/useDrivers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { formatCpf, formatDate } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingState, PageHeader, SearchField } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'
import { useToast } from '@/components/ledger/Toast'
import { Plus, Users } from 'lucide-react'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass = 'lg-input w-full'

/** Sem validade cadastrada não há o que vencer — e tampouco o que alertar. */
function isExpiringSoon(expiryDate: string | null) {
  if (!expiryDate) return false

  const now = Date.now()
  const expiry = new Date(expiryDate).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return expiry - now <= thirtyDays
}

export function DriverList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  const canMutate = canManageFleet(currentUser?.role)
  // A consulta parte quando quem digita faz uma pausa, não a cada tecla.
  const debouncedSearch = useDebouncedValue(search)
  const { drivers, loading, error, reload } = useDrivers({
    search: debouncedSearch || undefined,
    status: status || undefined,
  })

  function closeDialog() {
    setDialog(null)
  }

  function handleDeactivate(id: string) {
    setDialog({
      title: t('actions.deactivate'),
      message: t('drivers.deactivateConfirm'),
      confirmLabel: t('actions.deactivate'),
      variant: 'warning',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/drivers/${id}`, token, { method: 'DELETE' })
          reload()
        } catch (err) {
          toast.error((err as Error).message)
        }
      },
    })
  }

  function handlePermanentDelete(id: string) {
    setDialog({
      title: t('actions.delete'),
      message: t('drivers.deleteConfirm'),
      confirmLabel: t('actions.delete'),
      variant: 'danger',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/drivers/${id}/permanent`, token, { method: 'DELETE' })
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
        title={t('drivers.title')}
        subtitle={t('drivers.subtitle')}
        actions={
          canMutate && (
            <Link to="/drivers/new" className="lg-btn-accent">
              <Plus size={14} strokeWidth={2} /> {t('drivers.new')}
            </Link>
          )
        }
      />

      <div className="lg-inner grid gap-3 p-4 md:grid-cols-2">
        <SearchField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('drivers.searchPlaceholder')}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('filters.allStatuses')}</option>
          <option value={DriverStatus.ACTIVE}>{t('status.active')}</option>
          <option value={DriverStatus.INACTIVE}>{t('status.inactive')}</option>
        </select>
      </div>

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
                  <th>{t('drivers.columns.name')}</th>
                  <th>{t('drivers.columns.cpf')}</th>
                  <th>{t('drivers.columns.cnh')}</th>
                  <th>{t('drivers.columns.cnhExpiry')}</th>
                  <th>{t('drivers.columns.status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<Users size={20} strokeWidth={1.5} />}
                        message={t('drivers.empty')}
                        action={
                          canMutate && (
                            <Link to="/drivers/new" className="lg-btn-accent">
                              <Plus size={14} strokeWidth={2} />
                              {t('drivers.new')}
                            </Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => {
                    const expiring = isExpiringSoon(driver.cnhExpiry)

                    return (
                      <tr key={driver.id}>
                        <td className="font-medium text-white">
                          {driver.name}
                          {!driver.linkedToUser && (
                            <span
                              className="lg-tag lg-tag-warn ml-2"
                              title={t('drivers.noAccountHint')}
                            >
                              {t('drivers.noAccount')}
                            </span>
                          )}
                        </td>
                        <td className="tabular-nums">{formatCpf(driver.cpf)}</td>
                        <td className="tabular-nums">{driver.cnh ?? '—'}</td>
                        <td>
                          {driver.cnhExpiry ? (
                            <span
                              className={
                                expiring
                                  ? 'font-medium tabular-nums text-rose-400'
                                  : 'tabular-nums text-slate-300'
                              }
                            >
                              {formatDate(driver.cnhExpiry)}
                            </span>
                          ) : (
                            <span className="text-neutral-500">{t('drivers.cnhMissing')}</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`lg-tag ${
                              driver.status === DriverStatus.ACTIVE ? 'lg-tag-ok' : 'lg-tag-muted'
                            }`}
                          >
                            {driver.status === DriverStatus.ACTIVE
                              ? t('status.active')
                              : t('status.inactive')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <Link to={`/drivers/${driver.id}`} className="lg-action">
                              {t('drivers.viewDetail')}
                            </Link>
                            <RowActions
                              actions={[
                                canMutate && {
                                  label: t('actions.edit'),
                                  to: `/drivers/${driver.id}/edit`,
                                  tone: 'muted',
                                },
                                canMutate &&
                                  driver.status === DriverStatus.ACTIVE && {
                                    label: t('actions.deactivate'),
                                    onSelect: () => handleDeactivate(driver.id),
                                    tone: 'warn',
                                  },
                                canMutate && {
                                  label: t('actions.delete'),
                                  onSelect: () => handlePermanentDelete(driver.id),
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
