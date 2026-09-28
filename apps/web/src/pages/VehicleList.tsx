import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VehicleStatus } from '@fleet-manager/shared'
import { useVehicles, type VehicleFilters } from '@/hooks/useVehicles'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingState, PageHeader, SearchField } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'
import { useToast } from '@/components/ledger/Toast'
import { Car, Plus } from 'lucide-react'

type VehicleSortField = 'createdAt' | 'plate' | 'brand' | 'model' | 'year'
type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass = 'lg-input w-full'

function getVehicleStatusLabel(status: VehicleStatus, t: (key: string) => string) {
  return status === VehicleStatus.ACTIVE ? t('status.active') : t('status.inactive')
}

export function VehicleList() {
  const { t } = useTranslation()
  const { invalidate: invalidateVehicles } = useVehicleOptions()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [sortField, setSortField] = useState<VehicleSortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  const canMutate = canManageFleet(currentUser?.role)

  // Digitar uma placa disparava uma requisição por tecla; agora a consulta
  // espera a pausa. O campo continua respondendo de imediato ao que se digita.
  const debouncedSearch = useDebouncedValue(search)
  const debouncedYearMin = useDebouncedValue(yearMin)
  const debouncedYearMax = useDebouncedValue(yearMax)

  const filters: VehicleFilters = {
    plate: debouncedSearch || undefined,
    status: status || undefined,
    yearMin: debouncedYearMin || undefined,
    yearMax: debouncedYearMax || undefined,
    orderBy: sortField,
    order: sortOrder,
  }

  const { vehicles, loading, error, reload } = useVehicles(filters)

  function closeDialog() {
    setDialog(null)
  }

  function handleDeactivate(id: string) {
    setDialog({
      title: t('actions.deactivate'),
      message: t('vehicles.deactivateConfirm'),
      confirmLabel: t('actions.deactivate'),
      variant: 'warning',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/vehicles/${id}`, token, { method: 'DELETE' })
          reload()
          invalidateVehicles()
        } catch (err) {
          toast.error((err as Error).message)
        }
      },
    })
  }

  function handlePermanentDelete(id: string) {
    setDialog({
      title: t('actions.delete'),
      message: t('vehicles.deleteConfirm'),
      confirmLabel: t('actions.delete'),
      variant: 'danger',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/vehicles/${id}/permanent`, token, { method: 'DELETE' })
          reload()
          invalidateVehicles()
        } catch (err) {
          toast.error((err as Error).message)
        }
      },
    })
  }

  function handleReactivate(id: string) {
    setDialog({
      title: t('actions.reactivate'),
      message: t('vehicles.reactivateConfirm'),
      confirmLabel: t('actions.reactivate'),
      variant: 'default',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/vehicles/${id}`, token, {
            method: 'PUT',
            body: JSON.stringify({ status: VehicleStatus.ACTIVE }),
          })
          reload()
          invalidateVehicles()
        } catch (err) {
          toast.error((err as Error).message)
        }
      },
    })
  }

  function toggleSort(field: VehicleSortField) {
    if (field === sortField) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortOrder('asc')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('vehicles.title')}
        subtitle={t('vehicles.subtitle')}
        actions={
          canMutate && (
            <Link to="/vehicles/new" className="lg-btn-accent">
              <Plus size={14} strokeWidth={2} /> {t('vehicles.new')}
            </Link>
          )
        }
      />

      <div className="lg-inner grid gap-3 p-4 md:grid-cols-4">
        <SearchField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('vehicles.searchPlaceholder')}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('filters.allStatuses')}</option>
          <option value={VehicleStatus.ACTIVE}>{t('status.active')}</option>
          <option value={VehicleStatus.INACTIVE}>{t('status.inactive')}</option>
        </select>
        <input
          type="number"
          value={yearMin}
          onChange={(event) => setYearMin(event.target.value)}
          placeholder={t('vehicles.yearMin')}
          className={inputClass}
        />
        <input
          type="number"
          value={yearMax}
          onChange={(event) => setYearMax(event.target.value)}
          placeholder={t('vehicles.yearMax')}
          className={inputClass}
        />
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
                  {[
                    ['plate', t('vehicles.columns.plate')],
                    ['brand', t('vehicles.columns.brand')],
                    ['model', t('vehicles.columns.model')],
                    ['year', t('vehicles.columns.year')],
                  ].map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field as VehicleSortField)}
                      className="cursor-pointer select-none"
                    >
                      {label}
                      {sortField === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                  ))}
                  <th>{t('vehicles.columns.color')}</th>
                  <th>{t('vehicles.columns.status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<Car size={20} strokeWidth={1.5} />}
                        message={t('vehicles.empty')}
                        action={
                          canMutate && (
                            <Link to="/vehicles/new" className="lg-btn-accent">
                              <Plus size={14} strokeWidth={2} />
                              {t('vehicles.new')}
                            </Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="font-medium text-white">{vehicle.plate}</td>
                      <td>{vehicle.brand}</td>
                      <td>{vehicle.model}</td>
                      <td className="tabular-nums">{vehicle.year}</td>
                      <td>{vehicle.color || '-'}</td>
                      <td>
                        <span
                          className={`lg-tag ${
                            vehicle.status === VehicleStatus.ACTIVE ? 'lg-tag-ok' : 'lg-tag-muted'
                          }`}
                        >
                          {getVehicleStatusLabel(vehicle.status, t)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-3">
                          <Link to={`/vehicles/${vehicle.id}`} className="lg-action">
                            {t('actions.view')}
                          </Link>
                          <RowActions
                            actions={[
                              canMutate && {
                                label: t('actions.edit'),
                                to: `/vehicles/${vehicle.id}/edit`,
                                tone: 'muted',
                              },
                              canMutate && {
                                label: t('vehicles.manageDrivers'),
                                to: `/vehicles/${vehicle.id}/drivers`,
                                tone: 'muted',
                              },
                              canMutate &&
                                vehicle.status === VehicleStatus.ACTIVE && {
                                  label: t('actions.deactivate'),
                                  onSelect: () => handleDeactivate(vehicle.id),
                                  tone: 'warn',
                                },
                              canMutate &&
                                vehicle.status !== VehicleStatus.ACTIVE && {
                                  label: t('actions.reactivate'),
                                  onSelect: () => handleReactivate(vehicle.id),
                                  tone: 'ok',
                                },
                              canMutate && {
                                label: t('actions.delete'),
                                onSelect: () => handlePermanentDelete(vehicle.id),
                                tone: 'danger',
                              },
                            ]}
                          />
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
