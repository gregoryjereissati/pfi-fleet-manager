import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VehicleStatus, type DocumentStatus } from '@fleet-manager/shared'
import { useVehicle } from '@/hooks/useVehicle'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDocuments } from '@/hooks/useDocuments'
import { canManageFleet } from '@/lib/roles'
import { FilePreviewModal } from '@/components/FilePreviewModal'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'
import { ArrowLeft, Plus } from 'lucide-react'

function formatMoney(value: string) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'lg-tag-danger'
  if (status === 'EXPIRING_SOON') return 'lg-tag-warn'
  return 'lg-tag-ok'
}

const sectionClass = 'lg-inner lg-reveal p-6'
const sectionTitleClass = 'mb-4 text-base font-semibold tracking-tight text-white'

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currentUser } = useCurrentUser()
  const { vehicle, loading, error } = useVehicle(id)
  const canMutate = canManageFleet(currentUser?.role)
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const { documents, loading: loadingDocuments } = useDocuments({
    vehicleId: id,
    orderBy: 'expiryDate',
    order: 'asc',
  })

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
    <div className="space-y-6">
      <div className="space-y-4">
        <Link to="/vehicles" className="lg-link">
          <ArrowLeft size={14} />
          {t('actions.backToVehicles')}
        </Link>
        <PageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              {vehicle.plate}
              <span
                className={`lg-tag ${
                  vehicle.status === VehicleStatus.ACTIVE ? 'lg-tag-ok' : 'lg-tag-muted'
                }`}
              >
                {vehicle.status === VehicleStatus.ACTIVE && (
                  <span className="lg-dot animate-pulse" />
                )}
                {vehicle.status === VehicleStatus.ACTIVE
                  ? t('status.active')
                  : t('status.inactive')}
              </span>
            </span>
          }
          subtitle={
            <>
              {vehicle.brand} {vehicle.model} • {vehicle.year} • {vehicle.color || '-'}
            </>
          }
          actions={
            canMutate && (
              <>
                <Link to={`/vehicles/${vehicle.id}/edit`} className="lg-btn-ghost">
                  {t('actions.edit')}
                </Link>
                <Link to={`/vehicles/${vehicle.id}/drivers`} className="lg-btn-accent">
                  {t('vehicles.manageDrivers')}
                </Link>
              </>
            )
          }
        />
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>
          {t('vehicles.linkedDrivers')} ({vehicle.drivers.length})
        </h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.noLinkedDrivers')}</p>
        ) : (
          <ul className="space-y-2">
            {vehicle.drivers.map((driver) => (
              <li
                key={driver.id}
                className="lg-row flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium text-white">{driver.name}</span>
                <span className="text-neutral-500">CNH {driver.cnh}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('vehicles.latestExpenses')}</h2>
        {vehicle.expenses.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.noExpenses')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="lg-table min-w-full">
              <thead>
                <tr>
                  <th>{t('vehicles.columns.type')}</th>
                  <th>{t('vehicles.columns.amount')}</th>
                  <th>{t('vehicles.columns.date')}</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{t(`expenses.types.${expense.type}`)}</td>
                    <td className="font-semibold tabular-nums text-white">
                      {formatMoney(expense.amount)}
                    </td>
                    <td>{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('vehicles.latestMaintenances')}</h2>
        {vehicle.maintenances.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.noMaintenances')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="lg-table min-w-full">
              <thead>
                <tr>
                  <th>{t('vehicles.columns.type')}</th>
                  <th>{t('vehicles.columns.status')}</th>
                  <th>{t('vehicles.columns.scheduledDate')}</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.maintenances.map((maintenance) => (
                  <tr key={maintenance.id}>
                    <td>{t(`maintenances.types.${maintenance.type}`)}</td>
                    <td>{t(`maintenances.statuses.${maintenance.status}`)}</td>
                    <td>
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-white">
            {t('vehicles.detail.documents')}
          </h2>
          {canMutate && vehicle && (
            <Link to={`/documents/new?vehicleId=${vehicle.id}`} className="lg-link">
              <Plus size={14} strokeWidth={2} /> {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <LoadingState label={t('common.loading')} />
        ) : documents.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('vehicles.detail.noDocuments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="lg-table min-w-full">
              <thead>
                <tr>
                  <th>{t('documents.columns.type')}</th>
                  <th>{t('documents.columns.expiryDate')}</th>
                  <th>{t('documents.columns.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{t(`documents.types.${doc.type}`)}</td>
                    <td>
                      {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <span className={`lg-tag ${getDocStatusClasses(doc.status)}`}>
                        {t(`documents.statuses.${doc.status}`)}
                      </span>
                    </td>
                    <td>
                      {doc.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDocumentId(doc.id)}
                          className="lg-action"
                        >
                          {t('documents.preview.viewFile')}
                        </button>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewDocumentId && (
        <FilePreviewModal
          isOpen
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}
    </div>
  )
}
