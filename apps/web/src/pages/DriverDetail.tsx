import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DriverStatus, type DocumentStatus } from '@fleet-manager/shared'
import { useDriver } from '@/hooks/useDriver'
import { useDocuments } from '@/hooks/useDocuments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { canManageFleet } from '@/lib/roles'
import { formatCpf, formatDate } from '@/lib/utils'
import { FilePreviewModal } from '@/components/FilePreviewModal'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'
import { ArrowLeft, Plus } from 'lucide-react'

function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'lg-tag-danger'
  if (status === 'EXPIRING_SOON') return 'lg-tag-warn'
  return 'lg-tag-ok'
}

const sectionClass = 'lg-inner lg-reveal p-6'
const sectionTitleClass = 'mb-4 text-base font-semibold tracking-tight text-white'

export function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currentUser } = useCurrentUser()
  const { driver, loading, error } = useDriver(id)
  const canMutate = canManageFleet(currentUser?.role)
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const { documents, loading: loadingDocuments } = useDocuments({
    driverId: id,
    orderBy: 'expiryDate',
    order: 'asc',
  })

  if (loading) {
    return <LoadingState label={t('common.loading')} />
  }

  if (error) {
    return <p className="lg-alert lg-alert-error">{error}</p>
  }

  if (!driver) {
    return <p className="text-sm text-neutral-500">{t('common.notFound')}</p>
  }

  const activeAssignments = driver.assignments.filter((assignment) => !assignment.endDate)
  const endedAssignments = driver.assignments.filter((assignment) => assignment.endDate)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link to="/drivers" className="lg-link">
          <ArrowLeft size={14} />
          {t('actions.backToDrivers')}
        </Link>
        <PageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              {driver.name}
              <span
                className={`lg-tag ${
                  driver.status === DriverStatus.ACTIVE ? 'lg-tag-ok' : 'lg-tag-muted'
                }`}
              >
                {driver.status === DriverStatus.ACTIVE && <span className="lg-dot animate-pulse" />}
                {driver.status === DriverStatus.ACTIVE ? t('status.active') : t('status.inactive')}
              </span>
            </span>
          }
          subtitle={
            <>
              CPF {formatCpf(driver.cpf)} • CNH {driver.cnh ?? t('drivers.cnhMissing')}
              {driver.email && <span className="block text-sm">{driver.email}</span>}
              {driver.phone && <span className="block text-sm">{driver.phone}</span>}
            </>
          }
          actions={
            canMutate && (
              <Link to={`/drivers/${driver.id}/edit`} className="lg-btn-ghost">
                {t('actions.edit')}
              </Link>
            )
          }
        />
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>
          {t('drivers.detail.vehicles')} ({activeAssignments.length})
        </h2>
        {activeAssignments.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('drivers.detail.noVehicles')}</p>
        ) : (
          <ul className="space-y-2">
            {activeAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="lg-row flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <Link to={`/vehicles/${assignment.vehicleId}`} className="lg-link">
                    {assignment.vehiclePlate}
                  </Link>
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
                <span className="shrink-0 text-right text-neutral-500">
                  {assignment.vehicleLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {endedAssignments.length > 0 && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('vehicles.assignmentHistory')}</h2>
          <ul className="space-y-2">
            {endedAssignments.map((assignment) => (
              <li key={assignment.id} className="lg-row px-4 py-3 text-sm">
                <span className="font-medium text-slate-300">{assignment.vehiclePlate}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {t('vehicles.assignmentPeriod', {
                    start: formatDate(assignment.startDate),
                    end: formatDate(assignment.endDate as string),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sectionClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-white">
            {t('drivers.detail.documents')}
          </h2>
          {canMutate && (
            <Link to={`/documents/new?driverId=${driver.id}`} className="lg-link">
              <Plus size={14} strokeWidth={2} /> {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <LoadingState label={t('common.loading')} />
        ) : documents.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('drivers.detail.noDocuments')}</p>
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
                    <td className="tabular-nums">{formatDate(doc.expiryDate)}</td>
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
