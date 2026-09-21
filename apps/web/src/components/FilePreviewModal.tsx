import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { signedDocumentUrl } from '@/lib/supabase'

interface FilePreviewModalProps {
  isOpen: boolean
  /**
   * Caminho do anexo dentro do bucket — não uma URL.
   *
   * O bucket é privado: o endereço de leitura é gerado aqui, na abertura, e
   * expira em pouco tempo. Guardar uma URL pública daria acesso permanente a
   * quem a tivesse visto uma vez, inclusive depois de perder acesso à empresa.
   */
  fileUrl: string
  onClose: () => void
}

export function FilePreviewModal({ isOpen, fileUrl, onClose }: FilePreviewModalProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !fileUrl) return

    let cancelado = false
    setUrl(null)
    setErro(null)

    signedDocumentUrl(fileUrl)
      .then((assinada) => {
        if (!cancelado) setUrl(assinada)
      })
      .catch((err: Error) => {
        if (!cancelado) setErro(err.message)
      })

    return () => {
      cancelado = true
    }
  }, [isOpen, fileUrl])

  if (!isOpen) return null

  const isPdf = fileUrl.toLowerCase().includes('.pdf')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-fleet-card border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <h2 className="text-sm font-semibold text-white/70">{t('documents.preview.title')}</h2>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/[0.04]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                {t('documents.preview.openInTab')}
              </a>
            )}
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
          {erro && <p className="py-10 text-center text-sm text-red-400">{erro}</p>}

          {!erro && !url && (
            <p className="py-10 text-center text-sm text-white/40">{t('common.loading')}</p>
          )}

          {url &&
            (isPdf ? (
              <iframe
                src={url}
                className="h-[70vh] w-full rounded border border-white/[0.07]"
                title={t('documents.preview.title')}
              />
            ) : (
              <img
                src={url}
                alt={t('documents.preview.title')}
                className="mx-auto max-h-[70vh] max-w-full rounded object-contain"
              />
            ))}
        </div>
      </div>
    </div>
  )
}
