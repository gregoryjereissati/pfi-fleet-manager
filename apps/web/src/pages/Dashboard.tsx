import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExpenseType } from '@fleet-manager/shared'
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Car,
  FileText,
  Filter,
  Receipt,
  RotateCcw,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboard, type DashboardFilters } from '@/hooks/useDashboard'
import { useVehicles } from '@/hooks/useVehicles'

const PIE_COLORS = ['#C4A35A', '#4ADE80', '#F87171', '#60A5FA', '#A78BFA', '#94A3B8']

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1C1C1C',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  color: '#ffffff',
  fontFamily: '"Playfair Display", serif',
}

const CHART_TICK = {
  fill: 'rgba(255,255,255,0.35)',
  fontSize: 11,
  fontFamily: '"Playfair Display", serif',
}

const fieldClass =
  'h-10 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition focus:border-gold/60'

const periodOptions = ['last30', 'last90', 'last180', 'year', 'all', 'custom'] as const
type PeriodOption = (typeof periodOptions)[number]

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
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

function SummaryCard({ icon, label, value, hint }: SummaryCardProps) {
  return (
    <div className="flex min-h-[132px] items-center gap-4 rounded-lg border border-white/[0.07] bg-fleet-card p-5">
      <div className="shrink-0 text-gold">{icon}</div>
      <div className="min-w-0">
        <p className="mb-1 text-sm text-white/45">{label}</p>
        <p className="break-words text-2xl font-bold text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-white/30">{hint}</p> : null}
      </div>
    </div>
  )
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language).format(new Date(value))
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const [period, setPeriod] = useState<PeriodOption>('last180')
  const [filters, setFilters] = useState<DashboardFilters>(() => getPresetRange('last180'))
  const { vehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const { data, loading, error } = useDashboard(filters)

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

  if (error) return <p className="text-red-400">{error}</p>

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

  const documentAlerts = data
    ? data.summary.expiringDocuments + data.summary.expiredDocuments
    : 0

  const cards = data
    ? [
        {
          icon: <Receipt size={26} />,
          label: t('dashboard.totalExpenses'),
          value: formatCurrency(data.summary.totalExpenses),
          hint: t('dashboard.filteredPeriod'),
        },
        {
          icon: <BarChart3 size={26} />,
          label: t('dashboard.expenseCount'),
          value: String(data.summary.expenseCount),
          hint: t('dashboard.filteredRecords'),
        },
        {
          icon: <Calculator size={26} />,
          label: t('dashboard.averageExpense'),
          value: formatCurrency(data.summary.averageExpense),
          hint: t('dashboard.perExpense'),
        },
        {
          icon: <Car size={26} />,
          label: t('dashboard.vehicles'),
          value: String(data.summary.activeVehicles),
          hint: `${data.summary.totalVehicles} ${t('dashboard.totalRegistered')}`,
        },
        {
          icon: <Users size={26} />,
          label: t('dashboard.drivers'),
          value: String(data.summary.activeDrivers),
          hint: `${data.summary.totalDrivers} ${t('dashboard.totalRegistered')}`,
        },
        {
          icon: <Wrench size={26} />,
          label: t('dashboard.maintenances'),
          value: String(data.summary.pendingMaintenances),
          hint: t('dashboard.scheduledMaintenances'),
        },
        {
          icon: <AlertTriangle size={26} />,
          label: t('dashboard.overdueMaintenances'),
          value: String(data.summary.overdueMaintenances),
          hint: t('dashboard.needsAction'),
        },
        {
          icon: <FileText size={26} />,
          label: t('dashboard.documentAlerts'),
          value: String(documentAlerts),
          hint: `${data.summary.expiredDocuments} ${t('dashboard.expired')} · ${data.summary.expiringDocuments} ${t('dashboard.expiringSoon')}`,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1">
            <span className="text-xs font-medium text-white/45">{t('dashboard.filters.period')}</span>
            <select
              value={period}
              onChange={(event) => updatePeriod(event.target.value as PeriodOption)}
              className={fieldClass}
            >
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`dashboard.periods.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-white/45">{t('dashboard.filters.startDate')}</span>
            <input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(event) => updateFilter('startDate', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-white/45">{t('dashboard.filters.endDate')}</span>
            <input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(event) => updateFilter('endDate', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-white/45">{t('dashboard.filters.vehicle')}</span>
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

          <label className="space-y-1">
            <span className="text-xs font-medium text-white/45">{t('dashboard.filters.type')}</span>
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

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] px-3 text-sm font-medium text-white/70 transition hover:border-gold/50 hover:text-gold"
            >
              <RotateCcw size={16} />
              {t('actions.reset')}
            </button>
            <div className="hidden h-10 w-10 items-center justify-center rounded-md border border-gold/30 text-gold xl:flex">
              <Filter size={17} />
            </div>
          </div>
        </div>
      </section>

      {loading || !data ? (
        <p className="text-white/40">{t('common.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/50">
                {t('dashboard.expensesByMonth')}
              </h2>

              {monthlyData.every((entry) => entry.total === 0) ? (
                <p className="text-sm text-white/30">{t('dashboard.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`
                      }
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(value) =>
                        formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))
                      }
                    />
                    <Bar dataKey="total" fill="#C4A35A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/50">
                {t('dashboard.expensesByType')}
              </h2>

              {typeData.length === 0 ? (
                <p className="text-sm text-white/30">{t('dashboard.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={84}>
                      {typeData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      wrapperStyle={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: 12,
                        fontFamily: '"Playfair Display", serif',
                      }}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value) =>
                        formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/50">
                {t('dashboard.expensesByVehicle')}
              </h2>

              {vehicleData.length === 0 ? (
                <p className="text-sm text-white/30">{t('dashboard.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={vehicleData} layout="vertical" margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <XAxis
                      type="number"
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="vehicle"
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(value) =>
                        formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))
                      }
                    />
                    <Bar dataKey="total" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="rounded-lg border border-white/[0.07] bg-fleet-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/50">
                {t('dashboard.recentExpenses')}
              </h2>

              {data.recentExpenses.length === 0 ? (
                <p className="text-sm text-white/30">{t('dashboard.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs uppercase text-white/35">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t('expenses.columns.date')}</th>
                        <th className="px-3 py-2 font-medium">{t('expenses.columns.vehicle')}</th>
                        <th className="px-3 py-2 font-medium">{t('expenses.columns.type')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('expenses.columns.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {data.recentExpenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-3 py-3 text-white/55">
                            {formatDate(expense.date, i18n.language)}
                          </td>
                          <td className="px-3 py-3 text-white/70">{expense.vehiclePlate}</td>
                          <td className="px-3 py-3 text-white/70">
                            {t(`expenses.types.${expense.type}`)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-white">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
