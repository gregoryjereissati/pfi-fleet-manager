import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { DriverStatus } from '@fleet-manager/shared'
import { useVehicle } from '@/hooks/useVehicle'
import { useDrivers } from '@/hooks/useDrivers'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

export function VehicleDrivers() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const getToken = useToken()
  const { vehicle, loading, error, reload } = useVehicle(id)
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    drivers,
    loading: driversLoading,
    error: driversError,
    reload: reloadDrivers,
  } = useDrivers({
    name: search || undefined,
    status: DriverStatus.ACTIVE,
  })

  const linkedIds = new Set(vehicle?.drivers.map((driver) => driver.id) ?? [])
  const availableDrivers = drivers.filter((driver) => !linkedIds.has(driver.id))

  async function handleLink(driverId: string) {
    if (!id) return

    try {
      setActionLoading(true)
      setActionError(null)

      const token = await getToken()
      await apiFetch(`/vehicles/${id}/drivers`, token, {
        method: 'POST',
        body: JSON.stringify({ driverIds: [driverId] }),
      })

      reload()
      reloadDrivers()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnlink(driverId: string) {
    if (!id) return

    try {
      setActionLoading(true)
      setActionError(null)

      const token = await getToken()
      await apiFetch(`/vehicles/${id}/drivers/${driverId}`, token, {
        method: 'DELETE',
      })

      reload()
      reloadDrivers()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActionLoading(false)
    }
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
          {t('vehicles.linkedDrivers')} ({vehicle.drivers.length})
        </h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {vehicle.drivers.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="font-medium text-white">{driver.name}</span>
                  <span className="text-white/40"> • CNH {driver.cnh}</span>
                </span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUnlink(driver.id)}
                  className="text-red-400 hover:underline disabled:opacity-50"
                >
                  {t('actions.remove')}
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
                  <span className="text-white/40"> • {driver.cpf}</span>
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
    </div>
  )
}
