import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAlertCount } from '@/hooks/useAlertCount'

const pageTitleMatchers: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/dashboard$/, key: 'dashboard.title' },
  { pattern: /^\/vehicles(?:\/.*)?$/, key: 'vehicles.title' },
  { pattern: /^\/drivers(?:\/.*)?$/, key: 'drivers.title' },
  { pattern: /^\/expenses(?:\/.*)?$/, key: 'expenses.title' },
  { pattern: /^\/maintenances(?:\/.*)?$/, key: 'maintenances.title' },
  { pattern: /^\/documents(?:\/.*)?$/, key: 'documents.title' },
  { pattern: /^\/alerts$/, key: 'alerts.title' },
  { pattern: /^\/profile$/, key: 'profile.title' },
]

export function Header() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { count } = useAlertCount()

  const toggleLanguage = () => {
    const next = i18n.language === 'pt-BR' ? 'en-US' : 'pt-BR'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const titleKey =
    pageTitleMatchers.find(({ pattern }) => pattern.test(pathname))?.key ?? 'app.name'

  return (
    <header className="h-14 bg-fleet-darker border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
      <h2 className="text-sm font-semibold text-white/80">{t(titleKey)}</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/alerts')}
          className="relative text-white/40 transition-colors hover:text-white/70"
          aria-label={t('alerts.title')}
        >
          <Bell size={17} />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500/80 px-1 py-0.5 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </button>
        <button
          onClick={toggleLanguage}
          className="text-xs font-semibold text-white/40 hover:text-white/70 border border-white/[0.1] rounded px-2 py-1 transition-colors"
        >
          {t('lang.switch')}
        </button>
      </div>
    </header>
  )
}
