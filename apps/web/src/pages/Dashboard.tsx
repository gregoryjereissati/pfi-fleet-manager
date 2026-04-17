import { useTranslation } from 'react-i18next'
import { Car, Users, Receipt, Wrench } from 'lucide-react'
import { dashboardMocks } from '@/mocks/dashboard'

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

export function Dashboard() {
  const { t } = useTranslation()

  const cards = [
    {
      icon: <Car size={28} />,
      label: t('dashboard.vehicles'),
      value: String(dashboardMocks.vehicles),
    },
    {
      icon: <Users size={28} />,
      label: t('dashboard.drivers'),
      value: String(dashboardMocks.drivers),
    },
    {
      icon: <Receipt size={28} />,
      label: t('dashboard.expenses'),
      value: `R$ ${dashboardMocks.expensesThisMonth.toLocaleString('pt-BR')}`,
    },
    {
      icon: <Wrench size={28} />,
      label: t('dashboard.maintenances'),
      value: String(dashboardMocks.pendingMaintenances),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  )
}
