import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signIn } from '@/lib/supabase'
import { BrandMark } from '@/components/ledger/Ui'

const inputClass = 'lg-input w-full'

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
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = (err as Error).message.toLowerCase()
      if (msg.includes('email not confirmed')) setError(t('login.error.emailNotConfirmed'))
      else if (msg.includes('failed to fetch') || msg.includes('network')) {
        setError(t('login.error.network'))
      } else setError(t('login.error.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="lg-in lg-flashlight group w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-lg-card shadow-2xl">
        <div className="relative z-10 space-y-7 p-8">
          <div className="space-y-6">
            <Link to="/" className="inline-flex">
              <BrandMark size={28} />
            </Link>
            <h1 className="text-3xl font-light leading-[1.1] tracking-tight text-white">
              {t('login.title')}
            </h1>
          </div>

          {registered && <p className="lg-alert lg-alert-ok">{t('login.registered')}</p>}

          {error && <p className="lg-alert lg-alert-error">{error}</p>}

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div>
              <label className="lg-label">{t('login.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="lg-label">{t('login.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="shiny-cta shiny-cta-sm w-full">
                {loading ? t('actions.saving') : t('login.submit')}
              </button>
            </div>
          </form>

          <p className="border-t border-white/5 pt-6 text-center">
            <Link to="/register" className="lg-link">
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
