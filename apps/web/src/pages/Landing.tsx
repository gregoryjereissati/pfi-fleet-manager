import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-fleet-black">
      <div className="text-center space-y-6 max-w-sm px-4">
        <img src="/logo.svg" width="64" height="64" alt="Fleet Manager" className="mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{t('landing.title')}</h1>
          <p className="text-white/45">{t('landing.subtitle')}</p>
        </div>
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full px-6 py-3 bg-gold text-fleet-black rounded-lg font-semibold hover:bg-gold-hover transition-colors text-center"
          >
            {t('landing.login')}
          </Link>
          <Link
            to="/register"
            className="block w-full px-6 py-3 bg-transparent text-white/70 border border-white/[0.12] rounded-lg font-medium hover:bg-white/[0.04] transition-colors text-center"
          >
            {t('landing.register')}
          </Link>
        </div>
      </div>
    </div>
  )
}
