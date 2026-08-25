import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DriverStatus, type DocumentStatus } from '@fleet-manager/shared'
import { useDriver } from '@/hooks/useDriver'
import { useDocuments } from '@/hooks/useDocuments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { canManageFleet } from '@/lib/roles'
import { FilePreviewModal } from '@/components/FilePreviewModal'

function formatCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-500/10 text-red-400'
  if (status === 'EXPIRING_SOON') return 'bg-amber-500/10 text-amber-400'
  return 'bg-green-500/10 text-green-400'
}

const sectionClass = 'rounded-lg border border-white/[0.07] bg-fleet-card p-4'
const thClass = 'pb-2 pr-4 text-white/40'
const tdClass = 'py-2 pr-4 text-white/70'

export function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currentUser } = useCurrentUser()
  const { driver, loading, error } = useDriver(id)
  const canMutate = canManageFleet(currentUser?.role)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { documents, loading: loadingDocuments } = useDocuments({
    driverId: id,
    orderBy: 'expiryDate',
    order: 'asc',
  })

  if (loading) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (!driver) {
    return <p className="text-sm text-white/40">{t('common.notFound')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link to="/drivers" className="text-sm text-gold hover:underline">
            {t('actions.backToDrivers')}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{driver.name}</h1>
            <p className="text-white/45">
              CPF {formatCpf(driver.cpf)} • CNH {driver.cnh}
            </p>
            {driver.phone && <p className="text-sm text-white/40">{driver.phone}</p>}
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              driver.status === DriverStatus.ACTIVE
                ? 'bg-green-500/10 text-green-400'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {driver.status === DriverStatus.ACTIVE ? t('status.active') : t('status.inactive')}
          </span>
        </div>

        {canMutate && (
          <Link
            to={`/drivers/${driver.id}/edit`}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {t('actions.edit')}
          </Link>
        )}
      </div>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-white/50">
          {t('drivers.detail.vehicles')} ({driver.vehicles.length})
        </h2>
        {driver.vehicles.length === 0 ? (
          <p className="text-sm text-white/30">{t('drivers.detail.noVehicles')}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {driver.vehicles.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <Link
                  to={`/vehicles/${vehicle.id}`}
                  className="font-medium text-gold hover:underline"
                >
                  {vehicle.plate}
                </Link>
                <span className="text-right text-white/40">
                  {vehicle.brand} {vehicle.model}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/50">
            {t('drivers.detail.documents')}
          </h2>
          {canMutate && (
            <Link
              to={`/documents/new?driverId=${driver.id}`}
              className="text-xs text-gold hover:underline"
            >
              + {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <p className="text-sm text-white/30">{t('common.loading')}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-white/30">{t('drivers.detail.noDocuments')}</p>
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
