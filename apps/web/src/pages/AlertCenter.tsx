import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DocumentStatus } from '@fleet-manager/shared'
import { useDocuments, type DocumentItem } from '@/hooks/useDocuments'

function getDaysLabel(
  expiryDate: string,
  status: DocumentStatus,
  t: (key: string, options?: { count: number }) => string,
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (status === 'EXPIRED') {
    return t('alerts.daysOverdue', { count: Math.abs(diffDays) })
  }

  return t('alerts.daysRemaining', { count: diffDays })
}

function DocumentAlertRow({
  document,
  t,
}: {
  document: DocumentItem
  t: (key: string, options?: { count: number }) => string
}) {
  const isExpired = document.status === 'EXPIRED'
  const entityLabel = document.vehiclePlate ?? document.driverName ?? '-'

  return (
    <div
      className={`flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isExpired
          ? 'border-red-500/20 bg-red-500/[0.06]'
          : 'border-amber-500/20 bg-amber-500/[0.06]'
      }`}
    >
      <div>
        <p className="text-sm font-medium text-white">
          {entityLabel} - {t(`documents.types.${document.type}`)}
        </p>
        <p className="text-xs text-white/40">
          {new Date(document.expiryDate).toLocaleDateString('pt-BR')} -{' '}
          {getDaysLabel(document.expiryDate, document.status, t)}
        </p>
      </div>
      <Link to="/documents" className="text-xs font-medium text-gold hover:underline">
        {t('alerts.viewAll')}
      </Link>
    </div>
  )
}

export function AlertCenter() {
  const { t } = useTranslation()
  const { documents: expiredDocuments, loading: loadingExpired } = useDocuments({
    status: 'EXPIRED',
    orderBy: 'expiryDate',
    order: 'asc',
  })
  const { documents: expiringSoonDocuments, loading: loadingExpiring } = useDocuments({
    status: 'EXPIRING_SOON',
    orderBy: 'expiryDate',
    order: 'asc',
  })

  const loading = loadingExpired || loadingExpiring
  const hasAlerts = expiredDocuments.length > 0 || expiringSoonDocuments.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('alerts.title')}</h1>
        <p className="text-sm text-white/40">{t('alerts.subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">{t('common.loading')}</p>
      ) : !hasAlerts ? (
        <div className="rounded-lg border border-green-500/20 bg-green-500/[0.06] px-6 py-8 text-center">
          <p className="text-sm font-medium text-green-400">{t('alerts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {expiredDocuments.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
                {t('alerts.expired')} ({expiredDocuments.length})
              </h2>
              {expiredDocuments.map((document) => (
                <DocumentAlertRow key={document.id} document={document} t={t} />
              ))}
            </section>
          )}

          {expiringSoonDocuments.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
                {t('alerts.expiringSoon')} ({expiringSoonDocuments.length})
              </h2>
              {expiringSoonDocuments.map((document) => (
                <DocumentAlertRow key={document.id} document={document} t={t} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
