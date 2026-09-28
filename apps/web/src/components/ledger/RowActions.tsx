import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Menu "⋯" das ações de uma linha de tabela. A ação principal (ver, abrir)
 * continua visível na linha; as demais ficam aqui, para não se amontoarem.
 *
 * O menu é desenhado num portal, com posição fixa calculada a partir do botão:
 * dentro da tabela ele seria cortado pelo `overflow` do contêiner.
 */

export type RowActionTone = 'default' | 'muted' | 'warn' | 'ok' | 'danger'

export interface RowAction {
  label: string
  /** Navega para esta rota. */
  to?: string
  /** Executa esta ação. */
  onSelect?: () => void
  tone?: RowActionTone
}

const TONE_CLASS: Record<RowActionTone, string> = {
  default: 'text-slate-300',
  muted: 'text-slate-300',
  warn: 'text-orange-400',
  ok: 'text-emerald-400',
  danger: 'text-rose-400',
}

const LARGURA_MENU = 200

interface RowActionsProps {
  /** Entradas falsas são ignoradas, para montar a lista com condições. */
  actions: Array<RowAction | false | null | undefined>
}

export function RowActions({ actions }: RowActionsProps) {
  const { t } = useTranslation()
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const botaoRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const itens = actions.filter((acao): acao is RowAction => Boolean(acao))

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return
    const rect = botaoRef.current.getBoundingClientRect()
    const altura = menuRef.current?.offsetHeight ?? 0
    const cabeAbaixo = rect.bottom + 6 + altura <= window.innerHeight
    setPosicao({
      top: cabeAbaixo ? rect.bottom + 6 : Math.max(8, rect.top - 6 - altura),
      left: Math.max(8, Math.min(rect.right - LARGURA_MENU, window.innerWidth - LARGURA_MENU - 8)),
    })
  }, [aberto])

  useEffect(() => {
    if (!aberto) return

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    function aoClicarFora(event: MouseEvent) {
      const alvo = event.target as Node
      if (menuRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return
      setAberto(false)
    }

    function aoTeclar(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const opcoes = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      )
      const atual = opcoes.indexOf(document.activeElement as HTMLElement)
      const passo = event.key === 'ArrowDown' ? 1 : -1
      opcoes[(atual + passo + opcoes.length) % opcoes.length]?.focus()
    }

    // Rolar a página afastaria o menu do botão; mais simples fechá-lo.
    function aoRolar() {
      setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    window.addEventListener('scroll', aoRolar, true)
    window.addEventListener('resize', aoRolar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('scroll', aoRolar, true)
      window.removeEventListener('resize', aoRolar)
    }
  }, [aberto])

  if (itens.length === 0) return null

  const itemClass = (tone: RowActionTone = 'default') =>
    cn(
      'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-none',
      TONE_CLASS[tone],
    )

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={t('common.moreActions')}
        title={t('common.moreActions')}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-neutral-400 transition-colors hover:bg-white/10 hover:text-white',
          aberto ? 'border-white/10 bg-white/10 text-white' : 'border-white/5 bg-white/5',
        )}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>

      {aberto &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[55] rounded-xl border border-white/10 bg-lg-inner p-1 shadow-2xl"
            style={{ top: posicao.top, left: posicao.left, width: LARGURA_MENU }}
          >
            {itens.map((acao) =>
              acao.to ? (
                <Link
                  key={acao.label}
                  to={acao.to}
                  role="menuitem"
                  className={itemClass(acao.tone)}
                  onClick={() => setAberto(false)}
                >
                  {acao.label}
                </Link>
              ) : (
                <button
                  key={acao.label}
                  type="button"
                  role="menuitem"
                  className={itemClass(acao.tone)}
                  onClick={() => {
                    setAberto(false)
                    acao.onSelect?.()
                  }}
                >
                  {acao.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
