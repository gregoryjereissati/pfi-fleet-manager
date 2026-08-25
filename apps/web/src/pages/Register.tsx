import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserRole } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'

export function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    requestedRole: UserRole.OPERATOR as UserRole,
    addressStreet: '',
    addressNumber: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cpfDigits = form.cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      setError(t('register.validation.cpf'))
      return
    }
    if (form.password !== form.confirmPassword) {
      setError(t('register.error.passwordMismatch'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/auth/register', '', {
        method: 'POST',
        body: JSON.stringify({ ...form, cpf: cpfDigits }),
      })
      navigate('/login?registered=true', { replace: true })
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('network')) {
        setError(t('register.error.network'))
      } else if (msg.includes('EMAIL_TAKEN')) {
        setError(t('register.error.emailTaken'))
      } else if (msg.includes('CPF_TAKEN')) {
        setError(t('register.error.cpfTaken'))
      } else if (msg.includes('Invalid data')) {
        setError(t('register.error.invalidData'))
      } else {
        setError(t('register.error.generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

  return (
    <div className="flex items-center justify-center min-h-screen bg-fleet-black py-8">
      <div className="w-full max-w-lg px-6 py-8 bg-fleet-card rounded-xl border border-white/[0.07] space-y-6">
        <div className="text-center space-y-1">
          <img src="/logo.svg" width="40" height="40" alt="Fleet Manager" className="mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">{t('register.title')}</h1>
          <p className="text-sm text-white/40">{t('register.subtitle')}</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.name')}</label>
              <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.cpf')}</label>
              <input type="text" required value={form.cpf} onChange={(e) => set('cpf', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.phone')}</label>
              <input type="text" required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.email')}</label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.password')}</label>
              <input type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/55">{t('register.confirmPassword')}</label>
              <input type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white/55">{t('register.address')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressStreet')}</label>
                <input type="text" required value={form.addressStreet} onChange={(e) => set('addressStreet', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressNumber')}</label>
                <input type="text" required value={form.addressNumber} onChange={(e) => set('addressNumber', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressDistrict')}</label>
                <input type="text" required value={form.addressDistrict} onChange={(e) => set('addressDistrict', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressCity')}</label>
                <input type="text" required value={form.addressCity} onChange={(e) => set('addressCity', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressState')}</label>
                <input type="text" required maxLength={2} value={form.addressState} onChange={(e) => set('addressState', e.target.value.toUpperCase())} className={inputClass} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-white/55">{t('register.addressZip')}</label>
                <input type="text" required value={form.addressZip} onChange={(e) => set('addressZip', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white/55">{t('register.role')}</p>
            <div className="flex gap-6">
              {[UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR].map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="requestedRole"
                    value={role}
                    checked={form.requestedRole === role}
                    onChange={() => set('requestedRole', role)}
                  />
                  <span className="text-sm text-white/60">{t(`users.roles.${role}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover disabled:opacity-50 transition-colors"
          >
            {loading ? t('actions.saving') : t('register.submit')}
          </button>
        </form>

        <p className="text-center text-sm text-white/40">
          <Link to="/login" className="text-gold hover:underline">
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
