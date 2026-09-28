import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserRole, UserStatus } from '@fleet-manager/shared'
import type { RegisterProfileResponseDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { getAccessToken, hasSession, signIn, signUp } from '@/lib/supabase'
import { BrandMark } from '@/components/ledger/Ui'

export function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Modo "completar cadastro": a conta de acesso já existe no Supabase, mas o
  // perfil da aplicação não chegou a ser criado.
  const completingProfile = params.get('completar') === 'true'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyJoinCode: '',
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
    if (!completingProfile && form.password !== form.confirmPassword) {
      setError(t('register.error.passwordMismatch'))
      return
    }
    setError(null)
    setLoading(true)

    try {
      // Etapa 1 — garantir a conta de acesso no Supabase Auth.
      if (!(await hasSession())) {
        try {
          const sessionStarted = await signUp(form.email, form.password)
          if (!sessionStarted) {
            // O projeto Supabase exige confirmação de e-mail. Sem ela não há
            // token para criar o perfil na etapa seguinte.
            setError(t('register.error.emailConfirmationRequired'))
            return
          }
        } catch (signUpError) {
          const msg = (signUpError as Error).message.toLowerCase()
          if (msg.includes('already registered') || msg.includes('already exists')) {
            // A conta já existe: autentica para vincular o perfil a ela.
            try {
              await signIn(form.email, form.password)
            } catch {
              setError(t('register.error.emailTaken'))
              return
            }
          } else {
            throw signUpError
          }
        }
      }

      // Etapa 2 — criar o perfil da aplicação vinculado à conta autenticada.
      const token = await getAccessToken()
      const { password: _password, confirmPassword: _confirmPassword, ...profile } = form

      const result = await apiFetch<RegisterProfileResponseDto>('/auth/register', token, {
        method: 'POST',
        body: JSON.stringify({ ...profile, cpf: cpfDigits }),
      })

      // Um perfil vinculado a cadastro preexistente já aprovado dispensa a
      // espera; nesse caso a sessão criada acima já dá acesso ao sistema.
      if (result.user?.status === UserStatus.ACTIVE) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login?registered=true', { replace: true })
      }
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('network')) {
        setError(t('register.error.network'))
      } else if (msg.includes('EMAIL_TAKEN') || msg.includes('PROFILE_ALREADY_EXISTS')) {
        setError(t('register.error.emailTaken'))
      } else if (msg.includes('CPF_TAKEN')) {
        setError(t('register.error.cpfTaken'))
      } else if (msg.includes('COMPANY_NOT_FOUND')) {
        setError(t('register.error.companyNotFound'))
      } else if (msg.includes('COMPANY_MISMATCH')) {
        setError(t('register.error.companyMismatch'))
      } else if (msg.includes('Invalid data')) {
        setError(t('register.error.invalidData'))
      } else if (msg.toLowerCase().includes('password')) {
        setError(t('register.error.weakPassword'))
      } else {
        setError(t('register.error.generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'lg-input w-full'

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="lg-in lg-flashlight group w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-lg-card shadow-2xl">
        <div className="relative z-10 space-y-7 p-8">
          <div className="space-y-6">
            <Link to="/" className="inline-flex">
              <BrandMark size={28} />
            </Link>
            <div>
              <h1 className="text-3xl font-light leading-[1.1] tracking-tight text-white">
                {t('register.title')}
              </h1>
              <p className="lg-muted mt-2 text-base">{t('register.subtitle')}</p>
            </div>
          </div>

          {error && <p className="lg-alert lg-alert-error">{error}</p>}

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5">
            <div>
              <label className="lg-label">
                {t('register.companyJoinCode')}
              </label>
              <input
                type="text"
                required
                value={form.companyJoinCode}
                onChange={(e) => set('companyJoinCode', e.target.value.toUpperCase())}
                className={inputClass}
                placeholder={t('register.companyJoinCodePlaceholder')}
              />
              <p className="mt-1.5 text-xs text-neutral-500">{t('register.companyJoinCodeHelp')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="lg-label">{t('register.name')}</label>
                <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="lg-label">{t('register.cpf')}</label>
                <input type="text" required value={form.cpf} onChange={(e) => set('cpf', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="lg-label">{t('register.phone')}</label>
                <input type="text" required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="lg-label">{t('register.email')}</label>
                <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="lg-label">{t('register.password')}</label>
                <input type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="lg-label">{t('register.confirmPassword')}</label>
                <input type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-6">
              <p className="text-base font-semibold tracking-tight text-white">{t('register.address')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="lg-label">{t('register.addressStreet')}</label>
                  <input type="text" required value={form.addressStreet} onChange={(e) => set('addressStreet', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="lg-label">{t('register.addressNumber')}</label>
                  <input type="text" required value={form.addressNumber} onChange={(e) => set('addressNumber', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="lg-label">{t('register.addressDistrict')}</label>
                  <input type="text" required value={form.addressDistrict} onChange={(e) => set('addressDistrict', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="lg-label">{t('register.addressCity')}</label>
                  <input type="text" required value={form.addressCity} onChange={(e) => set('addressCity', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="lg-label">{t('register.addressState')}</label>
                  <input type="text" required maxLength={2} value={form.addressState} onChange={(e) => set('addressState', e.target.value.toUpperCase())} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="lg-label">{t('register.addressZip')}</label>
                  <input type="text" required value={form.addressZip} onChange={(e) => set('addressZip', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/5 pt-6">
              <p className="text-base font-semibold tracking-tight text-white">{t('register.role')}</p>
              <p className="text-xs text-neutral-500">{t('register.roleHelp')}</p>
              <div className="flex flex-wrap gap-6">
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requestedRole"
                      value={role}
                      checked={form.requestedRole === role}
                      onChange={() => set('requestedRole', role)}
                    />
                    <span className="text-sm text-slate-300">{t(`users.roles.${role}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="shiny-cta shiny-cta-sm w-full"
            >
              {loading ? t('actions.saving') : t('register.submit')}
            </button>
          </form>

          <p className="border-t border-white/5 pt-6 text-center">
            <Link to="/login" className="lg-link">
              {t('register.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
