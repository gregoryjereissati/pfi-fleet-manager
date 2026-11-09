import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Seleção no design system Ledger, no lugar do `<select>` nativo.
 *
 * A lista nativa é desenhada pelo sistema operacional — no Windows, uma caixa
 * branca e quadrada que destoa da interface. Esta versão desenha a lista com
 * as superfícies e o destaque esmeralda do design system.
 *
 * A interface é a do `<select>`: recebe `<option>` como filhos e chama
 * `onChange` com `{ target: { value } }`. Trocar a tag basta; os manipuladores
 * que leem `event.target.value` continuam iguais.
 *
 * A lista vai num portal, com posição fixa calculada a partir do botão: dentro
 * de tabelas e cartões ela seria cortada pelo `overflow` do contêiner.
 */

interface Opcao {
  value: string
  label: string
  disabled: boolean
}

interface SelectProps {
  value: string
  onChange: (event: { target: { value: string } }) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  'aria-label'?: string
}

const ALTURA_MAXIMA = 288
/** A lista acompanha o texto das opções até este limite, em pixels. */
const LARGURA_MAXIMA = 416

/** Texto de um nó qualquer: `{placa} • {marca}` vira uma única string. */
function texto(no: ReactNode): string {
  return Children.toArray(no)
    .map((parte) =>
      typeof parte === 'string' || typeof parte === 'number'
        ? String(parte)
        : isValidElement<{ children?: ReactNode }>(parte)
          ? texto(parte.props.children)
          : '',
    )
    .join('')
}

function lerOpcoes(children: ReactNode): Opcao[] {
  const opcoes: Opcao[] = []
  Children.toArray(children).forEach((filho) => {
    if (
      !isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(filho)
    )
      return
    if (filho.type !== 'option') return
    const rotulo = texto(filho.props.children)
    opcoes.push({
      value: filho.props.value !== undefined ? String(filho.props.value) : rotulo,
      label: rotulo,
      disabled: Boolean(filho.props.disabled),
    })
  })
  return opcoes
}

export function Select({
  value,
  onChange,
  children,
  className,
  disabled,
  required,
  id,
  name,
  'aria-label': ariaLabel,
}: SelectProps) {
  const opcoes = lerOpcoes(children)
  const selecionada = opcoes.find((opcao) => opcao.value === value) ?? opcoes[0]

  const [aberto, setAberto] = useState(false)
  const [ativa, setAtiva] = useState(0)
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0 })
  const botaoRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const listaId = useId()

  function abrir() {
    if (disabled) return
    const indice = opcoes.findIndex((opcao) => opcao.value === value)
    setAtiva(indice >= 0 ? indice : 0)
    // Sem largura fixa, a lista se mede pelo texto antes de ser posicionada.
    setPosicao((atual) => ({ ...atual, width: 0 }))
    setAberto(true)
  }

  function fechar(devolverFoco = true) {
    setAberto(false)
    if (devolverFoco) botaoRef.current?.focus()
  }

  function escolher(opcao: Opcao | undefined) {
    if (!opcao || opcao.disabled) return
    if (opcao.value !== value) onChange({ target: { value: opcao.value } })
    fechar()
  }

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return
    const rect = botaoRef.current.getBoundingClientRect()
    const altura = Math.min(listaRef.current?.scrollHeight ?? ALTURA_MAXIMA, ALTURA_MAXIMA)
    const cabeAbaixo = rect.bottom + 6 + altura <= window.innerHeight
    const minima = Math.max(rect.width, 180)
    // A lista mede o próprio texto antes de ser posicionada.
    const natural = listaRef.current?.scrollWidth ?? minima
    const largura = Math.min(Math.max(minima, natural), LARGURA_MAXIMA)
    setPosicao({
      top: cabeAbaixo ? rect.bottom + 6 : Math.max(8, rect.top - 6 - altura),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - largura - 8)),
      width: largura,
    })
  }, [aberto])

  // Mantém a opção ativa à vista quando o teclado a leva para fora da lista.
  useEffect(() => {
    if (!aberto) return
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${ativa}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [aberto, ativa])

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(event: MouseEvent) {
      const alvo = event.target as Node
      if (listaRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return
      fechar(false)
    }

    // Rolar a página afastaria a lista do botão; rolar a própria lista, não.
    function aoRolar(event: Event) {
      if (listaRef.current?.contains(event.target as Node)) return
      fechar(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    window.addEventListener('scroll', aoRolar, true)
    window.addEventListener('resize', aoRolar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      window.removeEventListener('scroll', aoRolar, true)
      window.removeEventListener('resize', aoRolar)
    }
  }, [aberto])

  function mover(passo: number) {
    if (opcoes.length === 0) return
    let indice = ativa
    for (let tentativas = 0; tentativas < opcoes.length; tentativas += 1) {
      indice = (indice + passo + opcoes.length) % opcoes.length
      if (!opcoes[indice].disabled) break
    }
    setAtiva(indice)
  }

  function aoTeclar(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        abrir()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        mover(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        mover(-1)
        break
      case 'Home':
        event.preventDefault()
        setAtiva(0)
        break
      case 'End':
        event.preventDefault()
        setAtiva(opcoes.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        escolher(opcoes[ativa])
        break
      case 'Escape':
        event.preventDefault()
        fechar()
        break
      case 'Tab':
        fechar(false)
        break
      default:
        // Digitar uma letra leva à próxima opção que começa com ela.
        if (event.key.length === 1) {
          const letra = event.key.toLocaleLowerCase('pt-BR')
          const ordem = [...opcoes.slice(ativa + 1), ...opcoes.slice(0, ativa + 1)]
          const achada = ordem.find(
            (opcao) => !opcao.disabled && opcao.label.toLocaleLowerCase('pt-BR').startsWith(letra),
          )
          if (achada) setAtiva(opcoes.indexOf(achada))
        }
    }
  }

  return (
    <div className="relative min-w-0">
      <button
        ref={botaoRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoTeclar}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={aberto ? `${listaId}-${ativa}` : undefined}
        className={cn(
          className,
          'flex w-full cursor-pointer items-center justify-between gap-2 text-left',
          aberto && 'border-emerald-500/30',
        )}
      >
        <span className="truncate">{selecionada?.label ?? ''}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={cn('shrink-0 text-neutral-500 transition-transform', aberto && 'rotate-180')}
        />
      </button>

      {/* Mantém a validação nativa de campo obrigatório dos formulários. */}
      {(required || name) && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          required={required}
          value={value}
          onChange={() => undefined}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
        />
      )}

      {aberto &&
        createPortal(
          <ul
            ref={listaRef}
            id={listaId}
            role="listbox"
            className="fixed z-55 overflow-y-auto rounded-xl border border-white/10 bg-lg-inner p-1 shadow-2xl"
            style={{
              top: posicao.top,
              left: posicao.left,
              width: posicao.width || undefined,
              minWidth: 180,
              maxWidth: LARGURA_MAXIMA,
              maxHeight: ALTURA_MAXIMA,
            }}
          >
            {opcoes.map((opcao, indice) => {
              const marcada = opcao.value === value
              return (
                <li
                  key={`${opcao.value}-${indice}`}
                  id={`${listaId}-${indice}`}
                  data-indice={indice}
                  role="option"
                  aria-selected={marcada}
                  aria-disabled={opcao.disabled || undefined}
                  onMouseEnter={() => setAtiva(indice)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => escolher(opcao)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    indice === ativa ? 'bg-white/10 text-white' : 'text-neutral-300',
                    marcada && 'text-emerald-400',
                    opcao.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span className="truncate whitespace-nowrap">{opcao.label}</span>
                  {marcada && <Check size={14} strokeWidth={2} className="shrink-0" />}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
