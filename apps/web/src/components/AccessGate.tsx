import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { signOut } from '@/lib/supabase'
import { CompanyPicker } from '@/components/CompanyPicker'
import { definirEmpresaAtiva, empresaAtiva } from '@/lib/empresa-ativa'

interface AccessGateProps {
  children: React.ReactNode
}

/** Situações em que a conta é válida, mas o acesso não está liberado. */
const BLOQUEIOS = {
  PENDING_APPROVAL: { tone: 'neutro', icon: '⏳', key: 'pending' },
  REJECTED: { tone: 'alerta', icon: '🚫', key: 'rejected' },
  BLOCKED: { tone: 'alerta', icon: '🚫', key: 'blocked' },
  NO_COMPANY: { tone: 'neutro', icon: '🏢', key: 'noCompany' },
  COMPANY_INACTIVE: { tone: 'neutro', icon: '🏢', key: 'companyInactive' },
} as const

type CodigoBloqueio = keyof typeof BLOQUEIOS

export function AccessGate({ children }: AccessGateProps) {
  const { t } = useTranslation()
  const { currentUser, loading, error } = useCurrentUser()

  // A empresa escolhida some do sistema — excluída ou nunca existiu — e toda
  // requisição passa a falhar. Descartar a escolha devolve a pessoa à tela de
  // seleção, em vez de deixá-la presa numa tela de erro.
  useEffect(() => {
    if (error === 'COMPANY_NOT_FOUND') definirEmpresaAtiva(null)
  }, [error])

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

  const bloqueio = error && error in BLOQUEIOS ? BLOQUEIOS[error as CodigoBloqueio] : null

  if (bloqueio) {
    const alerta = bloqueio.tone === 'alerta'

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div
          className={`text-center space-y-4 max-w-sm px-6 py-10 bg-white rounded-xl shadow border ${
            alerta ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-center">
            <span className="text-5xl">{bloqueio.icon}</span>
          </div>
          <h1 className={`text-xl font-bold ${alerta ? 'text-red-700' : 'text-gray-900'}`}>
            {t(`${bloqueio.key}.title`)}
          </h1>
          <p className="text-sm text-gray-500">{t(`${bloqueio.key}.message`)}</p>
          <button
            onClick={handleLogout}
            className={`mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-white ${
              alerta ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {t('pending.logout')}
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  // O super administrador não pertence a empresa alguma: enquanto não escolher
  // uma, não há recorte e o servidor recusa tudo o que é operacional. A escolha
  // é uma etapa do fluxo, não um erro.
  if (currentUser.isSuperAdmin && !empresaAtiva()) {
    return <CompanyPicker />
  }

  return <>{children}</>
}
