import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

/**
 * Avisos flutuantes no canto da tela, no lugar do `window.alert` do navegador.
 * Somem sozinhos depois de alguns segundos e podem ser fechados antes.
 */

type ToastTone = 'error' | 'success'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  error: (message: string) => void
  success: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURACAO_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const proximoId = useRef(0)

  const fechar = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id))
  }, [])

  const mostrar = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++proximoId.current
      setToasts((atuais) => [...atuais.slice(-3), { id, tone, message }])
      window.setTimeout(() => fechar(id), DURACAO_MS)
    },
    [fechar],
  )

  const api = useMemo<ToastApi>(
    () => ({
      error: (message) => mostrar('error', message),
      success: (message) => mostrar('success', message),
    }),
    [mostrar],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
        >
          {toasts.map((toast) => {
            const erro = toast.tone === 'error'
            const Icone = erro ? AlertCircle : CheckCircle2

            return (
              <div
                key={toast.id}
                role={erro ? 'alert' : 'status'}
                className="lg-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-lg-inner/95 p-4 shadow-2xl backdrop-blur-md"
                style={{ ['--lg-delay' as string]: '0s' }}
              >
                <span
                  className={`mt-0.5 rounded-lg border p-1.5 ${
                    erro
                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <Icone size={16} strokeWidth={1.75} />
                </span>
                <p className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-slate-300">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => fechar(toast.id)}
                  className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={t('actions.close')}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return api
}
