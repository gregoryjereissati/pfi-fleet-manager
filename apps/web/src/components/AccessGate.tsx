import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { signOut } from '@/lib/supabase'

interface AccessGateProps {
  children: React.ReactNode
}

export function AccessGate({ children }: AccessGateProps) {
  const { t } = useTranslation()
  const { currentUser, loading, error } = useCurrentUser()

  function handleLogout() {
    void signOut().then(() => window.location.replace('/'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-gray-500 text-sm">{t('common.loading')}</span>
      </div>
    )
  }

  // Conta de acesso válida, mas sem perfil no Fleet Manager: o cadastro foi
  // interrompido entre a criação da conta e o envio dos dados cadastrais.
  if (error === 'PROFILE_NOT_FOUND') {
    return <Navigate to="/register?completar=true" replace />
  }

  if (error === 'PENDING_APPROVAL') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 max-w-sm px-6 py-10 bg-white rounded-xl shadow border border-gray-200">
          <div className="flex justify-center">
            <span className="text-5xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('pending.title')}</h1>
          <p className="text-sm text-gray-500">{t('pending.message')}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {t('pending.logout')}
          </button>
        </div>
      </div>
    )
  }

  if (error === 'BLOCKED') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 max-w-sm px-6 py-10 bg-white rounded-xl shadow border border-red-200">
          <div className="flex justify-center">
            <span className="text-5xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold text-red-700">{t('blocked.title')}</h1>
          <p className="text-sm text-gray-500">{t('blocked.message')}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('blocked.logout')}
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  return <>{children}</>
}
