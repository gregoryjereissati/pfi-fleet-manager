import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DocumentStatus } from '@fleet-manager/shared'
import { useDocuments, type DocumentItem } from '@/hooks/useDocuments'
import { formatDate, hojeCivil } from '@/lib/utils'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'

function getDaysLabel(
  expiryDate: string,
  status: DocumentStatus,
  t: (key: string, options?: { count: number }) => string,
) {
  // Ambas as pontas viram meia-noite UTC do dia civil correspondente, de modo
  // que a diferença seja em dias de calendário — e não dependa da hora em que a
  // tela foi aberta nem do fuso de quem a abriu.
  const emUtc = (dataCivil: string) => Date.parse(`${dataCivil}T00:00:00Z`)

  const diffDays = Math.round(
    (emUtc(expiryDate) - emUtc(hojeCivil())) / (1000 * 60 * 60 * 24),
  )

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
    <div className="lg-card lg-flashlight lg-reveal group p-6">
      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`lg-dot mt-2 ${
              isExpired ? 'animate-pulse text-rose-500' : 'text-yellow-400'
            }`}
          />
          <p className="text-base font-semibold tracking-tight text-white">
            {entityLabel} - {t(`documents.types.${document.type}`)}
          </p>
        </div>
        <span className={`lg-tag self-start ${isExpired ? 'lg-tag-danger' : 'lg-tag-warn'}`}>
          {formatDate(document.expiryDate)} -{' '}
          {getDaysLabel(document.expiryDate, document.status, t)}
        </span>
        <Link to="/documents" className="lg-link mt-auto self-start">
          {t('alerts.viewAll')}
        </Link>
      </div>
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
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} />

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : !hasAlerts ? (
        <div className="lg-alert lg-alert-ok px-6 py-8 text-center">
          <p className="text-sm font-medium">{t('alerts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {expiredDocuments.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
                <span className="lg-dot animate-pulse text-rose-500" />
                {t('alerts.expired')} ({expiredDocuments.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {expiredDocuments.map((document) => (
                  <DocumentAlertRow key={document.id} document={document} t={t} />
                ))}
              </div>
            </section>
          )}

          {expiringSoonDocuments.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
                <span className="lg-dot text-yellow-400" />
                {t('alerts.expiringSoon')} ({expiringSoonDocuments.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {expiringSoonDocuments.map((document) => (
                  <DocumentAlertRow key={document.id} document={document} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
