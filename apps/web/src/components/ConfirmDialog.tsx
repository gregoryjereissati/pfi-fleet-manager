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
      ? 'lg-btn-ghost lg-btn-danger'
      : variant === 'warning'
        ? 'lg-btn-ghost lg-btn-warning'
        : 'lg-btn-accent'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="lg-in relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-lg-card p-7 shadow-2xl">
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="lg-muted mt-2 text-sm leading-relaxed">{message}</p>
        <div className="mt-7 flex justify-end gap-3">
          <button onClick={onCancel} className="lg-btn-ghost">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
