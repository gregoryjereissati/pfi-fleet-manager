import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Bell } from 'lucide-react'
import { useAlertCount } from '@/hooks/useAlertCount'
import { useAlerts } from '@/hooks/useAlerts'
import { alertasEmOrdem } from '@/lib/alertas'
import { cn } from '@/lib/utils'

/** Quantos alertas a prévia mostra antes do botão para a central. */
const NA_PREVIA = 3

/**
 * Conteúdo do painel. Só é montado com o painel aberto, de modo que a lista
 * seja buscada no momento em que alguém a quer ver, e não a cada tela.
 */
function Painel({ aoIr }: { aoIr: (destino: string) => void }) {
  const { t } = useTranslation()
  const { alerts, loading, error } = useAlerts()
  const { counts } = useAlertCount()
  const itens = alertasEmOrdem(alerts, t)

  const frentes = [
    { rotulo: t('notifications.documents'), valor: counts.documents },
    { rotulo: t('notifications.maintenances'), valor: counts.maintenances },
    { rotulo: t('notifications.licenses'), valor: counts.licenses },
  ]

  return (
    <>
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-sm font-semibold text-white">{t('notifications.title')}</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {t('notifications.summary', { count: counts.count })}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {frentes.map((frente) => (
            <span
              key={frente.rotulo}
              className={cn('lg-tag', frente.valor > 0 ? 'lg-tag-warn' : 'lg-tag-muted')}
            >
              {frente.rotulo}: {frente.valor}
            </span>
          ))}
        </div>
      </div>

      <div className="p-1.5">
        {loading ? (
          <p className="px-3 py-4 text-sm text-neutral-500">{t('common.loading')}</p>
        ) : error ? (
          <p className="px-3 py-4 text-sm text-rose-400">{error}</p>
        ) : itens.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-400">{t('alerts.empty')}</p>
        ) : (
          itens.slice(0, NA_PREVIA).map((item) => (
            <button
              key={item.chave}
              type="button"
              onClick={() => aoIr(item.destino)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-hidden"
            >
              <span
                className={cn(
                  'lg-dot mt-1.5 shrink-0',
                  item.urgente ? 'text-rose-500' : 'text-yellow-400',
                )}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{item.titulo}</span>
                <span
                  className={cn(
                    'mt-0.5 block text-xs',
                    item.urgente ? 'text-rose-400' : 'text-yellow-400/90',
                  )}
                >
                  {item.prazo}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-white/5 p-1.5">
        <button
          type="button"
          onClick={() => aoIr('/alerts')}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-emerald-400 transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-hidden"
        >
          {itens.length > NA_PREVIA
            ? t('notifications.seeAll', { count: itens.length })
            : t('notifications.openCenter')}
          <ArrowRight size={14} strokeWidth={1.75} />
        </button>
      </div>
    </>
  )
}

/**
 * Sino do cabeçalho. Abre um painel por cima da tela com os alertas mais
 * urgentes, sem sair de onde se está; a central de alertas continua sendo a
 * visão completa, a um clique do rodapé do painel.
 */
export function NotificationsPopover() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { count } = useAlertCount()
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)

  // Mudar de tela fecha o painel.
  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(event: MouseEvent) {
      if (raizRef.current?.contains(event.target as Node)) return
      setAberto(false)
    }

    function aoTeclar(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAberto(false)
      botaoRef.current?.focus()
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function ir(destino: string) {
    setAberto(false)
    navigate(destino)
  }

  return (
    <div ref={raizRef} className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className={cn('lg-icon-btn', aberto && 'border-white/10 bg-white/10 text-white')}
        aria-label={t('notifications.title')}
        aria-haspopup="dialog"
        aria-expanded={aberto}
      >
        <Bell size={17} strokeWidth={1.5} />
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-lg-app bg-yellow-400" />
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label={t('notifications.title')}
          className="absolute right-0 top-full z-55 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-lg-inner shadow-2xl"
        >
          <Painel aoIr={ir} />
        </div>
      )}
    </div>
  )
}
