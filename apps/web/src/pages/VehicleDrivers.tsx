import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { DriverStatus } from '@fleet-manager/shared'
import { useVehicle } from '@/hooks/useVehicle'
import { useDrivers } from '@/hooks/useDrivers'
import { useAssignments } from '@/hooks/useAssignments'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

export function VehicleDrivers() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const getToken = useToken()

  const { vehicle, loading, error, reload } = useVehicle(id)
  const {
    active,
    ended,
    loading: assignmentsLoading,
    reload: reloadAssignments,
  } = useAssignments(id ? `/vehicles/${id}/drivers` : null)

  const [search, setSearch] = useState('')
  // A consulta só parte quando quem digita faz uma pausa.
  const debouncedSearch = useDebouncedValue(search)

  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    drivers,
    loading: driversLoading,
    error: driversError,
  } = useDrivers({
    search: debouncedSearch || undefined,
    status: DriverStatus.ACTIVE,
  })

  const linkedIds = new Set(active.map((assignment) => assignment.driverId))
  const availableDrivers = drivers.filter((driver) => !linkedIds.has(driver.id))

  async function run(action: () => Promise<unknown>) {
    try {
      setActionLoading(true)
      setActionError(null)
      await action()
      reload()
      reloadAssignments()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  function handleLink(driverId: string) {
    if (!id) return

    void run(async () => {
      const token = await getToken()
      return apiFetch(`/vehicles/${id}/drivers`, token, {
        method: 'POST',
        body: JSON.stringify({ driverIds: [driverId] }),
      })
    })
  }

  function handleUnlink(driverId: string) {
    if (!id) return

    void run(async () => {
      const token = await getToken()
      return apiFetch(`/vehicles/${id}/drivers/${driverId}`, token, {
        method: 'DELETE',
        body: JSON.stringify({}),
      })
    })
  }

  if (loading) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (!vehicle) {
    return <p className="text-sm text-white/40">{t('common.notFound')}</p>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link to={`/vehicles/${vehicle.id}`} className="text-sm text-gold hover:underline">
          {t('actions.backToVehicle')}
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('vehicles.manageDriversFor', { plate: vehicle.plate })}
          </h1>
          <p className="text-sm text-white/40">
            {vehicle.brand} {vehicle.model} • {vehicle.year}
          </p>
        </div>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/50">
          {t('vehicles.linkedDrivers')} ({active.length})
        </h2>

        {assignmentsLoading ? (
          <p className="text-sm text-white/40">{t('common.loading')}</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {active.map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-white">{assignment.driverName}</span>
                  <span className="block text-xs text-white/40">
                    {t('vehicles.assignmentSince', {
                      date: formatDate(assignment.startDate),
                    })}
                    {assignment.startEstimated && (
                      <span className="ml-1 text-amber-400/80">
                        {t('vehicles.assignmentEstimated')}
                      </span>
                    )}
                  </span>
                </span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUnlink(assignment.driverId)}
                  className="shrink-0 text-red-400 hover:underline disabled:opacity-50"
                >
                  {t('actions.endAssignment')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/50">{t('vehicles.addDriver')}</h2>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('vehicles.driverSearchPlaceholder')}
          className={`mb-4 ${inputClass}`}
        />

        {driversLoading ? (
          <p className="text-sm text-white/40">{t('common.loading')}</p>
        ) : driversError ? (
          <p className="text-sm text-red-400">{driversError}</p>
        ) : availableDrivers.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noAvailableDrivers')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {availableDrivers.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="font-medium text-white">{driver.name}</span>
                  {driver.cpf && <span className="text-white/40"> • {driver.cpf}</span>}
                </span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleLink(driver.id)}
                  className="text-gold hover:underline disabled:opacity-50"
                >
                  {t('actions.link')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        Desvincular encerra a relação; não apaga que ela existiu. Sem este
        bloco, a informação estaria no banco e invisível na tela.
      */}
      {ended.length > 0 && (
        <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/50">
            {t('vehicles.assignmentHistory')}
          </h2>
          <ul className="divide-y divide-white/[0.05]">
            {ended.map((assignment) => (
              <li key={assignment.id} className="py-3 text-sm">
                <span className="font-medium text-white/70">{assignment.driverName}</span>
                <span className="block text-xs text-white/35">
                  {t('vehicles.assignmentPeriod', {
                    start: formatDate(assignment.startDate),
                    end: formatDate(assignment.endDate as string),
                  })}
                  {assignment.startEstimated && (
                    <span className="ml-1 text-amber-400/70">
                      {t('vehicles.assignmentEstimated')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
