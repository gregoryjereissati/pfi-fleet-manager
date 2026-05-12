import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '@/lib/api'
import type { AuthResponseDto } from '@fleet-manager/shared'

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm px-6 py-8 bg-white rounded-xl shadow border border-gray-200 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-sm">FM</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('login.title')}</h1>
        </div>

        {registered && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            {t('login.registered')}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('login.email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('login.password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('actions.saving') : t('login.submit')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link to="/register" className="text-blue-600 hover:underline">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
