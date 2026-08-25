import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FilePreviewModalProps {
  isOpen: boolean
  fileUrl: string
  onClose: () => void
}

export function FilePreviewModal({ isOpen, fileUrl, onClose }: FilePreviewModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  const isPdf = fileUrl.toLowerCase().includes('.pdf')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-fleet-card border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-white/70">{t('documents.preview.title')}</h2>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/[0.04]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {t('documents.preview.openInTab')}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.12] text-white/55 hover:bg-white/[0.04]"
              aria-label={t('actions.close')}
              title={t('actions.close')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="h-[70vh] w-full rounded border border-white/[0.07]"
              title={t('documents.preview.title')}
            />
          ) : (
            <img
              src={fileUrl}
              alt={t('documents.preview.title')}
              className="mx-auto max-h-[70vh] max-w-full rounded object-contain"
            />
          )}
        </div>
      </div>
    </div>
  )
}
