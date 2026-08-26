import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CurrentUserDto, UpdateCurrentUserDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { updatePassword } from '@/lib/supabase'
import { notifyCurrentUserUpdated } from '@/lib/current-user'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToken } from '@/hooks/useToken'

interface ProfileFormState {
  name: string
  cpf: string
  phone: string
  email: string
  addressStreet: string
  addressNumber: string
  addressDistrict: string
  addressCity: string
  addressState: string
  addressZip: string
  password: string
  confirmPassword: string
}

const emptyForm: ProfileFormState = {
  name: '',
  cpf: '',
  phone: '',
  email: '',
  addressStreet: '',
  addressNumber: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  password: '',
  confirmPassword: '',
}

function mapUserToForm(user: CurrentUserDto): ProfileFormState {
  return {
    name: user.name,
    cpf: user.cpf,
    phone: user.phone,
    email: user.email,
    addressStreet: user.addressStreet,
    addressNumber: user.addressNumber,
    addressDistrict: user.addressDistrict,
    addressCity: user.addressCity,
    addressState: user.addressState,
    addressZip: user.addressZip,
    password: '',
    confirmPassword: '',
  }
}

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

const labelClass = 'mb-1 block text-sm font-medium text-white/55'

export function Profile() {
  const { t } = useTranslation()
  const getToken = useToken()
  const { currentUser, loading, error: currentUserError } = useCurrentUser()
  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setForm(mapUserToForm(currentUser))
    }
  }, [currentUser])

  function updateField<Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (form.password !== form.confirmPassword) {
      setError(t('profile.error.passwordMismatch'))
      setSuccess(null)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const token = await getToken()
      const payload: UpdateCurrentUserDto = {
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        email: form.email,
        addressStreet: form.addressStreet,
        addressNumber: form.addressNumber,
        addressDistrict: form.addressDistrict,
        addressCity: form.addressCity,
        addressState: form.addressState,
        addressZip: form.addressZip,
      }
      const updatedUser = await apiFetch<CurrentUserDto>('/users/me', token, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      // A senha é gerenciada pelo Supabase Auth, e não pela API do
      // Fleet Manager. Só é alterada quando o campo foi preenchido.
      if (form.password) {
        await updatePassword(form.password)
      }

      notifyCurrentUserUpdated(updatedUser)
      setForm(mapUserToForm(updatedUser))
      setSuccess(t('profile.success'))
    } catch (err) {
      const message = (err as Error).message

      if (message.includes('EMAIL_TAKEN')) setError(t('profile.error.emailTaken'))
      else if (message.includes('CPF_TAKEN')) setError(t('profile.error.cpfTaken'))
      else if (message.includes('PASSWORD_MISMATCH')) {
        setError(t('profile.error.passwordMismatch'))
      } else if (message.toLowerCase().includes('password')) {
        setError(t('profile.error.weakPassword'))
      } else {
        setError(message)
      }

      setSuccess(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  if (currentUserError || !currentUser) {
    return <p className="text-sm text-red-400">{currentUserError ?? t('common.notFound')}</p>
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-fleet-card p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('profile.title')}</h1>
          <p className="text-sm text-white/40">{t('profile.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            {t(`users.roles.${currentUser.role}`)}
          </span>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/50">
            {t(`users.statuses.${currentUser.status}`)}
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-white/[0.07] bg-fleet-card p-6"
      >
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white">{t('profile.personalInfo')}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>{t('register.name')}</label>
              <input
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.cpf')}</label>
              <input
                required
                value={form.cpf}
                onChange={(event) => updateField('cpf', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.phone')}</label>
              <input
                required
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t('register.email')}</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white">{t('profile.address')}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>{t('register.addressStreet')}</label>
              <input
                required
                value={form.addressStreet}
                onChange={(event) => updateField('addressStreet', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.addressNumber')}</label>
              <input
                required
                value={form.addressNumber}
                onChange={(event) => updateField('addressNumber', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.addressDistrict')}</label>
              <input
                required
                value={form.addressDistrict}
                onChange={(event) => updateField('addressDistrict', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.addressCity')}</label>
              <input
                required
                value={form.addressCity}
                onChange={(event) => updateField('addressCity', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('register.addressState')}</label>
              <input
                required
                maxLength={2}
                value={form.addressState}
                onChange={(event) => updateField('addressState', event.target.value.toUpperCase())}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t('register.addressZip')}</label>
              <input
                required
                value={form.addressZip}
                onChange={(event) => updateField('addressZip', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">{t('profile.security')}</h2>
            <p className="text-sm text-white/40">{t('profile.passwordHint')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>{t('profile.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('profile.confirmPassword')}</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover disabled:opacity-50"
          >
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
