import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

  function handleLogout() {
    localStorage.removeItem('fm_token')
    window.location.replace('/')
  }

  return (
    <aside className="w-60 bg-fleet-darker border-r border-white/[0.06] flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" width="30" height="30" alt="Fleet Manager" className="shrink-0" />
          <span className="font-bold text-white tracking-wide">{t('app.name')}</span>
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
                    ? 'bg-gold/10 text-gold border-l-2 border-gold pl-[10px]'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80',
                )
              }
            >
              <Icon size={16} />
              <span className="flex-1">{t(labelKey)}</span>
              {(to === '/documents' || to === '/alerts') && alertCount > 0 && (
                <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500/80 px-1.5 py-0.5 text-xs font-bold text-white">
                  {alertCount}
                </span>
              )}
            </NavLink>
          ) : (
            <div
              key={to}
              title={t('nav.comingSoon')}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/20 cursor-not-allowed select-none"
            >
              <Icon size={16} />
              {t(labelKey)}
            </div>
          ),
        )}
      </nav>

      <div className="p-4 border-t border-white/[0.06] space-y-3">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 min-w-0 rounded-md px-2 py-2 transition-colors',
              isActive
                ? 'bg-gold/10 text-gold border-l-2 border-gold pl-[6px]'
                : 'hover:bg-white/[0.04]',
            )
          }
        >
          <div className="w-7 h-7 bg-gold/20 rounded-full flex items-center justify-center shrink-0 border border-gold/30">
            <span className="text-gold text-xs font-bold">
              {currentUser?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-medium text-white/70 truncate">
              {currentUser?.name}
            </span>
            <span className="block text-xs text-white/35 truncate">{t('nav.profile')}</span>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors"
        >
          <LogOut size={14} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
