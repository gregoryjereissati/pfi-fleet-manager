import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CurrentUserDto, UpdateCurrentUserDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { updatePassword } from '@/lib/supabase'
import { useSessionData } from '@/lib/session-data'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToken } from '@/hooks/useToken'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'

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

const inputClass = 'lg-input w-full'

const labelClass = 'lg-label'

const sectionClass = 'lg-inner lg-reveal space-y-4 p-6'

const headingClass = 'text-base font-semibold tracking-tight text-white'

export function Profile() {
  const { t } = useTranslation()
  const { applyCurrentUser } = useSessionData()
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

      applyCurrentUser(updatedUser)
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
    return <LoadingState label={t('common.loading')} />
  }

  if (currentUserError || !currentUser) {
    return (
      <p className="lg-alert lg-alert-error">{currentUserError ?? t('common.notFound')}</p>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        actions={
          <>
            <span className="lg-tag">{t(`users.roles.${currentUser.role}`)}</span>
            <span className="lg-tag lg-tag-muted">
              {t(`users.statuses.${currentUser.status}`)}
            </span>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={sectionClass}>
          <h2 className={headingClass}>{t('profile.personalInfo')}</h2>

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

        <section className={sectionClass}>
          <h2 className={headingClass}>{t('profile.address')}</h2>

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

        <section className={sectionClass}>
          <div>
            <h2 className={headingClass}>{t('profile.security')}</h2>
            <p className="lg-muted mt-1 text-sm">{t('profile.passwordHint')}</p>
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

        {error && <p className="lg-alert lg-alert-error">{error}</p>}
        {success && <p className="lg-alert lg-alert-ok">{success}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="lg-btn-accent">
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
