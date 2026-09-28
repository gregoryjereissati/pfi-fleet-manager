import { useTranslation } from 'react-i18next'
import { Bell, Building2, ChevronDown, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAlertCount } from '@/hooks/useAlertCount'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { definirEmpresaAtiva } from '@/lib/empresa-ativa'

const pageTitleMatchers: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/dashboard$/, key: 'dashboard.title' },
  { pattern: /^\/vehicles(?:\/.*)?$/, key: 'vehicles.title' },
  { pattern: /^\/drivers(?:\/.*)?$/, key: 'drivers.title' },
  { pattern: /^\/expenses(?:\/.*)?$/, key: 'expenses.title' },
  { pattern: /^\/maintenances(?:\/.*)?$/, key: 'maintenances.title' },
  { pattern: /^\/documents(?:\/.*)?$/, key: 'documents.title' },
  { pattern: /^\/alerts$/, key: 'alerts.title' },
  { pattern: /^\/profile$/, key: 'profile.title' },
  { pattern: /^\/users$/, key: 'users.title' },
  { pattern: /^\/companies$/, key: 'companies.title' },
]

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { count } = useAlertCount()
  const { currentUser } = useCurrentUser()

  const toggleLanguage = () => {
    const next = i18n.language === 'pt-BR' ? 'en-US' : 'pt-BR'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const titleKey =
    pageTitleMatchers.find(({ pattern }) => pattern.test(pathname))?.key ?? 'app.name'

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/5 bg-lg-app/80 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg-icon-btn shrink-0 lg:hidden"
          aria-label={t('nav.openMenu')}
        >
          <Menu size={17} strokeWidth={1.5} />
        </button>
        {/*
          A empresa em que se está trabalhando nunca foi exibida. Para quem
          pertence a uma só, é informação de contexto; para o super
          administrador, é o que distingue uma tela idêntica da outra.
        */}
        {currentUser?.companyName && (
          <>
            <span className="hidden min-w-0 items-center gap-2 text-neutral-500 sm:flex">
              <Building2 size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{currentUser.companyName}</span>
            </span>
            <span className="hidden text-neutral-700 sm:inline">/</span>
          </>
        )}
        <h2 className="truncate font-medium text-white">{t(titleKey)}</h2>
      </div>
      <div className="flex items-center gap-3">
        {currentUser?.isSuperAdmin && (
          <button
            onClick={() => {
              definirEmpresaAtiva(null)
              window.location.replace('/dashboard')
            }}
            className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-white/5 bg-white/5 px-3 text-xs text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            title={t('companySwitch.hint')}
            aria-label={t('companySwitch.action')}
          >
            <Building2 size={14} strokeWidth={1.5} className="sm:hidden" />
            <span className="hidden sm:inline">{t('companySwitch.action')}</span>
            <ChevronDown size={12} />
          </button>
        )}
        <button
          onClick={() => navigate('/alerts')}
          className="lg-icon-btn"
          aria-label={t('alerts.title')}
        >
          <Bell size={17} strokeWidth={1.5} />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-lg-app bg-yellow-400" />
          )}
        </button>
        <button
          onClick={toggleLanguage}
          className="flex h-9 items-center rounded-lg border border-white/5 bg-white/5 px-3 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          {t('lang.switch')}
        </button>
      </div>
    </header>
  )
}
