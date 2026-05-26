import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DocumentType } from '@fleet-manager/shared'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'
import { uploadDocumentFile } from '@/lib/supabase'
import type { DocumentItem } from '@/hooks/useDocuments'

type EntityType = 'vehicle' | 'driver'

interface DocumentFormState {
  entityType: EntityType
  vehicleId: string
  driverId: string
  type: DocumentType
  expiryDate: string
}

const VEHICLE_DOCUMENT_TYPES = [
  DocumentType.CRLV,
  DocumentType.IPVA,
  DocumentType.SEGURO,
  DocumentType.LICENCA,
  DocumentType.OUTRO,
]

const DRIVER_DOCUMENT_TYPES = [
  DocumentType.CNH,
  DocumentType.LICENCA,
  DocumentType.OUTRO,
]

export function DocumentForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const getToken = useToken()
  const isEditing = Boolean(id)

  const prefilledVehicleId = searchParams.get('vehicleId') ?? ''
  const prefilledDriverId = searchParams.get('driverId') ?? ''

  const { vehicles, loading: loadingVehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const { drivers, loading: loadingDrivers } = useDrivers()

  const [form, setForm] = useState<DocumentFormState>(() => ({
    entityType: prefilledDriverId ? 'driver' : 'vehicle',
    vehicleId: prefilledVehicleId,
    driverId: prefilledDriverId,
    type: prefilledDriverId ? DocumentType.CNH : DocumentType.CRLV,
    expiryDate: '',
  }))
  const [file, setFile] = useState<File | null>(null)
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)

  const availableTypes =
    form.entityType === 'vehicle' ? VEHICLE_DOCUMENT_TYPES : DRIVER_DOCUMENT_TYPES

  useEffect(() => {
    if (!isEditing || !id) {
      setLoadingDocument(false)
      return
    }

    let cancelled = false

    async function loadDocument() {
      try {
        const token = await getToken()
        const document = await apiFetch<DocumentItem>(`/documents/${id}`, token)

        if (cancelled) return

        setForm({
          entityType: document.vehicleId ? 'vehicle' : 'driver',
          vehicleId: document.vehicleId ?? '',
          driverId: document.driverId ?? '',
          type: document.type,
          expiryDate: document.expiryDate.split('T')[0],
        })
        setExistingFileUrl(document.fileUrl)
        setError(null)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoadingDocument(false)
      }
    }

    void loadDocument()

    return () => {
      cancelled = true
    }
  }, [getToken, id, isEditing])

  function updateField<Key extends keyof DocumentFormState>(
    key: Key,
    value: DocumentFormState[Key],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value }

      if (key === 'entityType') {
        const entityType = value as EntityType
        const types = entityType === 'vehicle' ? VEHICLE_DOCUMENT_TYPES : DRIVER_DOCUMENT_TYPES
        next.type = types[0]
        next.vehicleId = entityType === 'vehicle' ? next.vehicleId : ''
        next.driverId = entityType === 'driver' ? next.driverId : ''
      }

      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const entityId = form.entityType === 'vehicle' ? form.vehicleId : form.driverId

    if (!entityId) {
      setError(t('documents.validation.entity'))
      return
    }

    if (!form.expiryDate) {
      setError(t('documents.validation.expiryDate'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const fileUrl = file ? await uploadDocumentFile(file, entityId) : undefined
      const token = await getToken()

      if (isEditing && id) {
        await apiFetch(`/documents/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({
            type: form.type,
            expiryDate: form.expiryDate,
            ...(fileUrl && { fileUrl }),
          }),
        })
      } else {
        const body =
          form.entityType === 'vehicle'
            ? { vehicleId: form.vehicleId, type: form.type, expiryDate: form.expiryDate, fileUrl }
            : { driverId: form.driverId, type: form.type, expiryDate: form.expiryDate, fileUrl }

        await apiFetch('/documents', token, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      navigate('/documents')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingDocument) {
    return <p className="text-sm text-gray-500">{t('common.loading')}</p>
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? t('documents.edit') : t('documents.new')}
        </h1>
        <p className="text-sm text-gray-500">{t('documents.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {!isEditing && (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('documents.columns.entity')}
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={form.entityType === 'vehicle'}
                      onChange={() => updateField('entityType', 'vehicle')}
                    />
                    {t('documents.entity.vehicle')}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={form.entityType === 'driver'}
                      onChange={() => updateField('entityType', 'driver')}
                    />
                    {t('documents.entity.driver')}
                  </label>
                </div>
              </div>

              {form.entityType === 'vehicle' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('documents.entity.vehicle')}
                  </label>
                  <select
                    value={form.vehicleId}
                    disabled={loadingVehicles}
                    onChange={(event) => updateField('vehicleId', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('documents.selectVehicle')}</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('documents.entity.driver')}
                  </label>
                  <select
                    value={form.driverId}
                    disabled={loadingDrivers}
                    onChange={(event) => updateField('driverId', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('documents.selectDriver')}</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('documents.columns.type')}
            </label>
            <select
              value={form.type}
              onChange={(event) => updateField('type', event.target.value as DocumentType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableTypes.map((documentType) => (
                <option key={documentType} value={documentType}>
                  {t(`documents.types.${documentType}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('documents.columns.expiryDate')}
            </label>
            <input
              required
              type="date"
              value={form.expiryDate}
              onChange={(event) => updateField('expiryDate', event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('documents.upload.label')}
            </label>
            {existingFileUrl && !file && (
              <p className="mb-1 text-xs text-gray-500">
                {t('documents.upload.current')}:{' '}
                <a
                  href={existingFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {t('documents.preview.viewFile')}
                </a>
              </p>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file ? (
              <p className="mt-1 text-xs text-gray-500">{file.name}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">{t('documents.upload.placeholder')}</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t('documents.upload.uploading') : t('actions.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
