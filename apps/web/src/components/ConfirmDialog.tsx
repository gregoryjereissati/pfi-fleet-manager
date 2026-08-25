import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600/90 text-white hover:bg-red-600'
      : variant === 'warning'
        ? 'bg-amber-600/90 text-white hover:bg-amber-600'
        : 'bg-gold text-fleet-black font-semibold hover:bg-gold-hover'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-fleet-card border border-white/[0.08] p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/55">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
