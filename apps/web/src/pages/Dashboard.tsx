import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExpenseType } from '@fleet-manager/shared'
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Car,
  FileText,
  Receipt,
  RotateCcw,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { useDashboard, type DashboardFilters } from '@/hooks/useDashboard'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { LoadingState, PageHeader, Segmented } from '@/components/ledger/Ui'

/**
 * Painel no idioma visual do design system Ledger: cartões de indicador em
 * #121317, barras com trilho hachurado e degradê esmeralda (o pico ganha
 * brilho), barra de composição com legenda de pontos para os tipos e linhas
 * ranqueadas para os veículos. A evolução mensal é uma curva: linha esmeralda
 * com área em degradê, a linha tracejada de meta do design system marcando o
 * pico e a dica flutuante no cinza do tooltip.
 */

/** Escala de composição do design system para despesas, depois as cores de dado. */
const TYPE_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#a855f7', '#2dd4bf', '#34d399']

const CHART_TICK = {
  fill: '#737373',
  fontSize: 12,
  fontFamily: 'Geist, sans-serif',
}

const fieldClass = 'lg-input w-full'

const periodOptions = ['last30', 'last90', 'last180', 'year', 'all', 'custom'] as const
type PeriodOption = (typeof periodOptions)[number]

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
  alert?: boolean
  /** Variação percentual contra o período anterior, quando há um. */
  delta?: number | null
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetRange(period: PeriodOption): Pick<DashboardFilters, 'startDate' | 'endDate'> {
  const today = new Date()

  if (period === 'all' || period === 'custom') return {}
  if (period === 'year') {
    return {
      startDate: formatDateInput(new Date(today.getFullYear(), 0, 1)),
      endDate: formatDateInput(today),
    }
  }

  const days = period === 'last30' ? 30 : period === 'last90' ? 90 : 180
  const start = new Date(today)
  start.setDate(start.getDate() - days)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(today),
  }
}

/** Converte 'AAAA-MM-DD' em Date local, sem o deslocamento de fuso do parse ISO. */
function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Intervalo imediatamente anterior, com a mesma duração do filtrado — a base
 * do comparativo dos cartões. Sem início e fim definidos não há comparação.
 */
function getPreviousRange(filters: DashboardFilters): Pick<DashboardFilters, 'startDate' | 'endDate'> | null {
  if (!filters.startDate || !filters.endDate) return null

  const start = parseDateInput(filters.startDate)
  const end = parseDateInput(filters.endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  if (days <= 0) return null

  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - (days - 1))

  return { startDate: formatDateInput(previousStart), endDate: formatDateInput(previousEnd) }
}

function percentChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function delay(segundos: number) {
  return { ['--lg-delay' as string]: `${segundos}s` }
}

/**
 * Cartão de indicador (KPI). Todos seguem o mesmo desenho — rótulo e ícone em
 * cima, número grande, dica embaixo —; o total do período só muda a superfície
 * para a elevada, como o "Total Balance" do design system.
 */
function SummaryCard({
  icon,
  label,
  value,
  hint,
  alert,
  delta,
  index,
  featured,
}: SummaryCardProps & { index: number; featured?: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      className={`lg-reveal flex min-h-[160px] flex-col p-6 ${featured ? 'lg-elevated' : 'lg-inner'}`}
      style={delay(0.05 * index)}
    >
      <div className="relative z-10 mb-6 flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-neutral-400">{label}</span>
        <span
          className={`rounded-lg border border-white/5 bg-white/5 p-2 shadow-inner ${
            featured ? 'text-white' : 'text-neutral-400'
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="relative z-10 mt-auto break-words text-3xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>
      {delta !== undefined && delta !== null ? (
        <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2">
          <DeltaChip value={delta} />
          <span className="text-[11px] text-neutral-600">{t('dashboard.vsPrevious')}</span>
        </div>
      ) : hint ? (
        alert ? (
          <span className="relative z-10 mt-2 flex w-fit items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
            <span className="lg-dot animate-pulse" />
            {hint}
          </span>
        ) : (
          <p className="relative z-10 mt-2 text-xs text-neutral-500">{hint}</p>
        )
      ) : null}
    </div>
  )
}

/**
 * Etiqueta de variação do design system. Em despesa, subir é o sinal ruim:
 * alta em rosa, queda em esmeralda.
 */
function DeltaChip({ value }: { value: number }) {
  const subiu = value > 0
  const texto = `${subiu ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1).replace('.', ',')}%`

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
        subiu
          ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
      }`}
    >
      {texto}
    </span>
  )
}

/** Valor em reais com os centavos esmaecidos (o ".00" do design system). */
function Money({ value }: { value: number }) {
  const [inteiro, centavos] = formatCurrency(value).split(',')

  return (
    <>
      {inteiro}
      <span className="text-xl text-neutral-600">,{centavos}</span>
    </>
  )
}

/** Dica flutuante do gráfico: fundo #1a1b20, mês discreto, valor em destaque. */
function renderMonthTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-white/5 bg-lg-tooltip px-3 py-2 shadow-xl">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {formatCurrency(Number(payload[0].value ?? 0))}
      </p>
    </div>
  )
}

interface ChartCardProps {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
  index: number
  className?: string
}

function ChartCard({ title, aside, children, index, className }: ChartCardProps) {
  return (
    <section className={`lg-reveal lg-inner p-6 ${className ?? ''}`} style={delay(0.1 * index)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-neutral-500">
      {label}
    </div>
  )
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCompactCurrency(value: number) {
  return value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k` : `R$ ${value.toFixed(0)}`
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language).format(new Date(value))
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const [period, setPeriod] = useState<PeriodOption>('last180')
  const [filters, setFilters] = useState<DashboardFilters>(() => getPresetRange('last180'))
  const { vehicles } = useVehicleOptions()
  const { data, loading, error } = useDashboard(filters)
  const previousRange = getPreviousRange(filters)
  const { data: previous } = useDashboard(
    { ...filters, ...previousRange },
    { enabled: previousRange !== null },
  )

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { month: 'short' }),
    [i18n.language],
  )

  function updatePeriod(value: PeriodOption) {
    setPeriod(value)
    if (value === 'custom') return

    setFilters((current) => ({
      vehicleId: current.vehicleId,
      type: current.type,
      ...getPresetRange(value),
    }))
  }

  function updateFilter(key: keyof DashboardFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
    if (key === 'startDate' || key === 'endDate') setPeriod('custom')
  }

  function resetFilters() {
    setPeriod('last180')
    setFilters(getPresetRange('last180'))
  }

  if (error) return <p className="lg-alert lg-alert-error">{error}</p>

  const monthlyData =
    data?.expensesByMonth.map(({ month, total }) => {
      const [year, monthNumber] = month.split('-')
      const date = new Date(Number(year), Number(monthNumber) - 1, 1)

      return {
        month: `${monthFormatter.format(date).replace('.', '')}/${year.slice(2)}`,
        total,
      }
    }) ?? []

  const typeData =
    data?.expensesByType.map(({ type, total }) => ({
      name: t(`expenses.types.${type}`),
      value: total,
    })) ?? []

  const vehicleData =
    data?.expensesByVehicle.map(({ plate, total }) => ({
      vehicle: plate,
      total,
    })) ?? []

  const monthlyPeak = Math.max(0, ...monthlyData.map((entry) => entry.total))
  const typeTotal = typeData.reduce((sum, entry) => sum + entry.value, 0)
  const vehiclePeak = Math.max(0, ...vehicleData.map((entry) => entry.total))

  const documentAlerts = data
    ? data.summary.expiringDocuments + data.summary.expiredDocuments
    : 0

  const cards = data
    ? [
        {
          icon: <BarChart3 size={18} strokeWidth={1.5} />,
          label: t('dashboard.expenseCount'),
          value: String(data.summary.expenseCount),
          hint: t('dashboard.filteredRecords'),
          delta: percentChange(data.summary.expenseCount, previous?.summary.expenseCount),
        },
        {
          icon: <Calculator size={18} strokeWidth={1.5} />,
          label: t('dashboard.averageExpense'),
          value: <Money value={data.summary.averageExpense} />,
          hint: t('dashboard.perExpense'),
          delta: percentChange(data.summary.averageExpense, previous?.summary.averageExpense),
        },
        {
          icon: <Car size={18} strokeWidth={1.5} />,
          label: t('dashboard.vehicles'),
          value: String(data.summary.activeVehicles),
          hint: `${data.summary.totalVehicles} ${t('dashboard.totalRegistered')}`,
        },
        {
          icon: <Users size={18} strokeWidth={1.5} />,
          label: t('dashboard.drivers'),
          value: String(data.summary.activeDrivers),
          hint: `${data.summary.totalDrivers} ${t('dashboard.totalRegistered')}`,
        },
        {
          icon: <Wrench size={18} strokeWidth={1.5} />,
          label: t('dashboard.maintenances'),
          value: String(data.summary.pendingMaintenances),
          hint: t('dashboard.scheduledMaintenances'),
        },
        {
          icon: <AlertTriangle size={18} strokeWidth={1.5} />,
          label: t('dashboard.overdueMaintenances'),
          value: String(data.summary.overdueMaintenances),
          hint: t('dashboard.needsAction'),
          alert: data.summary.overdueMaintenances > 0,
        },
        {
          icon: <FileText size={18} strokeWidth={1.5} />,
          label: t('dashboard.documentAlerts'),
          value: String(documentAlerts),
          hint: `${data.summary.expiredDocuments} ${t('dashboard.expired')} · ${data.summary.expiringDocuments} ${t('dashboard.expiringSoon')}`,
          alert: documentAlerts > 0,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t(`dashboard.periods.${period}`)} title={t('dashboard.title')} />

      <section className="lg-inner space-y-4 p-4">
        <div>
          <span className="lg-label">{t('dashboard.filters.period')}</span>
          <Segmented
            value={period}
            onChange={updatePeriod}
            options={periodOptions.map((option) => ({
              value: option,
              label: t(`dashboard.periods.${option}`),
            }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-4 md:grid-cols-2 xl:grid-cols-5">
          <label>
            <span className="lg-label">{t('dashboard.filters.startDate')}</span>
            <input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(event) => updateFilter('startDate', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label>
            <span className="lg-label">{t('dashboard.filters.endDate')}</span>
            <input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(event) => updateFilter('endDate', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label>
            <span className="lg-label">{t('dashboard.filters.vehicle')}</span>
            <select
              value={filters.vehicleId ?? ''}
              onChange={(event) => updateFilter('vehicleId', event.target.value)}
              className={fieldClass}
            >
              <option value="">{t('expenses.filters.allVehicles')}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="lg-label">{t('dashboard.filters.type')}</span>
            <select
              value={filters.type ?? ''}
              onChange={(event) => updateFilter('type', event.target.value)}
              className={fieldClass}
            >
              <option value="">{t('expenses.filters.allTypes')}</option>
              {Object.values(ExpenseType).map((type) => (
                <option key={type} value={type}>
                  {t(`expenses.types.${type}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button type="button" onClick={resetFilters} className="lg-btn-ghost h-[38px] w-full">
              <RotateCcw size={14} strokeWidth={1.75} />
              {t('actions.reset')}
            </button>
          </div>
        </div>
      </section>

      {loading || !data ? (
        <LoadingState label={t('common.loading')} className="py-10" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              featured
              index={0}
              icon={<Receipt size={18} strokeWidth={1.5} />}
              label={t('dashboard.totalExpenses')}
              value={<Money value={data.summary.totalExpenses} />}
              hint={t('dashboard.filteredPeriod')}
              delta={percentChange(data.summary.totalExpenses, previous?.summary.totalExpenses)}
            />
            {cards.map((card, index) => (
              <SummaryCard key={card.label} index={index + 1} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard
              index={0}
              className="xl:col-span-2"
              title={t('dashboard.expensesByMonth')}
              aside={
                monthlyPeak > 0 ? (
                  <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                    <span className="text-emerald-500/80">{t('dashboard.peak')}</span>
                    <span className="tabular-nums text-neutral-400">{formatCurrency(monthlyPeak)}</span>
                  </span>
                ) : null
              }
            >
              {monthlyData.every((entry) => entry.total === 0) ? (
                <EmptyChart label={t('dashboard.noData')} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lg-area-emerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="month"
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      tickFormatter={formatCompactCurrency}
                    />
                    <ReferenceLine
                      y={monthlyPeak}
                      stroke="rgba(255,255,255,0.2)"
                      strokeDasharray="4 4"
                    />
                    <Tooltip
                      content={renderMonthTooltip}
                      cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#lg-area-emerald)"
                      className="drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                      dot={{ r: 3, fill: '#0c0d10', stroke: '#34d399', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#10b981', stroke: '#0c0d10', strokeWidth: 2 }}
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard index={1} title={t('dashboard.expensesByType')}>
              {typeData.length === 0 ? (
                <EmptyChart label={t('dashboard.noData')} />
              ) : (
                <div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    {typeData.map((entry, index) => (
                      <div
                        key={entry.name}
                        className="lg-bar-grow h-full"
                        style={{
                          width: `${typeTotal > 0 ? (entry.value / typeTotal) * 100 : 0}%`,
                          backgroundColor: TYPE_COLORS[index % TYPE_COLORS.length],
                          ...delay(index * 0.08),
                        }}
                      />
                    ))}
                  </div>

                  <ul className="mt-6 space-y-2">
                    {typeData.map((entry, index) => (
                      <li
                        key={entry.name}
                        className="lg-row flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: TYPE_COLORS[index % TYPE_COLORS.length] }}
                          />
                          <span className="truncate text-sm text-slate-300">{entry.name}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-2">
                          <span className="text-sm font-semibold tabular-nums text-white">
                            {formatCurrency(entry.value)}
                          </span>
                          <span className="w-12 text-right text-[11px] tabular-nums text-neutral-500">
                            {typeTotal > 0 ? `${((entry.value / typeTotal) * 100).toFixed(1)}%` : '—'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard index={0} title={t('dashboard.expensesByVehicle')}>
              {vehicleData.length === 0 ? (
                <EmptyChart label={t('dashboard.noData')} />
              ) : (
                <ul className="space-y-4">
                  {vehicleData.map((entry, index) => (
                    <li key={entry.vehicle}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 text-xs tabular-nums text-neutral-600">{index + 1}</span>
                          <span className="font-medium text-white">{entry.vehicle}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-white">
                          {formatCompactCurrency(entry.total)}
                        </span>
                      </div>
                      <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="lg-bar-grow h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          style={{
                            width: `${vehiclePeak > 0 ? (entry.total / vehiclePeak) * 100 : 0}%`,
                            ...delay(index * 0.08),
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>

            <ChartCard index={1} className="xl:col-span-2" title={t('dashboard.recentExpenses')}>
              {data.recentExpenses.length === 0 ? (
                <EmptyChart label={t('dashboard.noData')} />
              ) : (
                <div className="-mx-6 -mb-6 overflow-x-auto">
                  <table className="lg-table min-w-[560px]">
                    <thead>
                      <tr>
                        <th className="pl-6">{t('expenses.columns.date')}</th>
                        <th>{t('expenses.columns.vehicle')}</th>
                        <th>{t('expenses.columns.type')}</th>
                        <th className="pr-6 text-right">{t('expenses.columns.amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentExpenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="pl-6 tabular-nums text-neutral-500">
                            {formatDate(expense.date, i18n.language)}
                          </td>
                          <td className="font-medium text-white">{expense.vehiclePlate}</td>
                          <td>
                            <span className="lg-tag">{t(`expenses.types.${expense.type}`)}</span>
                          </td>
                          <td className="pr-6 text-right font-semibold tabular-nums text-white">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
