import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DriverStatus, UserStatus } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useDriver } from '@/hooks/useDriver'
import { useUsers } from '@/hooks/useUsers'
import { useToken } from '@/hooks/useToken'
import { formatCpf } from '@/lib/utils'

interface DriverFormState {
  /** Só no cadastro: de quem é a ficha. */
  userId: string
  cnh: string
  cnhExpiry: string
  phone: string
  status: DriverStatus
}

const initialForm: DriverFormState = {
  userId: '',
  cnh: '',
  cnhExpiry: '',
  phone: '',
  status: DriverStatus.ACTIVE,
}

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

const labelClass = 'mb-1 block text-sm font-medium text-white/55'

/**
 * Ficha operacional do motorista.
 *
 * Motorista e usuário são a mesma pessoa. Não há cadastro de pessoa a partir
 * do zero: quem aparece aqui já tem conta na empresa e já foi aprovado. Nome e
 * CPF pertencem ao cadastro da pessoa e não são redigitados — o formulário
 * cuida apenas do que é operacional: habilitação, telefone e situação.
 */
export function DriverForm() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getToken = useToken()
  const isEdit = Boolean(id)

  const { driver, loading, error: loadError } = useDriver(id)
  const { users, loading: usersLoading } = useUsers()

  const [form, setForm] = useState<DriverFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Pessoas da empresa, ativas, que ainda não têm ficha. */
  const candidates = useMemo(
    () =>
      users.filter(
        (user) => user.status === UserStatus.ACTIVE && !user.driverId,
      ),
    [users],
  )

  useEffect(() => {
    if (!driver) return

    setForm({
      userId: driver.userId ?? '',
      cnh: driver.cnh ?? '',
      cnhExpiry: driver.cnhExpiry ? driver.cnhExpiry.split('T')[0] : '',
      phone: driver.phone ?? '',
      status: driver.status,
    })
  }, [driver])

  function updateField<Key extends keyof DriverFormState>(key: Key, value: DriverFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isEdit && !form.userId) {
      setError(t('drivers.validation.user'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()

      if (isEdit && id) {
        await apiFetch(`/drivers/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({
            cnh: form.cnh.trim() || null,
            cnhExpiry: form.cnhExpiry || null,
            phone: form.phone.trim() || null,
            status: form.status,
          }),
        })
      } else {
        // A ficha nasce de um usuário; a identidade vem dele.
        const created = await apiFetch<{ id: string }>('/drivers', token, {
          method: 'POST',
          body: JSON.stringify({
            userId: form.userId,
            phone: form.phone.trim() || undefined,
          }),
        })

        // Habilitação e validade são complementadas na mesma ida, quando
        // informadas.
        if (form.cnh.trim() || form.cnhExpiry) {
          await apiFetch(`/drivers/${created.id}`, token, {
            method: 'PUT',
            body: JSON.stringify({
              cnh: form.cnh.trim() || null,
              cnhExpiry: form.cnhExpiry || null,
            }),
          })
        }
      }

      navigate('/drivers')
    } catch (err) {
      const message = (err as Error).message

      if (message.includes('DRIVER_ALREADY_EXISTS')) {
        setError(t('drivers.error.alreadyExists'))
      } else if (message.includes('USER_NOT_ACTIVE')) {
        setError(t('drivers.error.userNotActive'))
      } else if (message.includes('CNH already in use')) {
        setError(t('drivers.error.cnhTaken'))
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? t('drivers.edit') : t('drivers.new')}
        </h1>
        <p className="text-sm text-white/40">{t('drivers.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-white/[0.07] bg-fleet-card p-6"
      >
        {isEdit ? (
          <div className="rounded-md border border-white/[0.07] bg-fleet-darker px-4 py-3">
            <p className="text-sm font-medium text-white">{driver?.name}</p>
            <p className="text-xs text-white/40">
              {formatCpf(driver?.cpf)}
              {driver?.email && ` • ${driver.email}`}
            </p>
            <p className="mt-2 text-xs text-white/35">
              {driver?.linkedToUser
                ? t('drivers.identityFromAccount')
                : t('drivers.identityWithoutAccount')}
            </p>
          </div>
        ) : (
          <div>
            <label className={labelClass}>{t('drivers.columns.person')}</label>
            <select
              required
              value={form.userId}
              onChange={(event) => updateField('userId', event.target.value)}
              className={inputClass}
              disabled={usersLoading}
            >
              <option value="">
                {usersLoading ? t('common.loading') : t('drivers.selectPerson')}
              </option>
              {candidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {t(`users.roles.${user.role}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/35">
              {candidates.length === 0 && !usersLoading
                ? t('drivers.noCandidates')
                : t('drivers.selectPersonHelp')}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>{t('drivers.columns.cnh')}</label>
            <input
              value={form.cnh}
              onChange={(event) => updateField('cnh', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('drivers.columns.cnhExpiry')}</label>
            <input
              type="date"
              value={form.cnhExpiry}
              onChange={(event) => updateField('cnhExpiry', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('drivers.columns.phone')}</label>
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className={inputClass}
            />
          </div>
          {isEdit && (
            <div>
              <label className={labelClass}>{t('drivers.columns.status')}</label>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField('status', event.target.value as DriverStatus)
                }
                className={inputClass}
              >
                <option value={DriverStatus.ACTIVE}>{t('status.active')}</option>
                <option value={DriverStatus.INACTIVE}>{t('status.inactive')}</option>
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-fleet-black hover:bg-gold-hover disabled:opacity-50"
          >
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/drivers')}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
