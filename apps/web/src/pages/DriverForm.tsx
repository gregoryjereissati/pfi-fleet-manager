import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { useDriver } from '@/hooks/useDriver'
import { useToken } from '@/hooks/useToken'

interface DriverFormState {
  name: string
  cpf: string
  cnh: string
  cnhExpiry: string
  phone: string
}

const initialForm: DriverFormState = {
  name: '',
  cpf: '',
  cnh: '',
  cnhExpiry: '',
  phone: '',
}

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

const labelClass = 'mb-1 block text-sm font-medium text-white/55'

export function DriverForm() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getToken = useToken()
  const isEdit = Boolean(id)
  const { driver, loading, error: loadError } = useDriver(id)

  const [form, setForm] = useState<DriverFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driver) return

    setForm({
      name: driver.name,
      cpf: driver.cpf,
      cnh: driver.cnh,
      cnhExpiry: driver.cnhExpiry.split('T')[0],
      phone: driver.phone ?? '',
    })
  }, [driver])

  function updateField<Key extends keyof DriverFormState>(key: Key, value: DriverFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!/^\d{11}$/.test(form.cpf)) {
      setError(t('drivers.validation.cpf'))
      return
    }

    if (!form.cnhExpiry) {
      setError(t('drivers.validation.cnhExpiry'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()
      const payload = {
        name: form.name.trim(),
        cpf: form.cpf.trim(),
        cnh: form.cnh.trim(),
        cnhExpiry: form.cnhExpiry,
        phone: form.phone.trim() || undefined,
      }

      if (isEdit && id) {
        await apiFetch(`/drivers/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/drivers', token, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      navigate('/drivers')
    } catch (err) {
      setError((err as Error).message)
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>{t('drivers.columns.name')}</label>
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('drivers.columns.cpf')}</label>
            <input
              required
              disabled={isEdit}
              value={form.cpf}
              onChange={(event) => updateField('cpf', event.target.value)}
              className={`${inputClass} disabled:opacity-40`}
            />
          </div>
          <div>
            <label className={labelClass}>{t('drivers.columns.cnh')}</label>
            <input
              required
              value={form.cnh}
              onChange={(event) => updateField('cnh', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('drivers.columns.cnhExpiry')}</label>
            <input
              required
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
