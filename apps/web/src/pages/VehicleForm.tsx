import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface VehicleFormState {
  plate: string
  brand: string
  model: string
  year: string
  color: string
}

const initialForm: VehicleFormState = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
}

const uppercaseFields: (keyof VehicleFormState)[] = ['plate', 'brand', 'model', 'color']

function normalizeVehicleText(value: string) {
  return value.toUpperCase()
}

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

const labelClass = 'mb-1 block text-sm font-medium text-white/55'

export function VehicleForm() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getToken = useToken()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<VehicleFormState>(initialForm)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const vehicle = await apiFetch<VehicleDto>(`/vehicles/${id}`, token)

        if (cancelled) return

        setForm({
          plate: normalizeVehicleText(vehicle.plate),
          brand: normalizeVehicleText(vehicle.brand),
          model: normalizeVehicleText(vehicle.model),
          year: String(vehicle.year),
          color: normalizeVehicleText(vehicle.color),
        })
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [getToken, id, isEdit])

  function updateField<Key extends keyof VehicleFormState>(key: Key, value: VehicleFormState[Key]) {
    const normalized = uppercaseFields.includes(key) ? normalizeVehicleText(value) : value
    setForm((current) => ({ ...current, [key]: normalized }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const year = Number(form.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2030) {
      setError(t('vehicles.validation.year'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()
      const payload = {
        plate: normalizeVehicleText(form.plate.trim()),
        brand: normalizeVehicleText(form.brand.trim()),
        model: normalizeVehicleText(form.model.trim()),
        year,
        color: normalizeVehicleText(form.color.trim()),
      }

      if (isEdit && id) {
        await apiFetch(`/vehicles/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/vehicles', token, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      navigate('/vehicles')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? t('vehicles.edit') : t('vehicles.new')}
        </h1>
        <p className="text-sm text-white/40">{t('vehicles.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-white/[0.07] bg-fleet-card p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>{t('vehicles.columns.plate')}</label>
            <input
              required
              value={form.plate}
              onChange={(event) => updateField('plate', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('vehicles.columns.brand')}</label>
            <input
              required
              value={form.brand}
              onChange={(event) => updateField('brand', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('vehicles.columns.model')}</label>
            <input
              required
              value={form.model}
              onChange={(event) => updateField('model', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('vehicles.columns.year')}</label>
            <input
              required
              type="number"
              value={form.year}
              onChange={(event) => updateField('year', event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>{t('vehicles.columns.color')}</label>
            <input
              value={form.color}
              onChange={(event) => updateField('color', event.target.value)}
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
            onClick={() => navigate('/vehicles')}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
