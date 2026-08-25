import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '@/lib/api'
import type { AuthResponseDto } from '@fleet-manager/shared'

const inputClass =
  'w-full rounded-lg bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const registered = params.get('registered') === 'true'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch<AuthResponseDto>('/auth/login', '', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('fm_token', data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('PENDING_APPROVAL')) setError(t('login.error.pending'))
      else if (msg.includes('BLOCKED')) setError(t('login.error.blocked'))
      else setError(t('login.error.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-fleet-black">
      <div className="w-full max-w-sm px-6 py-8 bg-fleet-card rounded-xl border border-white/[0.07] space-y-6">
        <div className="text-center space-y-1">
          <img src="/logo.svg" width="40" height="40" alt="Fleet Manager" className="mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">{t('login.title')}</h1>
        </div>

        {registered && (
          <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-center">
            {t('login.registered')}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/55">{t('login.email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/55">{t('login.password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover disabled:opacity-50 transition-colors"
          >
            {loading ? t('actions.saving') : t('login.submit')}
          </button>
        </form>

        <p className="text-center text-sm text-white/40">
          <Link to="/register" className="text-gold hover:underline">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
