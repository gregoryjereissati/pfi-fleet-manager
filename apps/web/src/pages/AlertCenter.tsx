import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DocumentDto } from '@fleet-manager/shared'
import { useAlerts, type LicenseAlert, type MaintenanceAlert } from '@/hooks/useAlerts'
import { formatDate } from '@/lib/utils'
import { prazoDeManutencao, prazoDeVencimento, type Traduzir } from '@/lib/alertas'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'

function AlertCard({
  urgente,
  titulo,
  detalhe,
  prazo,
  rodape,
  link,
}: {
  urgente: boolean
  titulo: string
  detalhe?: string
  prazo: string
  rodape?: string
  link: { to: string; label: string }
}) {
  return (
    <div className="lg-card lg-flashlight lg-reveal group p-6">
      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`lg-dot mt-2 ${urgente ? 'animate-pulse text-rose-500' : 'text-yellow-400'}`}
          />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">{titulo}</p>
            {detalhe && <p className="mt-1 text-sm text-neutral-400">{detalhe}</p>}
          </div>
        </div>
        <span className={`lg-tag self-start ${urgente ? 'lg-tag-danger' : 'lg-tag-warn'}`}>
          {prazo}
        </span>
        {rodape && <p className="text-xs text-neutral-500">{rodape}</p>}
        <Link to={link.to} className="lg-link mt-auto self-start">
          {link.label}
        </Link>
      </div>
    </div>
  )
}

function Secao({
  titulo,
  quantidade,
  urgentes,
  children,
}: {
  titulo: string
  quantidade: number
  urgentes: number
  children: ReactNode
}) {
  if (quantidade === 0) return null

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
        <span
          className={`lg-dot ${urgentes > 0 ? 'animate-pulse text-rose-500' : 'text-yellow-400'}`}
        />
        {titulo} ({quantidade})
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

function DocumentoEmAlerta({ document, t }: { document: DocumentDto; t: Traduzir }) {
  const titular = document.vehiclePlate ?? document.driverName ?? '-'

  return (
    <AlertCard
      urgente={document.status === 'EXPIRED'}
      titulo={`${titular} - ${t(`documents.types.${document.type}`)}`}
      prazo={`${formatDate(document.expiryDate)} - ${prazoDeVencimento(document.expiryDate, t)}`}
      rodape={
        document.alertSentAt
          ? t('alerts.signaledAt', { date: formatDate(document.alertSentAt) })
          : undefined
      }
      link={{ to: '/documents', label: t('alerts.viewAll') }}
    />
  )
}

function ManutencaoEmAlerta({ maintenance, t }: { maintenance: MaintenanceAlert; t: Traduzir }) {
  const dia = maintenance.scheduledDate.slice(0, 10)

  return (
    <AlertCard
      urgente={maintenance.status === 'OVERDUE'}
      titulo={`${maintenance.vehicle.plate} - ${t(`maintenances.types.${maintenance.type}`)}`}
      detalhe={maintenance.description}
      prazo={`${formatDate(dia)} - ${prazoDeManutencao(dia, t)}`}
      link={{ to: '/maintenances', label: t('alerts.viewMaintenances') }}
    />
  )
}

function HabilitacaoEmAlerta({ license, t }: { license: LicenseAlert; t: Traduzir }) {
  return (
    <AlertCard
      urgente={license.status === 'EXPIRED'}
      titulo={`${license.driverName} - CNH`}
      prazo={`${formatDate(license.cnhExpiry)} - ${prazoDeVencimento(license.cnhExpiry, t)}`}
      link={{ to: `/drivers/${license.driverId}`, label: t('alerts.viewDriver') }}
    />
  )
}

export function AlertCenter() {
  const { t } = useTranslation()
  const { alerts, loading, error } = useAlerts()
  const { documents, maintenances, licenses } = alerts

  const total = documents.length + maintenances.length + licenses.length

  return (
    <div className="space-y-6">
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} />

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        // Sem isto, uma falha da API aparecia como "Nenhum alerta ativo".
        <p className="lg-alert lg-alert-error">{error}</p>
      ) : total === 0 ? (
        <div className="lg-alert lg-alert-ok px-6 py-8 text-center">
          <p className="text-sm font-medium">{t('alerts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Secao
            titulo={t('alerts.sections.documents')}
            quantidade={documents.length}
            urgentes={documents.filter((item) => item.status === 'EXPIRED').length}
          >
            {documents.map((document) => (
              <DocumentoEmAlerta key={document.id} document={document} t={t} />
            ))}
          </Secao>

          <Secao
            titulo={t('alerts.sections.maintenances')}
            quantidade={maintenances.length}
            urgentes={maintenances.filter((item) => item.status === 'OVERDUE').length}
          >
            {maintenances.map((maintenance) => (
              <ManutencaoEmAlerta key={maintenance.id} maintenance={maintenance} t={t} />
            ))}
          </Secao>

          <Secao
            titulo={t('alerts.sections.licenses')}
            quantidade={licenses.length}
            urgentes={licenses.filter((item) => item.status === 'EXPIRED').length}
          >
            {licenses.map((license) => (
              <HabilitacaoEmAlerta key={license.driverId} license={license} t={t} />
            ))}
          </Secao>
        </div>
      )}
    </div>
  )
}
