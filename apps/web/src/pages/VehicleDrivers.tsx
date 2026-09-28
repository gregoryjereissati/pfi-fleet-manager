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
import { LoadingState, PageHeader } from '@/components/ledger/Ui'
import { ArrowLeft } from 'lucide-react'

const inputClass = 'lg-input w-full'
const sectionClass = 'lg-inner p-6'
const sectionTitleClass = 'mb-4 text-base font-semibold tracking-tight text-white'

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
    return <LoadingState label={t('common.loading')} />
  }

  if (error) {
    return <p className="lg-alert lg-alert-error">{error}</p>
  }

  if (!vehicle) {
    return <p className="text-sm text-neutral-500">{t('common.notFound')}</p>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-4">
        <Link to={`/vehicles/${vehicle.id}`} className="lg-link">
          <ArrowLeft size={14} />
          {t('actions.backToVehicle')}
        </Link>
        <PageHeader
          title={t('vehicles.manageDriversFor', { plate: vehicle.plate })}
          subtitle={
            <>
              {vehicle.brand} {vehicle.model} • {vehicle.year}
            </>
          }
        />
      </div>

      {actionError && <p className="lg-alert lg-alert-error">{actionError}</p>}

      <section className={`${sectionClass} lg-reveal`}>
        <h2 className={sectionTitleClass}>
          {t('vehicles.linkedDrivers')} ({active.length})
        </h2>

        {assignmentsLoading ? (
          <LoadingState label={t('common.loading')} />
        ) : active.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="space-y-2">
            {active.map((assignment) => (
              <li
                key={assignment.id}
                className="lg-row flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-white">{assignment.driverName}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {t('vehicles.assignmentSince', {
                      date: formatDate(assignment.startDate),
                    })}
                    {assignment.startEstimated && (
                      <span className="ml-1 text-yellow-400/80">
                        {t('vehicles.assignmentEstimated')}
                      </span>
                    )}
                  </span>
                </span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUnlink(assignment.driverId)}
                  className="lg-action lg-action-danger shrink-0"
                >
                  {t('actions.endAssignment')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('vehicles.addDriver')}</h2>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('vehicles.driverSearchPlaceholder')}
          className={`mb-4 ${inputClass}`}
        />

        {driversLoading ? (
          <LoadingState label={t('common.loading')} />
        ) : driversError ? (
          <p className="lg-alert lg-alert-error">{driversError}</p>
        ) : availableDrivers.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.noAvailableDrivers')}</p>
        ) : (
          <ul className="space-y-2">
            {availableDrivers.map((driver) => (
              <li
                key={driver.id}
                className="lg-row flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium text-white">{driver.name}</span>
                  {driver.cpf && <span className="text-neutral-500"> • {driver.cpf}</span>}
                </span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleLink(driver.id)}
                  className="lg-action shrink-0"
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
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('vehicles.assignmentHistory')}</h2>
          <ul className="space-y-2">
            {ended.map((assignment) => (
              <li key={assignment.id} className="lg-row px-4 py-3 text-sm">
                <span className="font-medium text-slate-300">{assignment.driverName}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {t('vehicles.assignmentPeriod', {
                    start: formatDate(assignment.startDate),
                    end: formatDate(assignment.endDate as string),
                  })}
                  {assignment.startEstimated && (
                    <span className="ml-1 text-yellow-400/70">
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
