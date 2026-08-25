# Document Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar upload de arquivo aos documentos, filtrar tipos por entidade, exibir documentos nas pÃ¡ginas de detalhe do veÃ­culo e do motorista, e criar a pÃ¡gina DriverDetail.

**Architecture:** Upload feito direto do browser para o Supabase Storage (client-side); backend recebe e persiste apenas a URL resultante via campo `fileUrl` no model `Document`. DriverDetail segue o padrÃ£o visual de VehicleDetail.

**Tech Stack:** React, TypeScript, Prisma, Supabase Storage (`@supabase/supabase-js`), react-i18next, TailwindCSS

**Status em 2026-05-26:** implementação concluída e verificações passando. Os passos de commit ficaram desmarcados porque o worktree já tinha alterações pendentes misturadas antes da continuação.

---

## PrÃ©-requisito manual (fazer antes de rodar qualquer task)

No painel do Supabase:
1. Ir em **Storage** â†’ **New bucket**
2. Nome: `documents`, marcar como **Public**
3. Copiar `Project URL` e `anon public key` do painel **Project Settings â†’ API**
4. Ir em **SQL Editor** e aplicar a policy de upload:

```sql
alter table storage.objects enable row level security;

drop policy if exists "Allow anon document uploads" on storage.objects;

create policy "Allow anon document uploads"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'documents'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);
```

> Observação: como o app usa autenticação própria com JWT local, o Supabase Storage recebe uploads do browser com a role `anon`. Sem essa policy, o erro exibido é `new row violates row-level security policy`.

---

## Mapa de arquivos

| Arquivo | AÃ§Ã£o |
|---|---|
| `apps/api/prisma/schema.prisma` | Adicionar `fileUrl String?` ao model Document |
| `apps/api/prisma/migrations/` | Nova migration gerada pelo prisma |
| `packages/shared/src/dtos/document.dto.ts` | Adicionar `fileUrl` ao `DocumentDto`, `CreateDocumentDto`, `UpdateDocumentDto` |
| `apps/api/src/repositories/document.repository.ts` | Adicionar `fileUrl` Ã s interfaces e ao `mapDocument` |
| `apps/web/.env` e `.env.example` | Adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| `apps/web/src/lib/supabase.ts` | Criar â€” cliente Supabase + funÃ§Ã£o `uploadDocumentFile` |
| `apps/web/src/components/FilePreviewModal.tsx` | Criar â€” modal de preview de arquivo |
| `apps/web/src/locales/pt-BR.json` | Adicionar chaves novas |
| `apps/web/src/locales/en-US.json` | Adicionar chaves novas |
| `apps/web/src/pages/DocumentForm.tsx` | Filtro de tipos + upload + query params |
| `apps/web/src/pages/DocumentList.tsx` | BotÃ£o "Ver arquivo" + FilePreviewModal |
| `apps/web/src/pages/VehicleDetail.tsx` | SeÃ§Ã£o de documentos |
| `apps/web/src/pages/DriverDetail.tsx` | Criar â€” nova pÃ¡gina |
| `apps/web/src/pages/DriverList.tsx` | Adicionar link "Ver detalhes" |
| `apps/web/src/App.tsx` | Adicionar rota `/drivers/:id` |
| `CLAUDE.md` | Atualizar estado do projeto |

---

## Task 1: Schema + Repository + DTO

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/shared/src/dtos/document.dto.ts`
- Modify: `apps/api/src/repositories/document.repository.ts`

- [x] **Step 1: Adicionar `fileUrl` ao schema Prisma**

Em `apps/api/prisma/schema.prisma`, no model `Document`, adicionar o campo apÃ³s `expiryDate`:

```prisma
model Document {
  id         String       @id @default(cuid())
  vehicleId  String?
  vehicle    Vehicle?     @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  driverId   String?
  driver     Driver?      @relation(fields: [driverId], references: [id], onDelete: Cascade)
  type       DocumentType
  expiryDate DateTime
  fileUrl    String?
  alertSent  Boolean      @default(false)
  createdAt  DateTime     @default(now())
}
```

- [x] **Step 2: Rodar migration**

```bash
cd apps/api
npx prisma migrate dev --name add_file_url_to_document
```

SaÃ­da esperada: `Your database is now in sync with your schema.`

- [x] **Step 3: Atualizar `DocumentDto` no shared**

Substituir o conteÃºdo de `packages/shared/src/dtos/document.dto.ts`:

```typescript
import { DocumentType } from '../enums';

export type DocumentStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentDto {
  id: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  type: DocumentType;
  expiryDate: string;
  fileUrl: string | null;
  alertSent: boolean;
  status: DocumentStatus;
  createdAt: string;
}

export interface CreateDocumentDto {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: string;
  fileUrl?: string;
}

export interface UpdateDocumentDto {
  type?: DocumentType;
  expiryDate?: string;
  fileUrl?: string;
}
```

- [x] **Step 4: Atualizar `document.repository.ts`**

No topo do arquivo, nas interfaces, adicionar `fileUrl`:

```typescript
export interface CreateDocumentData {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: Date;
  fileUrl?: string;
}

export interface UpdateDocumentData {
  type?: DocumentType;
  expiryDate?: Date;
  fileUrl?: string;
}
```

Na funÃ§Ã£o `mapDocument`, atualizar o tipo do parÃ¢metro e o retorno:

```typescript
function mapDocument(document: {
  id: string;
  vehicleId: string | null;
  vehicle: { id: string; plate: string } | null;
  driverId: string | null;
  driver: { id: string; name: string } | null;
  type: string;
  expiryDate: Date;
  fileUrl: string | null;
  alertSent: boolean;
  createdAt: Date;
}) {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    vehiclePlate: document.vehicle?.plate ?? null,
    driverId: document.driverId,
    driverName: document.driver?.name ?? null,
    type: document.type as DocumentType,
    expiryDate: document.expiryDate.toISOString(),
    fileUrl: document.fileUrl,
    alertSent: document.alertSent,
    status: computeStatus(document.expiryDate),
    createdAt: document.createdAt.toISOString(),
  };
}
```

- [x] **Step 5: Verificar que os testes continuam passando**

```bash
cd apps/api
npm run test
```

SaÃ­da esperada: todos os testes passam (nenhum teste depende da ausÃªncia de `fileUrl`).

- [x] **Step 6: Verificar typecheck**

```bash
cd apps/api && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/ packages/shared/src/dtos/document.dto.ts apps/api/src/repositories/document.repository.ts
git commit -m "feat(api): add fileUrl field to Document model and repository"
```

---

## Task 2: Supabase Storage setup no frontend

**Files:**
- Modify: `apps/web/.env`
- Modify: `apps/web/.env.example`
- Create: `apps/web/src/lib/supabase.ts`

- [x] **Step 1: Instalar `@supabase/supabase-js`**

```bash
cd apps/web
npm install @supabase/supabase-js
```

- [x] **Step 2: Adicionar variÃ¡veis de ambiente**

Em `apps/web/.env`, adicionar:

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

Em `apps/web/.env.example`, adicionar as mesmas linhas com valores de exemplo:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

- [x] **Step 3: Criar `apps/web/src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadDocumentFile(file: File, entityId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `documents/${entityId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('documents').upload(path, file)

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data.publicUrl
}
```

- [x] **Step 4: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/.env.example apps/web/src/lib/supabase.ts
git commit -m "feat(web): add Supabase Storage client and upload utility"
```

---

## Task 3: TraduÃ§Ãµes (i18n)

**Files:**
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`

- [x] **Step 1: Adicionar chaves em `pt-BR.json`**

No bloco de `"documents"`, adicionar (manter ordenaÃ§Ã£o alfabÃ©tica dentro do bloco):

```json
"documents.preview.openInTab": "Abrir em nova aba",
"documents.preview.title": "Visualizar documento",
"documents.preview.viewFile": "Ver arquivo",
"documents.upload.current": "Arquivo atual",
"documents.upload.label": "Arquivo do documento",
"documents.upload.placeholder": "Selecionar imagem ou PDF",
"documents.upload.uploading": "Enviando arquivo...",
```

No bloco de `"drivers"`, adicionar:

```json
"drivers.detail.documents": "Documentos do motorista",
"drivers.detail.noDocuments": "Nenhum documento cadastrado.",
"drivers.detail.vehicles": "VeÃ­culos vinculados",
"drivers.detail.noVehicles": "Nenhum veÃ­culo vinculado.",
"drivers.viewDetail": "Ver detalhes",
```

No bloco de `"vehicles"`, adicionar:

```json
"vehicles.detail.documents": "Documentos do veÃ­culo",
"vehicles.detail.noDocuments": "Nenhum documento cadastrado.",
```

No bloco de `"actions"`, verificar se `"actions.close"` existe. Se nÃ£o, adicionar:

```json
"actions.close": "Fechar",
```

- [x] **Step 2: Adicionar as mesmas chaves em `en-US.json`**

```json
"documents.preview.openInTab": "Open in new tab",
"documents.preview.title": "View document",
"documents.preview.viewFile": "View file",
"documents.upload.current": "Current file",
"documents.upload.label": "Document file",
"documents.upload.placeholder": "Select image or PDF",
"documents.upload.uploading": "Uploading file...",
"drivers.detail.documents": "Driver documents",
"drivers.detail.noDocuments": "No documents registered.",
"drivers.detail.vehicles": "Linked vehicles",
"drivers.detail.noVehicles": "No linked vehicles.",
"drivers.viewDetail": "View details",
"vehicles.detail.documents": "Vehicle documents",
"vehicles.detail.noDocuments": "No documents registered.",
"actions.close": "Close",
```

(Adicionar `"actions.close"` apenas se nÃ£o existir.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/locales/pt-BR.json apps/web/src/locales/en-US.json
git commit -m "feat(web): add i18n keys for document upload, preview, and driver detail"
```

---

## Task 4: Componente `FilePreviewModal`

**Files:**
- Create: `apps/web/src/components/FilePreviewModal.tsx`

- [x] **Step 1: Criar o componente**

Criar `apps/web/src/components/FilePreviewModal.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

interface FilePreviewModalProps {
  isOpen: boolean
  fileUrl: string
  onClose: () => void
}

export function FilePreviewModal({ isOpen, fileUrl, onClose }: FilePreviewModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  const isPdf =
    fileUrl.toLowerCase().includes('.pdf') ||
    fileUrl.toLowerCase().includes('application/pdf')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">{t('documents.preview.title')}</h2>
          <div className="flex gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('documents.preview.openInTab')}
            </a>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('actions.close')}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="h-[70vh] w-full rounded border border-gray-200"
              title={t('documents.preview.title')}
            />
          ) : (
            <img
              src={fileUrl}
              alt={t('documents.preview.title')}
              className="mx-auto max-w-full rounded object-contain"
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/FilePreviewModal.tsx
git commit -m "feat(web): add FilePreviewModal component for document file preview"
```

---

## Task 5: `DocumentForm` â€” filtro de tipos, query params e upload

**Files:**
- Modify: `apps/web/src/pages/DocumentForm.tsx`

- [x] **Step 1: Substituir o conteÃºdo completo de `DocumentForm.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const types = value === 'vehicle' ? VEHICLE_DOCUMENT_TYPES : DRIVER_DOCUMENT_TYPES
        next.type = types[0]
      }

      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const entityId = form.entityType === 'vehicle' ? form.vehicleId : form.driverId
    if (!isEditing && !entityId) {
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

      let fileUrl: string | undefined

      if (file && entityId) {
        fileUrl = await uploadDocumentFile(file, entityId)
      }

      const token = await getToken()

      if (isEditing && id) {
        await apiFetch(`/documents/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({
            type: form.type,
            expiryDate: form.expiryDate,
            ...(fileUrl !== undefined && { fileUrl }),
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
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-500">{file.name}</p>
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
```

- [x] **Step 2: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/DocumentForm.tsx
git commit -m "feat(web): filter document types by entity and add file upload to DocumentForm"
```

---

## Task 6: `DocumentList` â€” botÃ£o "Ver arquivo"

**Files:**
- Modify: `apps/web/src/pages/DocumentList.tsx`

- [x] **Step 1: Adicionar import e state do modal**

No topo de `DocumentList.tsx`, adicionar o import:

```tsx
import { FilePreviewModal } from '@/components/FilePreviewModal'
```

Dentro do componente `DocumentList`, adicionar o estado do modal de preview (junto com os outros estados existentes):

```tsx
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
```

- [x] **Step 2: Adicionar botÃ£o "Ver arquivo" na coluna de aÃ§Ãµes**

Localizar o bloco de aÃ§Ãµes da linha da tabela:

```tsx
{canMutate ? (
  <div className="flex flex-wrap items-center gap-3">
    <Link
      to={`/documents/${document.id}/edit`}
      className="text-gray-700 hover:underline"
    >
      {t('actions.edit')}
    </Link>
    <button
      onClick={() => handleDelete(document.id)}
      className="text-red-600 hover:underline"
    >
      {t('actions.remove')}
    </button>
  </div>
) : (
  <span className="text-gray-400">-</span>
)}
```

Substituir por:

```tsx
<div className="flex flex-wrap items-center gap-3">
  {document.fileUrl && (
    <button
      onClick={() => setPreviewUrl(document.fileUrl!)}
      className="text-blue-600 hover:underline"
    >
      {t('documents.preview.viewFile')}
    </button>
  )}
  {canMutate && (
    <>
      <Link
        to={`/documents/${document.id}/edit`}
        className="text-gray-700 hover:underline"
      >
        {t('actions.edit')}
      </Link>
      <button
        onClick={() => handleDelete(document.id)}
        className="text-red-600 hover:underline"
      >
        {t('actions.remove')}
      </button>
    </>
  )}
  {!canMutate && !document.fileUrl && (
    <span className="text-gray-400">-</span>
  )}
</div>
```

- [x] **Step 3: Adicionar `FilePreviewModal` no final do JSX**

ApÃ³s o `ConfirmDialog` existente no return, adicionar:

```tsx
{previewUrl && (
  <FilePreviewModal
    isOpen
    fileUrl={previewUrl}
    onClose={() => setPreviewUrl(null)}
  />
)}
```

- [x] **Step 4: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/DocumentList.tsx
git commit -m "feat(web): add view file button and preview modal to DocumentList"
```

---

## Task 7: `VehicleDetail` â€” seÃ§Ã£o de documentos

**Files:**
- Modify: `apps/web/src/pages/VehicleDetail.tsx`

- [x] **Step 1: Adicionar imports**

No topo de `VehicleDetail.tsx`, adicionar:

```tsx
import { useState } from 'react'
import { DocumentType, type DocumentStatus } from '@fleet-manager/shared'
import { useDocuments } from '@/hooks/useDocuments'
import { FilePreviewModal } from '@/components/FilePreviewModal'
```

- [x] **Step 2: Adicionar estado do modal e hook de documentos**

Dentro do componente `VehicleDetail`, apÃ³s as outras declaraÃ§Ãµes de estado/hooks:

```tsx
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
const { documents, loading: loadingDocuments } = useDocuments({
  vehicleId: id,
  orderBy: 'expiryDate',
  order: 'asc',
})
```

- [x] **Step 3: Adicionar funÃ§Ã£o helper de status de documentos**

ApÃ³s os hooks, antes do `return`:

```tsx
function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-100 text-red-700'
  if (status === 'EXPIRING_SOON') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}
```

- [x] **Step 4: Adicionar seÃ§Ã£o de documentos no JSX**

Adicionar apÃ³s a seÃ§Ã£o `vehicles.latestMaintenances` (antes do `</div>` final do return):

```tsx
<section className="rounded-lg border border-gray-200 bg-white p-4">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-sm font-semibold text-gray-700">
      {t('vehicles.detail.documents')}
    </h2>
    {canMutate && (
      <Link
        to={`/documents/new?vehicleId=${vehicle.id}`}
        className="text-xs text-blue-600 hover:underline"
      >
        + {t('documents.new')}
      </Link>
    )}
  </div>
  {loadingDocuments ? (
    <p className="text-sm text-gray-400">{t('common.loading')}</p>
  ) : documents.length === 0 ? (
    <p className="text-sm text-gray-400">{t('vehicles.detail.noDocuments')}</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4">{t('documents.columns.type')}</th>
            <th className="pb-2 pr-4">{t('documents.columns.expiryDate')}</th>
            <th className="pb-2 pr-4">{t('documents.columns.status')}</th>
            <th className="pb-2">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td className="py-2 pr-4">{t(`documents.types.${doc.type}`)}</td>
              <td className="py-2 pr-4">
                {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getDocStatusClasses(doc.status)}`}
                >
                  {t(`documents.statuses.${doc.status}`)}
                </span>
              </td>
              <td className="py-2">
                {doc.fileUrl && (
                  <button
                    onClick={() => setPreviewUrl(doc.fileUrl!)}
                    className="text-blue-600 hover:underline"
                  >
                    {t('documents.preview.viewFile')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
```

- [x] **Step 5: Adicionar `FilePreviewModal` no return**

Antes do `</div>` final do return:

```tsx
{previewUrl && (
  <FilePreviewModal
    isOpen
    fileUrl={previewUrl}
    onClose={() => setPreviewUrl(null)}
  />
)}
```

- [x] **Step 6: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/VehicleDetail.tsx
git commit -m "feat(web): add documents section to VehicleDetail"
```

---

## Task 8: Criar `DriverDetail`

**Files:**
- Create: `apps/web/src/pages/DriverDetail.tsx`

- [x] **Step 1: Criar o arquivo**

Criar `apps/web/src/pages/DriverDetail.tsx`:

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DriverStatus, type DocumentStatus } from '@fleet-manager/shared'
import { useDriver } from '@/hooks/useDriver'
import { useDocuments } from '@/hooks/useDocuments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { canManageFleet } from '@/lib/roles'
import { FilePreviewModal } from '@/components/FilePreviewModal'

function formatCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function getDocStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-100 text-red-700'
  if (status === 'EXPIRING_SOON') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

export function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currentUser } = useCurrentUser()
  const { driver, loading, error } = useDriver(id)
  const canMutate = canManageFleet(currentUser?.role)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { documents, loading: loadingDocuments } = useDocuments({
    driverId: id,
    orderBy: 'expiryDate',
    order: 'asc',
  })

  if (loading) {
    return <p className="text-sm text-gray-500">{t('common.loading')}</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!driver) {
    return <p className="text-sm text-gray-500">{t('common.notFound')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link to="/drivers" className="text-sm text-blue-600 hover:underline">
            {t('actions.backToDrivers')}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
            <p className="text-gray-500">
              CPF {formatCpf(driver.cpf)} â€¢ CNH {driver.cnh}
            </p>
            {driver.phone && (
              <p className="text-sm text-gray-500">{driver.phone}</p>
            )}
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              driver.status === DriverStatus.ACTIVE
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {driver.status === DriverStatus.ACTIVE ? t('status.active') : t('status.inactive')}
          </span>
        </div>

        {canMutate && (
          <Link
            to={`/drivers/${driver.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('actions.edit')}
          </Link>
        )}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {t('drivers.detail.vehicles')} ({driver.vehicles.length})
        </h2>
        {driver.vehicles.length === 0 ? (
          <p className="text-sm text-gray-400">{t('drivers.detail.noVehicles')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {driver.vehicles.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between py-3 text-sm">
                <Link
                  to={`/vehicles/${vehicle.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {vehicle.plate}
                </Link>
                <span className="text-gray-500">
                  {vehicle.brand} {vehicle.model}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {t('drivers.detail.documents')}
          </h2>
          {canMutate && (
            <Link
              to={`/documents/new?driverId=${driver.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              + {t('documents.new')}
            </Link>
          )}
        </div>
        {loadingDocuments ? (
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400">{t('drivers.detail.noDocuments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4">{t('documents.columns.type')}</th>
                  <th className="pb-2 pr-4">{t('documents.columns.expiryDate')}</th>
                  <th className="pb-2 pr-4">{t('documents.columns.status')}</th>
                  <th className="pb-2">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="py-2 pr-4">{t(`documents.types.${doc.type}`)}</td>
                    <td className="py-2 pr-4">
                      {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getDocStatusClasses(doc.status)}`}
                      >
                        {t(`documents.statuses.${doc.status}`)}
                      </span>
                    </td>
                    <td className="py-2">
                      {doc.fileUrl && (
                        <button
                          onClick={() => setPreviewUrl(doc.fileUrl!)}
                          className="text-blue-600 hover:underline"
                        >
                          {t('documents.preview.viewFile')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewUrl && (
        <FilePreviewModal
          isOpen
          fileUrl={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  )
}
```

- [x] **Step 2: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/DriverDetail.tsx
git commit -m "feat(web): add DriverDetail page with vehicles and documents sections"
```

---

## Task 9: `DriverList` + rota `/drivers/:id`

**Files:**
- Modify: `apps/web/src/pages/DriverList.tsx`
- Modify: `apps/web/src/App.tsx`

- [x] **Step 1: Adicionar link "Ver detalhes" na `DriverList`**

Em `DriverList.tsx`, localizar o bloco de aÃ§Ãµes de cada linha. Atualmente existe:

```tsx
<div className="flex flex-wrap items-center gap-3">
  <Link
    to={`/drivers/${driver.id}/edit`}
```

Adicionar o link "Ver detalhes" antes do link de ediÃ§Ã£o:

```tsx
<div className="flex flex-wrap items-center gap-3">
  <Link
    to={`/drivers/${driver.id}`}
    className="text-blue-600 hover:underline"
  >
    {t('drivers.viewDetail')}
  </Link>
  <Link
    to={`/drivers/${driver.id}/edit`}
```

- [x] **Step 2: Adicionar rota em `App.tsx`**

Em `App.tsx`, adicionar o import:

```tsx
import { DriverDetail } from '@/pages/DriverDetail'
```

ApÃ³s a linha `<Route path="/drivers/:id/edit" element={<DriverForm />} />`, adicionar:

```tsx
<Route path="/drivers/:id" element={<DriverDetail />} />
```

- [x] **Step 3: Adicionar traduÃ§Ã£o `actions.backToDrivers`**

Em `pt-BR.json`, adicionar (verificar se jÃ¡ existe):

```json
"actions.backToDrivers": "Voltar para motoristas",
```

Em `en-US.json`:

```json
"actions.backToDrivers": "Back to drivers",
```

- [x] **Step 4: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

SaÃ­da esperada: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/DriverList.tsx apps/web/src/App.tsx apps/web/src/locales/pt-BR.json apps/web/src/locales/en-US.json
git commit -m "feat(web): add DriverDetail route and view-detail link in DriverList"
```

---

## Task 10: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [x] **Step 1: Atualizar data de "Ãšltima atualizaÃ§Ã£o"**

Alterar a linha:

```
> **Ãšltima atualizaÃ§Ã£o:** 2026-05-14 ...
```

Para:

```
> **Ãšltima atualizaÃ§Ã£o:** 2026-05-26 (upload de arquivos nos documentos, filtro de tipos por entidade, DriverDetail, seÃ§Ã£o de documentos em VehicleDetail e DriverDetail)
```

- [x] **Step 2: Marcar os itens como concluÃ­dos e adicionar registro no histÃ³rico**

Na seÃ§Ã£o "Ajustes pos-MVP", adicionar:

```markdown
- [x] **Feature: upload de arquivo + melhorias no mÃ³dulo de documentos**
  - Campo `fileUrl` adicionado ao model `Document` (migration aplicada)
  - Upload direto para Supabase Storage via `@supabase/supabase-js`
  - `DocumentForm` filtra tipos por entidade (veÃ­culo vs motorista) e aceita upload de imagem/PDF
  - `DocumentList` exibe botÃ£o "Ver arquivo" com `FilePreviewModal`
  - `VehicleDetail` ganhou seÃ§Ã£o de documentos com preview
  - `DriverDetail` criado com seÃ§Ãµes de veÃ­culos vinculados e documentos
  - `DriverList` ganhou link "Ver detalhes"
```

No histÃ³rico de implementaÃ§Ã£o, adicionar linha:

```
| 2026-05-26 | Claude | Feature: upload de arquivo e melhorias em documentos | fileUrl no schema, Supabase Storage client-side, FilePreviewModal, DocumentForm com filtro de tipos, VehicleDetail e DriverDetail com seÃ§Ã£o de documentos |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with document upload feature completion"
```
