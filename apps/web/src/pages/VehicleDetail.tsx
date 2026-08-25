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
  if (status === 'EXPIRED') return 'bg-red-500/10 text-red-400'
  if (status === 'EXPIRING_SOON') return 'bg-amber-500/10 text-amber-400'
  return 'bg-green-500/10 text-green-400'
}

const sectionClass = 'rounded-lg border border-white/[0.07] bg-fleet-card p-4'
const thClass = 'pb-2 pr-4 text-white/40'
const tdClass = 'py-2 pr-4 text-white/70'

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
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (!vehicle) {
    return <p className="text-sm text-white/40">{t('common.notFound')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link to="/vehicles" className="text-sm text-gold hover:underline">
            {t('actions.backToVehicles')}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{vehicle.plate}</h1>
            <p className="text-white/45">
              {vehicle.brand} {vehicle.model} • {vehicle.year} • {vehicle.color || '-'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              vehicle.status === VehicleStatus.ACTIVE
                ? 'bg-green-500/10 text-green-400'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {vehicle.status === VehicleStatus.ACTIVE ? t('status.active') : t('status.inactive')}
          </span>
        </div>

        {canMutate && (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/vehicles/${vehicle.id}/edit`}
              className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
            >
              {t('actions.edit')}
            </Link>
            <Link
              to={`/vehicles/${vehicle.id}/drivers`}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover"
            >
              {t('vehicles.manageDrivers')}
            </Link>
          </div>
        )}
      </div>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-white/50">
          {t('vehicles.linkedDrivers')} ({vehicle.drivers.length})
        </h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {vehicle.drivers.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-white">{driver.name}</span>
                <span className="text-white/40">CNH {driver.cnh}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-white/50">{t('vehicles.latestExpenses')}</h2>
        {vehicle.expenses.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noExpenses')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  <th className={thClass}>{t('vehicles.columns.type')}</th>
                  <th className={thClass}>{t('vehicles.columns.amount')}</th>
                  <th className={thClass}>{t('vehicles.columns.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {vehicle.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className={tdClass}>{t(`expenses.types.${expense.type}`)}</td>
                    <td className={tdClass}>{formatMoney(expense.amount)}</td>
                    <td className={tdClass}>{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-white/50">
          {t('vehicles.latestMaintenances')}
        </h2>
        {vehicle.maintenances.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.noMaintenances')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  <th className={thClass}>{t('vehicles.columns.type')}</th>
                  <th className={thClass}>{t('vehicles.columns.status')}</th>
                  <th className={thClass}>{t('vehicles.columns.scheduledDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {vehicle.maintenances.map((maintenance) => (
                  <tr key={maintenance.id}>
                    <td className={tdClass}>{t(`maintenances.types.${maintenance.type}`)}</td>
                    <td className={tdClass}>{t(`maintenances.statuses.${maintenance.status}`)}</td>
                    <td className={tdClass}>
                      {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/50">
            {t('vehicles.detail.documents')}
          </h2>
          {canMutate && vehicle && (
            <Link
              to={`/documents/new?vehicleId=${vehicle.id}`}
              className="text-xs text-gold hover:underline"
            >
              + {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <p className="text-sm text-white/30">{t('common.loading')}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-white/30">{t('vehicles.detail.noDocuments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left">
                  <th className={thClass}>{t('documents.columns.type')}</th>
                  <th className={thClass}>{t('documents.columns.expiryDate')}</th>
                  <th className={thClass}>{t('documents.columns.status')}</th>
                  <th className={thClass}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className={tdClass}>{t(`documents.types.${doc.type}`)}</td>
                    <td className={tdClass}>
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
                          className="text-gold hover:underline"
                        >
                          {t('documents.preview.viewFile')}
                        </button>
                      ) : (
                        <span className="text-white/25">-</span>
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
