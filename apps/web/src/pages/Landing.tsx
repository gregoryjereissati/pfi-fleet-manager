import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Car,
  Check,
  Clock,
  FileText,
  Receipt,
  Truck,
  User,
  Users,
  Wrench,
} from 'lucide-react'
import { LiveDot } from '@/components/ledger/Ui'

/** Atraso da entrada de cada bloco, como no hero do design system (0.1 s a 0.6 s). */
function delay(segundos: number) {
  return { ['--lg-delay' as string]: `${segundos}s` }
}

/** Alturas das barras decorativas; a mais alta é o pico. */
const BARRAS = [45, 65, 55, 85, 100, 70, 60, 90, 50, 75, 40, 30]

/** Escala de composição de despesas do design system. */
const ESCALA = ['#f43f5e', '#fb923c', '#facc15', '#a855f7', '#2dd4bf']

/**
 * Máscara da vitrine: quase apagada no centro, onde fica o hero, e nítida nas
 * bordas. O conteúdo aparece por baixo sem disputar a leitura.
 */
const MASCARA_VITRINE =
  'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.12) 35%, #000 100%)'

/**
 * Tela inicial.
 *
 * Ocupa exatamente uma tela e não rola. O hero — símbolo com o anel
 * esmeralda girando, título, frase e botões — fica no centro; atrás dele, a
 * vitrine em bento mostra os módulos reais do sistema como fundo, esmaecida
 * pela máscara: barras que sobem, composição de despesas, vencimentos com
 * ponto vivo, linha do tempo das manutenções. Nada ali é número inventado.
 */
export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden px-6">
      <Vitrine t={t} />

      {/* Penumbra atrás do texto: a vitrine continua visível, a leitura não sofre. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[min(960px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,0,0,0.85),transparent)]"
      />

      <section className="relative z-10 flex flex-col items-center text-center">
        <div className="lg-in relative mb-10" style={delay(0.1)}>
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-emerald-500/25 blur-[60px]" />
          <div className="lg-orbit shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)]">
            <div className="flex h-28 w-28 items-center justify-center rounded-[calc(2rem-1.5px)] bg-gradient-to-br from-[#10131a] to-black">
              <img
                src="/logo.svg"
                width={68}
                height={68}
                alt="Fleet Manager"
                className="drop-shadow-[0_0_18px_rgba(52,211,153,0.65)]"
              />
            </div>
          </div>
        </div>

        <h1
          className="lg-in text-6xl font-light leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] md:text-8xl"
          style={delay(0.25)}
        >
          {t('landing.title')}
        </h1>

        <p
          className="lg-in mt-6 text-lg text-slate-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:text-xl"
          style={delay(0.4)}
        >
          {t('landing.subtitle')}
        </p>

        <div className="lg-in mt-10 flex flex-wrap items-center justify-center gap-4" style={delay(0.55)}>
          <Link to="/login" className="shiny-cta">
            {t('landing.login')}
          </Link>
          <Link
            to="/register"
            className="group flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-8 py-4 text-lg text-slate-300 backdrop-blur-md transition-all hover:border-white/20 hover:bg-slate-900 active:scale-[0.97] active:bg-slate-950"
          >
            {t('landing.register')}
            <ArrowRight
              size={20}
              strokeWidth={1.5}
              className="transition-transform group-hover:translate-x-0.5 group-hover:text-white"
            />
          </Link>
        </div>
      </section>
    </div>
  )
}

/**
 * A vitrine dos módulos como fundo: decorativa, fora da leitura de tela e do
 * cursor. Entra depois do hero, e o que passa das bordas é cortado.
 */
function Vitrine({ t }: { t: T }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center opacity-50"
      style={{ maskImage: MASCARA_VITRINE, WebkitMaskImage: MASCARA_VITRINE }}
    >
      <div className="grid w-[min(1400px,100%)] shrink-0 grid-cols-1 gap-6 px-6 md:px-8 lg:grid-cols-12 lg:px-12">
        <ExpensesCard t={t} />
        <DocumentsCard t={t} />
        <ModuleCard
          delaySeconds={1}
          icon={<Car size={20} strokeWidth={1.5} />}
          title={t('vehicles.title')}
          description={t('vehicles.subtitle')}
        >
          <div className="flex gap-3">
            {[Car, Truck, Bus].map((Icone, indice) => (
              <span key={indice} className="lg-tile flex h-14 flex-1 items-center justify-center text-slate-400">
                <Icone size={22} strokeWidth={1.5} />
              </span>
            ))}
          </div>
        </ModuleCard>
        <ModuleCard
          delaySeconds={1.1}
          icon={<Users size={20} strokeWidth={1.5} />}
          title={t('drivers.title')}
          description={t('drivers.subtitle')}
        >
          <div className="flex items-center">
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map((indice) => (
                <span
                  key={indice}
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-lg-inner ring-2 ring-lg-card ${
                    indice === 0 ? 'text-emerald-400 ring-emerald-500/30' : 'text-neutral-500'
                  }`}
                >
                  <User size={18} strokeWidth={1.5} />
                </span>
              ))}
            </div>
            <span className="ml-4 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
              <span className="text-xs font-medium text-emerald-400">{t('documents.types.CNH')}</span>
              <Check size={12} strokeWidth={2.5} className="text-emerald-400" />
            </span>
          </div>
        </ModuleCard>
        <ModuleCard
          delaySeconds={1.2}
          icon={<Wrench size={20} strokeWidth={1.5} />}
          title={t('maintenances.title')}
          description={t('maintenances.subtitle')}
        >
          <MaintenanceTimeline />
        </ModuleCard>
      </div>
    </div>
  )
}

type T = (key: string) => string

/** Despesas: barras em laço sobre trilho hachurado e a barra de composição. */
function ExpensesCard({ t }: { t: T }) {
  const tipos = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'IPVA', 'FINE']

  return (
    <article
      className="lg-in relative overflow-hidden rounded-3xl border border-white/10 bg-lg-card p-8 shadow-2xl lg:col-span-7"
      style={delay(0.8)}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="relative z-10">
        <CardHeading
          icon={<Receipt size={20} strokeWidth={1.5} />}
          title={t('expenses.title')}
          description={t('expenses.subtitle')}
        />

        <div className="relative mt-8 flex h-40 items-end gap-2 sm:gap-3">
          <div className="absolute left-0 right-0 top-0 h-px border-t border-dashed border-white/20" />
          {BARRAS.map((altura, indice) => {
            const pico = altura === 100
            return (
              <div
                key={indice}
                className="relative z-10 h-full w-full overflow-hidden rounded-lg bg-white/[0.02] ring-1 ring-white/5"
              >
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 4px, #fff 4px, #fff 6px)',
                  }}
                />
                <div
                  className={`animate-bar-loop absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t ${
                    pico
                      ? 'from-emerald-500 to-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                      : 'from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  }`}
                  style={{ height: `${altura}%`, animationDelay: `${indice * 100}ms` }}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-8 border-t border-white/5 pt-6">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            {[34, 24, 18, 14, 10].map((largura, indice) => (
              <div
                key={indice}
                className="lg-bar-grow h-full"
                style={{ width: `${largura}%`, backgroundColor: ESCALA[indice], ...delay(1.1 + indice * 0.1) }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {tipos.map((tipo, indice) => (
              <span key={tipo} className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ESCALA[indice] }} />
                {t(`expenses.types.${tipo}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

/** Documentos: vencimentos com estado — em dia, vencendo, vencido — e o ponto vivo. */
function DocumentsCard({ t }: { t: T }) {
  const linhas = [
    { tipo: 'CRLV', icone: Check, cor: 'text-emerald-400' },
    { tipo: 'SEGURO', icone: Check, cor: 'text-emerald-400' },
    { tipo: 'CNH', icone: Clock, cor: 'text-yellow-400' },
    { tipo: 'IPVA', icone: AlertTriangle, cor: 'text-rose-400' },
  ]

  return (
    <article
      className="lg-in relative overflow-hidden rounded-3xl border border-white/10 bg-lg-card p-8 shadow-2xl lg:col-span-5"
      style={delay(0.9)}
    >
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-purple-500/10 blur-[100px]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <CardHeading
            icon={<FileText size={20} strokeWidth={1.5} />}
            title={t('documents.title')}
            description={t('documents.subtitle')}
          />
        </div>

        <div className="mt-8 space-y-3">
          {linhas.map(({ tipo, icone: Icone, cor }, indice) => (
            <div
              key={tipo}
              className="lg-in lg-row flex items-center justify-between px-4 py-3"
              style={delay(1 + indice * 0.1)}
            >
              <span className="text-sm text-slate-300">{t(`documents.types.${tipo}`)}</span>
              <span className={`flex items-center gap-2 ${cor}`}>
                {tipo === 'IPVA' && <span className="lg-dot animate-pulse" />}
                <Icone size={15} strokeWidth={2} />
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <LiveDot />
          {t('landing.status')}
        </div>
      </div>
    </article>
  )
}

/** Manutenções: linha do tempo — feita, em andamento (pulsando) e a próxima. */
function MaintenanceTimeline() {
  return (
    <div className="relative flex items-center justify-between px-2">
      <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      <div className="lg-bar-grow absolute left-4 top-1/2 h-px w-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        <Check size={15} strokeWidth={2.5} />
      </span>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500 bg-lg-card shadow-[0_0_20px_rgba(16,185,129,0.4)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
      </span>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-lg-card text-neutral-600">
        <Wrench size={14} strokeWidth={1.5} />
      </span>
    </div>
  )
}

function CardHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="lg-icon-tile h-12 w-12">{icon}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-1 text-sm font-light leading-relaxed text-slate-400">{description}</p>
      </div>
    </div>
  )
}

interface ModuleCardProps {
  delaySeconds: number
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}

function ModuleCard({ delaySeconds, icon, title, description, children }: ModuleCardProps) {
  return (
    <article
      className="lg-in relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-lg-card p-8 shadow-2xl lg:col-span-4"
      style={delay(delaySeconds)}
    >
      <div className="relative z-10 flex h-full flex-col gap-8">
        <CardHeading icon={icon} title={title} description={description} />
        <div className="mt-auto">{children}</div>
      </div>
    </article>
  )
}
