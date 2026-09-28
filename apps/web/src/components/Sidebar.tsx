import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signOut } from '@/lib/supabase'
import {
  LayoutDashboard,
  Car,
  Users,
  Receipt,
  Wrench,
  FileText,
  Bell,
  UserCog,
  Building2,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlertCount } from '@/hooks/useAlertCount'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { isAdminRole } from '@/lib/roles'
import { BrandMark } from '@/components/ledger/Ui'

interface SidebarProps {
  /** Aberta como gaveta, em telas estreitas. Em telas largas fica sempre à vista. */
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
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
    // Tela de plataforma: existe acima das empresas, e só o super
    // administrador tem o que fazer nela.
    {
      to: '/companies',
      icon: Building2,
      labelKey: 'nav.companies',
      enabled: Boolean(currentUser?.isSuperAdmin),
    },
  ]

  function handleLogout() {
    // Aguarda o encerramento da sessão antes de sair, para que o token não
    // permaneça no armazenamento local após a navegação.
    void signOut().then(() => window.location.replace('/'))
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/5 bg-lg-app/95 backdrop-blur-md transition-transform duration-300 ease-spring lg:static lg:z-auto lg:translate-x-0 lg:bg-lg-app/80',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <BrandMark size={26} />
          <button
            type="button"
            onClick={onClose}
            className="lg-icon-btn lg:hidden"
            aria-label={t('nav.closeMenu')}
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {navItems.map(({ to, icon: Icon, labelKey, enabled }) =>
            enabled ? (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-white/5 bg-white/5 text-white'
                      : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="flex-1">{t(labelKey)}</span>
                {(to === '/documents' || to === '/alerts') && alertCount > 0 && (
                  <span className="lg-count">{alertCount}</span>
                )}
              </NavLink>
            ) : (
              <div
                key={to}
                title={t('nav.comingSoon')}
                className="flex cursor-not-allowed select-none items-center gap-3 rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-neutral-700"
              >
                <Icon size={16} strokeWidth={1.5} />
                {t(labelKey)}
              </div>
            ),
          )}
        </nav>

        <div className="space-y-2 border-t border-white/5 p-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                isActive ? 'border-white/5 bg-white/5' : 'border-transparent hover:bg-white/5',
              )
            }
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-medium text-emerald-400 ring-1 ring-white/10">
              {currentUser?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">
                {currentUser?.name}
              </span>
              <span className="block truncate text-xs text-neutral-500">{t('nav.profile')}</span>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={15} strokeWidth={1.5} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
