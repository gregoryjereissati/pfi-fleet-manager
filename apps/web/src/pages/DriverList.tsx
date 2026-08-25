import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DriverStatus } from '@fleet-manager/shared'
import { useDrivers } from '@/hooks/useDrivers'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass =
  'rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

function formatCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function isExpiringSoon(expiryDate: string) {
  const now = Date.now()
  const expiry = new Date(expiryDate).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return expiry - now <= thirtyDays
}

export function DriverList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
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
  const { drivers, loading, error, reload } = useDrivers({
    name: search || undefined,
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
          window.alert((err as Error).message)
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
          window.alert((err as Error).message)
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('drivers.title')}</h1>
          <p className="text-sm text-white/40">{t('drivers.subtitle')}</p>
        </div>
        {canMutate && (
          <Link
            to="/drivers/new"
            className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover"
          >
            {t('drivers.new')}
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-fleet-card p-4 md:grid-cols-2">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('drivers.searchPlaceholder')}
          className={inputClass}
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
        <p className="text-sm text-white/40">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-fleet-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-fleet-darker">
                <tr className="border-b border-white/[0.07] text-left text-white/40">
                  <th className="px-4 py-3 font-medium">{t('drivers.columns.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('drivers.columns.cpf')}</th>
                  <th className="px-4 py-3 font-medium">{t('drivers.columns.cnh')}</th>
                  <th className="px-4 py-3 font-medium">{t('drivers.columns.cnhExpiry')}</th>
                  <th className="px-4 py-3 font-medium">{t('drivers.columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                      {t('drivers.empty')}
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => {
                    const expiring = isExpiringSoon(driver.cnhExpiry)

                    return (
                      <tr key={driver.id} className="hover:bg-white/[0.025]">
                        <td className="px-4 py-3 font-medium text-white">{driver.name}</td>
                        <td className="px-4 py-3 text-white/70">{formatCpf(driver.cpf)}</td>
                        <td className="px-4 py-3 text-white/70">{driver.cnh}</td>
                        <td className="px-4 py-3">
                          <span className={expiring ? 'font-medium text-red-400' : 'text-white/70'}>
                            {new Date(driver.cnhExpiry).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              driver.status === DriverStatus.ACTIVE
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {driver.status === DriverStatus.ACTIVE
                              ? t('status.active')
                              : t('status.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              to={`/drivers/${driver.id}`}
                              className="text-gold hover:underline"
                            >
                              {t('drivers.viewDetail')}
                            </Link>
                            {canMutate && (
                              <>
                                <Link
                                  to={`/drivers/${driver.id}/edit`}
                                  className="text-white/55 hover:underline"
                                >
                                  {t('actions.edit')}
                                </Link>
                                {driver.status === DriverStatus.ACTIVE && (
                                  <button
                                    onClick={() => handleDeactivate(driver.id)}
                                    className="text-amber-400 hover:underline"
                                  >
                                    {t('actions.deactivate')}
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePermanentDelete(driver.id)}
                                  className="text-red-400 hover:underline"
                                >
                                  {t('actions.delete')}
                                </button>
                              </>
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
