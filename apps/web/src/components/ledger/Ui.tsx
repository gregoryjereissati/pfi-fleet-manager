import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Peças visuais do design system Ledger que se repetem entre as telas.
 * Nenhuma guarda estado: são marcação, as classes de index.css e, no máximo,
 * o repasse de um evento a quem as usa.
 */

/** Logo do Fleet Manager em esmeralda, com o nome ao lado. */
export function BrandMark({
  size = 28,
  showName = true,
  className,
}: {
  size?: number
  showName?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/logo.svg"
        width={size}
        height={size}
        alt="Fleet Manager"
        className="shrink-0 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]"
      />
      {showName ? (
        <span className="text-[15px] font-semibold tracking-tight text-white">Fleet Manager</span>
      ) : null}
    </span>
  )
}

/** Ponto "ao vivo": halo que pulsa (animate-ping) sobre o ponto esmeralda. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative flex h-2 w-2', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** Cabeçalho de tela: sobretítulo opcional, título leve e ações à direita. */
export function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'lg-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="lg-eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="text-3xl font-light leading-[1.1] tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle ? <p className="lg-muted mt-2 max-w-[60ch] text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}

/** Estado de carregamento: ponto pulsante e rótulo discreto. */
export function LoadingState({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-neutral-500', className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {label}
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  message: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/** Estado vazio: ícone em ladrilho, mensagem e, quando cabe, a ação de criar. */
export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 px-6 py-14 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-400">
        {icon}
      </span>
      <p className="max-w-sm text-sm text-neutral-400">{message}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

/** Campo de busca do design system: lupa à esquerda, que acende no hover. */
export function SearchField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('group relative', className)}>
      <Search
        size={15}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors group-hover:text-white"
      />
      <input type="text" {...props} className="lg-input w-full pl-9" />
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}

/** Seletor segmentado em pílula; a opção escolhida fica em esmeralda com brilho. */
export function Segmented<T extends string>({ value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-white/5 bg-lg-track p-1 shadow-inner',
        className,
      )}
    >
      {options.map((option) => {
        const ativo = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(option.value)}
            className={cn(
              'whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              ativo
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
