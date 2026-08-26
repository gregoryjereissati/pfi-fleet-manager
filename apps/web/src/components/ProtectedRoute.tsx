import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Libera a rota apenas quando existe sessão ativa no Supabase Auth.
 *
 * A verificação é assíncrona porque o cliente do Supabase restaura a sessão
 * a partir do armazenamento local ao iniciar a aplicação.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAuthenticated(Boolean(data.session))
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthenticated(Boolean(session))
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-fleet-black">
        <span className="text-white/40 text-sm">{t('common.loading')}</span>
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
