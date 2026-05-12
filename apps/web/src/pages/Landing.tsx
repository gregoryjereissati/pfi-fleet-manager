import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-white text-2xl font-bold">FM</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{t('landing.title')}</h1>
          <p className="text-gray-500">{t('landing.subtitle')}</p>
        </div>
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
          >
            {t('landing.login')}
          </Link>
          <Link
            to="/register"
            className="block w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            {t('landing.register')}
          </Link>
        </div>
      </div>
    </div>
  )
}
