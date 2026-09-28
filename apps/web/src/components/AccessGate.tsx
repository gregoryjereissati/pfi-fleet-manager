import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { signOut } from '@/lib/supabase'
import { CompanyPicker } from '@/components/CompanyPicker'
import { definirEmpresaAtiva, empresaAtiva } from '@/lib/empresa-ativa'
import { BrandMark, LoadingState } from '@/components/ledger/Ui'

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
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label={t('common.loading')} />
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div
          className={`lg-in w-full max-w-sm space-y-6 rounded-3xl border bg-lg-card p-8 text-center shadow-2xl ${
            alerta ? 'border-rose-500/20' : 'border-white/10'
          }`}
        >
          <div className="flex justify-center">
            <BrandMark size={28} />
          </div>
          <div className="flex justify-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl ${
                alerta ? 'border-rose-500/20 bg-rose-500/10' : 'border-white/5 bg-white/[0.03]'
              }`}
            >
              {bloqueio.icon}
            </span>
          </div>
          <div className="space-y-2">
            <h1
              className={`text-2xl font-light tracking-tight ${
                alerta ? 'text-rose-400' : 'text-white'
              }`}
            >
              {t(`${bloqueio.key}.title`)}
            </h1>
            <p className="lg-muted text-sm leading-relaxed">{t(`${bloqueio.key}.message`)}</p>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full ${alerta ? 'lg-btn-ghost lg-btn-danger' : 'lg-btn-ghost'}`}
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
