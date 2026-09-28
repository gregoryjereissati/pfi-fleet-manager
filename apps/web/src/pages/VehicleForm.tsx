import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import type { VehicleDto } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useToken } from '@/hooks/useToken'
import { LoadingState, PageHeader } from '@/components/ledger/Ui'

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

const inputClass = 'lg-input w-full'

const labelClass = 'lg-label'

export function VehicleForm() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { invalidate: invalidateVehicles } = useVehicleOptions()
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

      // O seletor compartilhado precisa refletir o novo veículo sem que a
      // pessoa recarregue a página.
      invalidateVehicles()
      navigate('/vehicles')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState label={t('common.loading')} />
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={isEdit ? t('vehicles.edit') : t('vehicles.new')}
        subtitle={t('vehicles.formSubtitle')}
      />

      <form onSubmit={handleSubmit} className="lg-inner lg-reveal space-y-4 p-6">
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

        {error && <p className="lg-alert lg-alert-error">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="lg-btn-accent">
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/vehicles')}
            className="lg-btn-ghost"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
