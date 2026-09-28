import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface CancelEntryDialogProps {
  onConfirm: (reason: string) => void
  onClose: () => void
}

/**
 * Cancelamento de um lançamento.
 *
 * O motivo é obrigatório: o registro permanece na lista, e o porquê fica junto
 * dele. Cancelar não é excluir — o lançamento sai dos totais e continua
 * consultável.
 */
export function CancelEntryDialog({ onConfirm, onClose }: CancelEntryDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    const trimmed = reason.trim()

    if (trimmed.length < 3) {
      setError(t('entries.cancelReasonRequired'))
      return
    }

    onConfirm(trimmed)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="lg-in w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-lg-card p-7 shadow-2xl">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-white">{t('entries.cancelTitle')}</h2>
          <p className="lg-muted text-sm leading-relaxed">{t('entries.cancelHelp')}</p>
        </div>

        <div>
          <label className="lg-label">{t('entries.cancelReasonLabel')}</label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder={t('entries.cancelReasonPlaceholder')}
            className="lg-input w-full"
          />
          {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="lg-btn-ghost">
            {t('actions.cancel')}
          </button>
          <button type="button" onClick={handleConfirm} className="lg-btn-ghost lg-btn-warning">
            {t('actions.cancelEntry')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
