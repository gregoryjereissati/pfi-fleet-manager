import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { MaintenanceType } from '@fleet-manager/shared'
import { useVehicleOptions } from '@/hooks/useVehicleOptions'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'

interface MaintenanceFormState {
  vehicleId: string
  type: MaintenanceType
  scheduledDate: string
  description: string
}

const initialForm: MaintenanceFormState = {
  vehicleId: '',
  type: MaintenanceType.PREVENTIVE,
  scheduledDate: new Date().toISOString().split('T')[0],
  description: '',
}

const inputClass =
  'w-full rounded-md bg-fleet-input border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50'

const labelClass = 'mb-1 block text-sm font-medium text-white/55'

/**
 * Registro e correção de uma manutenção.
 *
 * O motorista registra preventiva ou corretiva dos veículos a que está
 * vinculado — inclusive o que aparece na estrada — e corrige o que registrou.
 * O seletor traz apenas os veículos autorizados, os mesmos que a API aceita.
 */
export function MaintenanceForm() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getToken = useToken()
  const { vehicles, loading } = useVehicleOptions()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<MaintenanceFormState>(initialForm)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function load() {
      try {
        setLoadingEntry(true)
        const token = await getToken()
        const entry = await apiFetch<{
          vehicleId: string
          type: MaintenanceType
          scheduledDate: string
          description: string
        }>(`/maintenances/${id}`, token)

        if (cancelled) return

        setForm({
          vehicleId: entry.vehicleId,
          type: entry.type,
          scheduledDate: entry.scheduledDate.split('T')[0],
          description: entry.description,
        })
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoadingEntry(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [getToken, id])

  function updateField<Key extends keyof MaintenanceFormState>(
    key: Key,
    value: MaintenanceFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.vehicleId) {
      setError(t('maintenances.validation.vehicle'))
      return
    }

    if (!form.description.trim()) {
      setError(t('maintenances.validation.description'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()

      // O veículo de uma manutenção já registrada não é alterável: mover uma
      // manutenção entre veículos é outra decisão, ainda não tomada.
      const payload = isEdit
        ? {
            type: form.type,
            description: form.description.trim(),
            scheduledDate: form.scheduledDate,
          }
        : {
            vehicleId: form.vehicleId,
            type: form.type,
            description: form.description.trim(),
            scheduledDate: form.scheduledDate,
          }

      await apiFetch(isEdit ? `/maintenances/${id}` : '/maintenances', token, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })

      navigate('/maintenances')
    } catch (err) {
      const message = (err as Error).message

      if (message.includes('VEHICLE_NOT_ASSIGNED')) {
        setError(t('maintenances.error.vehicleNotAssigned'))
      } else if (message.includes('MAINTENANCE_CANCELLED')) {
        setError(t('maintenances.error.cancelled'))
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEntry) {
    return <p className="text-sm text-white/40">{t('common.loading')}</p>
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? t('maintenances.edit') : t('maintenances.new')}
        </h1>
        <p className="text-sm text-white/40">{t('maintenances.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-white/[0.07] bg-fleet-card p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>{t('maintenances.columns.vehicle')}</label>
            <select
              required
              disabled={loading || isEdit}
              value={form.vehicleId}
              onChange={(event) => updateField('vehicleId', event.target.value)}
              className={inputClass}
            >
              <option value="">{t('maintenances.selectVehicle')}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} • {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('maintenances.columns.type')}</label>
            <select
              value={form.type}
              onChange={(event) => updateField('type', event.target.value as MaintenanceType)}
              className={inputClass}
            >
              {Object.values(MaintenanceType).map((maintenanceType) => (
                <option key={maintenanceType} value={maintenanceType}>
                  {t(`maintenances.types.${maintenanceType}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('maintenances.columns.scheduledDate')}</label>
            <input
              required
              type="date"
              value={form.scheduledDate}
              onChange={(event) => updateField('scheduledDate', event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>{t('maintenances.columns.description')}</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
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
            onClick={() => navigate('/maintenances')}
            className="rounded-md border border-white/[0.12] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
