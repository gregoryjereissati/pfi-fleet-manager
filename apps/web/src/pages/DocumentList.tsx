import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DocumentType, type DocumentStatus } from '@fleet-manager/shared'
import { useDocuments } from '@/hooks/useDocuments'
import { useVehicles } from '@/hooks/useVehicles'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FilePreviewModal } from '@/components/FilePreviewModal'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass =
  'rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

function getStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-500/10 text-red-400'
  if (status === 'EXPIRING_SOON') return 'bg-amber-500/10 text-amber-400'
  return 'bg-green-500/10 text-green-400'
}

function getEntityLabel(vehiclePlate: string | null, driverName: string | null) {
  return vehiclePlate ?? driverName ?? '-'
}

export function DocumentList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser } = useCurrentUser()
  const { vehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<DocumentType | ''>('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  const canMutate = canManageFleet(currentUser?.role)
  const { documents, loading, error, reload } = useDocuments({
    vehicleId: vehicleId || undefined,
    type,
    status,
    orderBy: 'expiryDate',
    order: 'asc',
  })

  function closeDialog() {
    setDialog(null)
  }

  function handleDelete(id: string) {
    setDialog({
      title: t('actions.delete'),
      message: t('documents.deleteConfirm'),
      confirmLabel: t('actions.delete'),
      variant: 'danger',
      onConfirm: async () => {
        closeDialog()
        try {
          const token = await getToken()
          await apiFetch(`/documents/${id}`, token, { method: 'DELETE' })
          reload()
        } catch (err) {
          window.alert((err as Error).message)
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('documents.title')}</h1>
          <p className="text-sm text-white/40">{t('documents.subtitle')}</p>
        </div>
        {canMutate && (
          <Link
            to="/documents/new"
            className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover"
          >
            {t('documents.new')}
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-fleet-card p-4 md:grid-cols-3">
        <select
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('documents.filters.allVehicles')}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plate} - {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as DocumentType | '')}
          className={inputClass}
        >
          <option value="">{t('documents.filters.allTypes')}</option>
          {Object.values(DocumentType).map((documentType) => (
            <option key={documentType} value={documentType}>
              {t(`documents.types.${documentType}`)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as DocumentStatus | '')}
          className={inputClass}
        >
          <option value="">{t('documents.filters.allStatuses')}</option>
          <option value="OK">{t('documents.statuses.OK')}</option>
          <option value="EXPIRING_SOON">{t('documents.statuses.EXPIRING_SOON')}</option>
          <option value="EXPIRED">{t('documents.statuses.EXPIRED')}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-fleet-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-fleet-darker">
                <tr className="border-b border-white/[0.07] text-left text-white/40">
                  <th className="px-4 py-3 font-medium">{t('documents.columns.entity')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.expiryDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/30">
                      {t('documents.empty')}
                    </td>
                  </tr>
                ) : (
                  documents.map((document) => (
                    <tr key={document.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-3 font-medium text-white">
                        {getEntityLabel(document.vehiclePlate, document.driverName)}
                        <div className="text-xs text-white/40">
                          {document.vehiclePlate
                            ? t('documents.entity.vehicle')
                            : t('documents.entity.driver')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {t(`documents.types.${document.type}`)}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {new Date(document.expiryDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(document.status)}`}
                        >
                          {t(`documents.statuses.${document.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {document.fileUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(document.fileUrl)}
                              className="text-gold hover:underline"
                            >
                              {t('documents.preview.viewFile')}
                            </button>
                          )}
                          {canMutate && (
                            <>
                              <Link
                                to={`/documents/${document.id}/edit`}
                                className="text-white/55 hover:underline"
                              >
                                {t('actions.edit')}
                              </Link>
                              <button
                                onClick={() => handleDelete(document.id)}
                                className="text-red-400 hover:underline"
                              >
                                {t('actions.remove')}
                              </button>
                            </>
                          )}
                          {!canMutate && !document.fileUrl && (
                            <span className="text-white/25">-</span>
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

      {dialog && (
        <ConfirmDialog
          isOpen
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={t('actions.cancel')}
          variant={dialog.variant}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}

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
