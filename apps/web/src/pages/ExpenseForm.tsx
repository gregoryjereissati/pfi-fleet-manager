import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ExpenseType } from '@fleet-manager/shared'
import { useVehicles } from '@/hooks/useVehicles'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'

interface ExpenseFormState {
  vehicleId: string
  type: ExpenseType
  amount: string
  date: string
  description: string
}

const initialForm: ExpenseFormState = {
  vehicleId: '',
  type: ExpenseType.FUEL,
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
}

export function ExpenseForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getToken = useToken()
  const { vehicles, loading } = useVehicles({ orderBy: 'plate', order: 'asc' })

  const [form, setForm] = useState<ExpenseFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<Key extends keyof ExpenseFormState>(key: Key, value: ExpenseFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = Number(form.amount)
    if (!form.vehicleId) {
      setError(t('expenses.validation.vehicle'))
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('expenses.validation.amount'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()
      await apiFetch('/expenses', token, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          type: form.type,
          amount,
          date: form.date,
          description: form.description.trim() || undefined,
        }),
      })

      navigate('/expenses')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('expenses.new')}</h1>
        <p className="text-sm text-gray-500">{t('expenses.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('expenses.columns.vehicle')}
            </label>
            <select
              required
              disabled={loading}
              value={form.vehicleId}
              onChange={(event) => updateField('vehicleId', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('expenses.selectVehicle')}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} • {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('expenses.columns.type')}
            </label>
            <select
              value={form.type}
              onChange={(event) => updateField('type', event.target.value as ExpenseType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(ExpenseType).map((expenseType) => (
                <option key={expenseType} value={expenseType}>
                  {t(`expenses.types.${expenseType}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('expenses.columns.amount')}
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateField('amount', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('expenses.columns.date')}
            </label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('expenses.columns.description')}
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
