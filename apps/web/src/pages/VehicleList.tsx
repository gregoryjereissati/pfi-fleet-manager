import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useTranslation } from 'react-i18next'
import { VehicleStatus } from '@fleet-manager/shared'
import { useVehicles, type VehicleFilters } from '@/hooks/useVehicles'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'

type VehicleSortField = 'createdAt' | 'plate' | 'brand' | 'model' | 'year'

function getVehicleStatusLabel(status: VehicleStatus, t: (key: string) => string) {
  return status === VehicleStatus.ACTIVE ? t('status.active') : t('status.inactive')
}

export function VehicleList() {
  const { t } = useTranslation()
  const { user } = useAuth0()
  const getToken = useToken()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [sortField, setSortField] = useState<VehicleSortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const canMutate = canManageFleet(user)

  const filters: VehicleFilters = {
    plate: search || undefined,
    status: status || undefined,
    yearMin: yearMin || undefined,
    yearMax: yearMax || undefined,
    orderBy: sortField,
    order: sortOrder,
  }

  const { vehicles, loading, error, reload } = useVehicles(filters)

  async function handleDeactivate(id: string) {
    if (!window.confirm(t('vehicles.deactivateConfirm'))) return

    try {
      const token = await getToken()
      await apiFetch(`/vehicles/${id}`, token, { method: 'DELETE' })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('vehicles.title')}</h1>
          <p className="text-sm text-gray-500">{t('vehicles.subtitle')}</p>
        </div>
        {canMutate && (
          <Link
            to="/vehicles/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('vehicles.new')}
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('vehicles.searchPlaceholder')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          value={yearMax}
          onChange={(event) => setYearMax(event.target.value)}
          placeholder={t('vehicles.yearMax')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  {[
                    ['plate', t('vehicles.columns.plate')],
                    ['brand', t('vehicles.columns.brand')],
                    ['model', t('vehicles.columns.model')],
                    ['year', t('vehicles.columns.year')],
                  ].map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field as VehicleSortField)}
                      className="cursor-pointer px-4 py-3 font-medium select-none"
                    >
                      {label}
                      {sortField === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">{t('vehicles.columns.color')}</th>
                  <th className="px-4 py-3 font-medium">{t('vehicles.columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {t('vehicles.empty')}
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{vehicle.plate}</td>
                      <td className="px-4 py-3">{vehicle.brand}</td>
                      <td className="px-4 py-3">{vehicle.model}</td>
                      <td className="px-4 py-3">{vehicle.year}</td>
                      <td className="px-4 py-3">{vehicle.color || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            vehicle.status === VehicleStatus.ACTIVE
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getVehicleStatusLabel(vehicle.status, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link to={`/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">
                            {t('actions.view')}
                          </Link>
                          {canMutate && (
                            <>
                              <Link
                                to={`/vehicles/${vehicle.id}/edit`}
                                className="text-gray-700 hover:underline"
                              >
                                {t('actions.edit')}
                              </Link>
                              <Link
                                to={`/vehicles/${vehicle.id}/drivers`}
                                className="text-gray-700 hover:underline"
                              >
                                {t('vehicles.manageDrivers')}
                              </Link>
                              {vehicle.status === VehicleStatus.ACTIVE && (
                                <button
                                  onClick={() => handleDeactivate(vehicle.id)}
                                  className="text-red-600 hover:underline"
                                >
                                  {t('actions.deactivate')}
                                </button>
                              )}
                            </>
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
    </div>
  )
}
