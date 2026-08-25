import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared'
import { useMaintenances } from '@/hooks/useMaintenances'
import { useVehicles } from '@/hooks/useVehicles'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass =
  'rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

function getStatusClasses(status: MaintenanceStatus) {
  if (status === MaintenanceStatus.DONE) return 'bg-green-500/10 text-green-400'
  if (status === MaintenanceStatus.OVERDUE) return 'bg-red-500/10 text-red-400'
  return 'bg-amber-500/10 text-amber-400'
}

export function MaintenanceList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
  const { vehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<MaintenanceType | ''>('')
  const [status, setStatus] = useState<MaintenanceStatus | ''>('')
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  const canDelete = canManageFleet(currentUser?.role)

  const { maintenances, loading, error, reload } = useMaintenances({
    vehicleId: vehicleId || undefined,
    type,
    status,
  })

  function closeDialog() {
    setDialog(null)
  }

  function handleDelete(id: string) {
    setDialog({
      title: t('actions.delete'),
      message: t('maintenances.deleteConfirm'),
      confirmLabel: t('actions.delete'),
      variant: 'danger',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/maintenances/${id}`, token, { method: 'DELETE' })
          reload()
        } catch (err) {
          window.alert((err as Error).message)
        }
      },
    })
  }

  async function handleStatusChange(id: string, nextStatus: MaintenanceStatus) {
    try {
      const token = await getToken()
      await apiFetch(`/maintenances/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('maintenances.title')}</h1>
          <p className="text-sm text-white/40">{t('maintenances.subtitle')}</p>
        </div>
        <Link
          to="/maintenances/new"
          className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover"
        >
          {t('maintenances.new')}
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-fleet-card p-4 md:grid-cols-3">
        <select
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('maintenances.filters.allVehicles')}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plate} • {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as MaintenanceType | '')}
          className={inputClass}
        >
          <option value="">{t('maintenances.filters.allTypes')}</option>
          {Object.values(MaintenanceType).map((maintenanceType) => (
            <option key={maintenanceType} value={maintenanceType}>
              {t(`maintenances.types.${maintenanceType}`)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as MaintenanceStatus | '')}
          className={inputClass}
        >
          <option value="">{t('filters.allStatuses')}</option>
          {Object.values(MaintenanceStatus).map((maintenanceStatus) => (
            <option key={maintenanceStatus} value={maintenanceStatus}>
              {t(`maintenances.statuses.${maintenanceStatus}`)}
            </option>
          ))}
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
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.vehicle')}</th>
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.scheduledDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.completedDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('maintenances.columns.description')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/30">
                      {t('maintenances.empty')}
                    </td>
                  </tr>
                ) : (
                  maintenances.map((maintenance) => (
                    <tr key={maintenance.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-3 font-medium text-white">
                        {maintenance.vehicle.plate}
                        <div className="text-xs text-white/40">
                          {maintenance.vehicle.brand} {maintenance.vehicle.model}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {t(`maintenances.types.${maintenance.type}`)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(maintenance.status)}`}
                        >
                          {t(`maintenances.statuses.${maintenance.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {maintenance.completedDate
                          ? new Date(maintenance.completedDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-white/50">{maintenance.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {maintenance.status !== MaintenanceStatus.DONE && (
                            <button
                              onClick={() =>
                                handleStatusChange(maintenance.id, MaintenanceStatus.DONE)
                              }
                              className="text-gold hover:underline"
                            >
                              {t('maintenances.actions.complete')}
                            </button>
                          )}
                          {maintenance.status === MaintenanceStatus.DONE && (
                            <button
                              onClick={() =>
                                handleStatusChange(maintenance.id, MaintenanceStatus.SCHEDULED)
                              }
                              className="text-white/55 hover:underline"
                            >
                              {t('maintenances.actions.reopen')}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(maintenance.id)}
                              className="text-red-400 hover:underline"
                            >
                              {t('actions.remove')}
                            </button>
                          )}
                        </div>
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
