import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth0 } from '@auth0/auth0-react'
import {
  LayoutDashboard,
  Car,
  Users,
  Receipt,
  Wrench,
  FileText,
  Bell,
  UserCog,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlertCount } from '@/hooks/useAlertCount'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { isAdminRole } from '@/lib/roles'

export function Sidebar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth0()
  const { count: alertCount } = useAlertCount()
  const { currentUser } = useCurrentUser()
  const isAdmin = isAdminRole(currentUser?.role)

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', enabled: true },
    { to: '/vehicles', icon: Car, labelKey: 'nav.vehicles', enabled: true },
    { to: '/drivers', icon: Users, labelKey: 'nav.drivers', enabled: true },
    { to: '/expenses', icon: Receipt, labelKey: 'nav.expenses', enabled: true },
    { to: '/maintenances', icon: Wrench, labelKey: 'nav.maintenances', enabled: true },
    { to: '/documents', icon: FileText, labelKey: 'nav.documents', enabled: true },
    { to: '/alerts', icon: Bell, labelKey: 'nav.alerts', enabled: true },
    { to: '/users', icon: UserCog, labelKey: 'nav.users', enabled: isAdmin },
  ]

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">FM</span>
          </div>
          <span className="font-bold text-gray-900">{t('app.name')}</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, labelKey, enabled }) =>
          enabled ? (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100',
                )
              }
            >
              <Icon size={17} />
              <span className="flex-1">{t(labelKey)}</span>
              {(to === '/documents' || to === '/alerts') && alertCount > 0 && (
                <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                  {alertCount}
                </span>
              )}
            </NavLink>
          ) : (
            <div
              key={to}
              title={t('nav.comingSoon')}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed select-none"
            >
              <Icon size={17} />
              {t(labelKey)}
            </div>
          ),
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          {user?.picture && (
            <img
              src={user.picture}
              alt={user.name ?? ''}
              className="w-7 h-7 rounded-full shrink-0"
            />
          )}
          <span className="text-sm font-medium text-gray-700 truncate">
            {user?.name}
          </span>
        </div>
        <button
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={15} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
