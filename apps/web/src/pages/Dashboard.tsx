import { useTranslation } from 'react-i18next'
import { Car, FileText, Receipt, Users, Wrench } from 'lucide-react'
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
import { useDashboard } from '@/hooks/useDashboard'

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function SummaryCard({ icon, label, value }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center gap-4">
      <div className="text-blue-600 shrink-0">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useDashboard()

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error || !data) return <p className="text-red-500">{error ?? 'Failed to load dashboard.'}</p>

  const monthFormatter = new Intl.DateTimeFormat(i18n.language, { month: 'short' })

  const cards = [
    {
      icon: <Car size={28} />,
      label: t('dashboard.vehicles'),
      value: String(data.summary.activeVehicles),
    },
    {
      icon: <Users size={28} />,
      label: t('dashboard.drivers'),
      value: String(data.summary.activeDrivers),
    },
    {
      icon: <Receipt size={28} />,
      label: t('dashboard.expenses'),
      value: formatCurrency(data.summary.expensesThisMonth),
    },
    {
      icon: <Wrench size={28} />,
      label: t('dashboard.maintenances'),
      value: String(data.summary.pendingMaintenances),
    },
    {
      icon: <FileText size={28} />,
      label: t('dashboard.expiringDocuments'),
      value: String(data.summary.expiringDocuments),
    },
  ]

  const monthlyData = data.expensesByMonth.map(({ month, total }) => {
    const [year, monthNumber] = month.split('-')
    const date = new Date(Number(year), Number(monthNumber) - 1, 1)

    return {
      month: `${monthFormatter.format(date).replace('.', '')}/${year.slice(2)}`,
      total,
    }
  })

  const typeData = data.expensesByType.map(({ type, total }) => ({
    name: t(`expenses.types.${type}`),
    value: total,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            {t('dashboard.expensesByMonth')}
          </h2>

          {monthlyData.every((entry) => entry.total === 0) ? (
            <p className="text-sm text-gray-400">{t('dashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))
                  }
                />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            {t('dashboard.expensesByType')}
          </h2>

          {typeData.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={84}
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  )
}
