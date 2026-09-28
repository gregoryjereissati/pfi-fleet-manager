import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Plus } from 'lucide-react'
import { DocumentType, type DocumentStatus } from '@fleet-manager/shared'
import { useDocuments } from '@/hooks/useDocuments'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useToken } from '@/hooks/useToken'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FilePreviewModal } from '@/components/FilePreviewModal'
import { EmptyState, LoadingState, PageHeader } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'
import { useToast } from '@/components/ledger/Toast'
import { formatDate } from '@/lib/utils'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const inputClass = 'lg-input w-full'

function getStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'lg-tag-danger'
  if (status === 'EXPIRING_SOON') return 'lg-tag-warn'
  return 'lg-tag-ok'
}

function getEntityLabel(vehiclePlate: string | null, driverName: string | null) {
  return vehiclePlate ?? driverName ?? '-'
}

export function DocumentList() {
  const { t } = useTranslation()
  const getToken = useToken()
  const toast = useToast()
  const { currentUser } = useCurrentUser()
  const { vehicles } = useVehicleOptions()
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<DocumentType | ''>('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
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
          toast.error((err as Error).message)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        actions={
          canMutate && (
            <Link to="/documents/new" className="lg-btn-accent">
              <Plus size={14} strokeWidth={2} /> {t('documents.new')}
            </Link>
          )
        }
      />

      <div className="lg-inner grid gap-3 p-4 md:grid-cols-3">
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
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        <p className="lg-alert lg-alert-error">{error}</p>
      ) : (
        <div className="lg-inner overflow-hidden">
          <div className="overflow-x-auto">
            <table className="lg-table min-w-full">
              <thead>
                <tr>
                  <th>{t('documents.columns.entity')}</th>
                  <th>{t('documents.columns.type')}</th>
                  <th>{t('documents.columns.expiryDate')}</th>
                  <th>{t('documents.columns.status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={<FileText size={20} strokeWidth={1.5} />}
                        message={t('documents.empty')}
                        action={
                          canMutate && (
                            <Link to="/documents/new" className="lg-btn-accent">
                              <Plus size={14} strokeWidth={2} />
                              {t('documents.new')}
                            </Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  documents.map((document) => (
                    <tr key={document.id}>
                      <td className="font-medium text-white">
                        {getEntityLabel(document.vehiclePlate, document.driverName)}
                        <div className="text-xs font-normal text-neutral-500">
                          {document.vehiclePlate
                            ? t('documents.entity.vehicle')
                            : t('documents.entity.driver')}
                        </div>
                      </td>
                      <td>{t(`documents.types.${document.type}`)}</td>
                      <td className="whitespace-nowrap">{formatDate(document.expiryDate)}</td>
                      <td>
                        <span className={`lg-tag ${getStatusClasses(document.status)}`}>
                          {t(`documents.statuses.${document.status}`)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-3">
                          {document.fileUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDocumentId(document.id)}
                              className="lg-action"
                            >
                              {t('documents.preview.viewFile')}
                            </button>
                          ) : canMutate ? (
                            <Link to={`/documents/${document.id}/edit`} className="lg-action">
                              {t('actions.edit')}
                            </Link>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                          <RowActions
                            actions={[
                              canMutate &&
                                Boolean(document.fileUrl) && {
                                  label: t('actions.edit'),
                                  to: `/documents/${document.id}/edit`,
                                  tone: 'muted',
                                },
                              canMutate && {
                                label: t('actions.remove'),
                                onSelect: () => handleDelete(document.id),
                                tone: 'danger',
                              },
                            ]}
                          />
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
