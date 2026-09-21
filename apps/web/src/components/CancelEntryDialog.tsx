import { useState } from 'react'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-white/[0.08] bg-fleet-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">{t('entries.cancelTitle')}</h2>
          <p className="text-sm text-white/45">{t('entries.cancelHelp')}</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-white/55">
            {t('entries.cancelReasonLabel')}
          </label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder={t('entries.cancelReasonPlaceholder')}
            className="w-full rounded-md border border-white/[0.08] bg-fleet-input px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-amber-400"
          >
            {t('actions.cancelEntry')}
          </button>
        </div>
      </div>
    </div>
  )
}
