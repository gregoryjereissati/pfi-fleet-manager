import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Wrench } from 'lucide-react'
import { MaintenanceStatus, MaintenanceType } from '@fleet-manager/shared'
import { useMaintenances } from '@/hooks/useMaintenances'
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

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass = 'lg-input w-full'

function getStatusClasses(status: MaintenanceStatus) {
  if (status === MaintenanceStatus.DONE) return 'lg-tag-ok'
  if (status === MaintenanceStatus.OVERDUE) return 'lg-tag-danger'
  if (status === MaintenanceStatus.CANCELLED) return 'lg-tag-muted'
  return 'lg-tag-warn'
}

export function MaintenanceList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const toast = useToast()
  const { currentUser } = useCurrentUser()
  const { vehicles } = useVehicleOptions()
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
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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
          toast.error((err as Error).message)
        }
      },
    })
  }

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

  /**
   * Cancelar preserva o registro, com o motivo e quem cancelou — ao contrário
   * de excluir, que o faz desaparecer.
   */
  function handleCancel(id: string, reason: string) {
    setCancellingId(null)
    void executar((token) =>
      apiFetch(`/maintenances/${id}/cancel`, token, {
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
          apiFetch(`/maintenances/${id}/uncancel`, token, { method: 'PATCH' }),
        )
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
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('maintenances.title')}
        subtitle={t('maintenances.subtitle')}
        actions={
          <Link to="/maintenances/new" className="lg-btn-accent">
            <Plus size={14} strokeWidth={2} /> {t('maintenances.new')}
          </Link>
        }
      />

      <div className="lg-inner grid gap-3 p-4 md:grid-cols-3">
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
                  <th>{t('maintenances.columns.vehicle')}</th>
                  <th>{t('maintenances.columns.type')}</th>
                  <th>{t('maintenances.columns.status')}</th>
                  <th>{t('maintenances.columns.scheduledDate')}</th>
                  <th>{t('maintenances.columns.completedDate')}</th>
                  <th>{t('maintenances.columns.description')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<Wrench size={20} strokeWidth={1.5} />}
                        message={t('maintenances.empty')}
                        action={
                          <Link to="/maintenances/new" className="lg-btn-accent">
                            <Plus size={14} strokeWidth={2} />
                            {t('maintenances.new')}
                          </Link>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  maintenances.map((maintenance) => (
                    <tr key={maintenance.id}>
                      <td className="font-medium text-white">
                        {maintenance.vehicle.plate}
                        <div className="text-xs font-normal text-neutral-500">
                          {maintenance.vehicle.brand} {maintenance.vehicle.model}
                        </div>
                      </td>
                      <td>{t(`maintenances.types.${maintenance.type}`)}</td>
                      <td>
                        <span className={`lg-tag ${getStatusClasses(maintenance.status)}`}>
                          {t(`maintenances.statuses.${maintenance.status}`)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="whitespace-nowrap">
                        {maintenance.completedDate
                          ? new Date(maintenance.completedDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="text-neutral-400">
                        {maintenance.description}
                        {maintenance.cancelReason && (
                          <div className="text-xs text-orange-400/80">
                            {maintenance.cancelReason}
                          </div>
                        )}
                        {!maintenance.createdById && (
                          <div className="text-xs text-neutral-600">
                            {t('entries.authorUnknown')}
                          </div>
                        )}
                      </td>
                      <td>
                        {maintenance.status === MaintenanceStatus.CANCELLED ? (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleRestore(maintenance.id)}
                              className="lg-action"
                            >
                              {t('actions.restoreEntry')}
                            </button>
                            <RowActions
                              actions={[
                                canDelete && {
                                  label: t('actions.remove'),
                                  onSelect: () => handleDelete(maintenance.id),
                                  tone: 'danger',
                                },
                              ]}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              to={`/maintenances/${maintenance.id}/edit`}
                              className="lg-action"
                            >
                              {t('actions.edit')}
                            </Link>
                            <RowActions
                              actions={[
                                maintenance.status !== MaintenanceStatus.DONE && {
                                  label: t('maintenances.actions.complete'),
                                  onSelect: () =>
                                    handleStatusChange(maintenance.id, MaintenanceStatus.DONE),
                                },
                                maintenance.status === MaintenanceStatus.DONE && {
                                  label: t('maintenances.actions.reopen'),
                                  onSelect: () =>
                                    handleStatusChange(
                                      maintenance.id,
                                      MaintenanceStatus.SCHEDULED,
                                    ),
                                  tone: 'muted',
                                },
                                {
                                  label: t('actions.cancelEntry'),
                                  onSelect: () => setCancellingId(maintenance.id),
                                  tone: 'warn',
                                },
                                canDelete && {
                                  label: t('actions.remove'),
                                  onSelect: () => handleDelete(maintenance.id),
                                  tone: 'danger',
                                },
                              ]}
                            />
                          </div>
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
