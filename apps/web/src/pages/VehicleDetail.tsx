import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VehicleStatus, type DocumentStatus } from '@fleet-manager/shared'
import { useVehicle } from '@/hooks/useVehicle'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDocuments } from '@/hooks/useDocuments'
import { canManageFleet } from '@/lib/roles'
import { FilePreviewModal } from '@/components/FilePreviewModal'

function formatMoney(value: string) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-100 text-red-700'
  if (status === 'EXPIRING_SOON') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currentUser } = useCurrentUser()
  const { vehicle, loading, error } = useVehicle(id)
  const canMutate = canManageFleet(currentUser?.role)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { documents, loading: loadingDocuments } = useDocuments({
    vehicleId: id,
    orderBy: 'expiryDate',
    order: 'asc',
  })

  if (loading) {
    return <p className="text-sm text-gray-500">{t('common.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!vehicle) {
    return <p className="text-sm text-gray-500">{t('common.notFound')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link to="/vehicles" className="text-sm text-blue-600 hover:underline">
            {t('actions.backToVehicles')}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vehicle.plate}</h1>
            <p className="text-gray-500">
              {vehicle.brand} {vehicle.model} • {vehicle.year} • {vehicle.color || '-'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              vehicle.status === VehicleStatus.ACTIVE
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {vehicle.status === VehicleStatus.ACTIVE ? t('status.active') : t('status.inactive')}
          </span>
        </div>

        {canMutate && (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/vehicles/${vehicle.id}/edit`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('actions.edit')}
            </Link>
            <Link
              to={`/vehicles/${vehicle.id}/drivers`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('vehicles.manageDrivers')}
            </Link>
          </div>
        )}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {t('vehicles.linkedDrivers')} ({vehicle.drivers.length})
        </h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-sm text-gray-400">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {vehicle.drivers.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-gray-900">{driver.name}</span>
                <span className="text-gray-500">CNH {driver.cnh}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('vehicles.latestExpenses')}</h2>
        {vehicle.expenses.length === 0 ? (
          <p className="text-sm text-gray-400">{t('vehicles.noExpenses')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4">{t('vehicles.columns.type')}</th>
                  <th className="pb-2 pr-4">{t('vehicles.columns.amount')}</th>
                  <th className="pb-2">{t('vehicles.columns.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicle.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="py-2 pr-4">{t(`expenses.types.${expense.type}`)}</td>
                    <td className="py-2 pr-4">{formatMoney(expense.amount)}</td>
                    <td className="py-2">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {t('vehicles.latestMaintenances')}
        </h2>
        {vehicle.maintenances.length === 0 ? (
          <p className="text-sm text-gray-400">{t('vehicles.noMaintenances')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4">{t('vehicles.columns.type')}</th>
                  <th className="pb-2 pr-4">{t('vehicles.columns.status')}</th>
                  <th className="pb-2">{t('vehicles.columns.scheduledDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicle.maintenances.map((maintenance) => (
                  <tr key={maintenance.id}>
                    <td className="py-2 pr-4">{t(`maintenances.types.${maintenance.type}`)}</td>
                    <td className="py-2 pr-4">{t(`maintenances.statuses.${maintenance.status}`)}</td>
                    <td className="py-2">
                      {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {t('vehicles.detail.documents')}
          </h2>
          {canMutate && vehicle && (
            <Link
              to={`/documents/new?vehicleId=${vehicle.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              + {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400">{t('vehicles.detail.noDocuments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4">{t('documents.columns.type')}</th>
                  <th className="pb-2 pr-4">{t('documents.columns.expiryDate')}</th>
                  <th className="pb-2 pr-4">{t('documents.columns.status')}</th>
                  <th className="pb-2">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="py-2 pr-4">{t(`documents.types.${doc.type}`)}</td>
                    <td className="py-2 pr-4">
                      {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getDocStatusClasses(doc.status)}`}
                      >
                        {t(`documents.statuses.${doc.status}`)}
                      </span>
                    </td>
                    <td className="py-2">
                      {doc.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(doc.fileUrl)}
                          className="text-blue-600 hover:underline"
                        >
                          {t('documents.preview.viewFile')}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewUrl && (
        <FilePreviewModal
          isOpen
          fileUrl={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  )
}
