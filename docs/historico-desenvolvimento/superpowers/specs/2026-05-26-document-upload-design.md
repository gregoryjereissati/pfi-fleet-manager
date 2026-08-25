# Design: Upload de Arquivos e Melhorias no Módulo de Documentos

**Data:** 2026-05-26  
**Projeto:** Fleet Manager — PFI UNIFOR  
**Status:** Aprovado

---

## Contexto

O módulo de documentos atual permite cadastrar documentos com tipo e data de vencimento, vinculados a veículos ou motoristas. Falta: (1) upload do arquivo físico do documento, (2) filtro de tipos por entidade, (3) visualização dos documentos nas páginas de detalhe do veículo e do motorista, e (4) página de detalhe do motorista.

---

## Decisões de Arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Armazenamento de arquivos | Supabase Storage | Já está na stack; sem dependências novas |
| Estratégia de upload | Client-side (browser → Supabase Storage direto) | Elimina parsing de multipart no servidor; URL retornada é salva pelo backend |
| Campo no banco | `fileUrl String?` em `Document` | Nullable para compatibilidade com documentos existentes |

---

## Categorização de Tipos por Entidade

| Tipo | Veículo | Motorista |
|---|---|---|
| CRLV | ✅ | ❌ |
| IPVA | ✅ | ❌ |
| SEGURO | ✅ | ❌ |
| CNH | ❌ | ✅ |
| LICENCA | ✅ | ✅ |
| OUTRO | ✅ | ✅ |

---

## Seção 1 — Camada de Dados

### Prisma Schema

Adicionar campo ao model `Document`:

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

Migration: `add_file_url_to_document`

---

## Seção 2 — Backend

### `document.repository.ts`

- Adicionar `fileUrl?: string` em `CreateDocumentData` e `UpdateDocumentData`
- Incluir `fileUrl: document.fileUrl ?? null` no `mapDocument`

### `document.controller.ts`

- Aceitar `fileUrl` no body de create e update, repassando ao service

Nenhum endpoint novo de upload. O backend apenas persiste a URL retornada pelo Supabase Storage.

---

## Seção 3 — Frontend: Formulário e Visualização

### `DocumentForm.tsx`

**Filtro de tipos por entidade:**
- Definir constantes `VEHICLE_DOCUMENT_TYPES = [CRLV, IPVA, SEGURO, LICENCA, OUTRO]` e `DRIVER_DOCUMENT_TYPES = [CNH, LICENCA, OUTRO]`
- O `<select>` de tipo filtra com base em `form.entityType`
- Quando `entityType` muda, resetar `type` para o primeiro valor disponível

**Campo de upload:**
- Input `type="file"` com `accept="image/*,application/pdf"`
- Ao selecionar arquivo: upload para bucket `documents` no Supabase Storage
- Caminho: `{entityType}/{entityId}/{uuid}-{filename}`
- Ao salvar: `fileUrl` (URL pública retornada pelo Storage) enviada junto com os demais campos
- No modo edição: exibir link/preview do arquivo atual se `fileUrl` existir; novo upload substitui

**Query params de pré-preenchimento:**
- `?vehicleId={id}` pré-seleciona entidade "veículo" e o veículo correspondente
- `?driverId={id}` pré-seleciona entidade "motorista" e o motorista correspondente

### `DocumentList.tsx`

- Adicionar coluna/ação "Ver arquivo" visível quando `document.fileUrl` existe
- Clicar abre `FilePreviewModal` com a URL do arquivo

### `FilePreviewModal.tsx` — novo componente

- Props: `isOpen`, `fileUrl`, `onClose`
- Se URL termina em `.pdf`: renderiza `<iframe src={fileUrl} />`
- Se for imagem: renderiza `<img src={fileUrl} />`
- Botão "Abrir em nova aba" (`target="_blank"`) como fallback
- Botão fechar no canto superior direito
- Backdrop escuro ao redor do modal

---

## Seção 4 — Páginas de Detalhe das Entidades

### `VehicleDetail.tsx` — nova seção de documentos

- Busca: `GET /documents?vehicleId={id}` via hook `useDocuments`
- Lista: tipo traduzido, data de vencimento (pt-BR), badge de status, botão "Ver arquivo" (abre `FilePreviewModal`)
- Link "+ Novo documento" → `/documents/new?vehicleId={id}`

### `DriverDetail.tsx` — nova página

Estrutura seguindo o padrão visual de `VehicleDetail`:

- **Header:** nome, CPF, CNH, telefone, status (badge ativo/inativo), botão Editar
- **Seção de veículos vinculados:** lista com placa e modelo (se houver)
- **Seção de documentos:** busca `GET /documents?driverId={id}`, mesmo padrão que VehicleDetail
- Link "+ Novo documento" → `/documents/new?driverId={id}`
- Rota: `/drivers/:id` registrada no `App.tsx`

### `DriverList.tsx`

- Adicionar link "Ver detalhes" em cada linha, navegando para `/drivers/{id}`

---

## Configuração do Supabase Storage

- Criar bucket `documents` no projeto Supabase (pode ser público ou privado com RLS)
- Adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ao `.env` do frontend
- Instalar `@supabase/supabase-js` em `apps/web` se não estiver presente

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `apps/api/prisma/schema.prisma` | Adicionar `fileUrl` ao model Document |
| `apps/api/src/repositories/document.repository.ts` | Interfaces + mapDocument |
| `apps/api/src/controllers/document.controller.ts` | Aceitar fileUrl no body |
| `apps/web/src/pages/DocumentForm.tsx` | Filtro de tipos + upload |
| `apps/web/src/pages/DocumentList.tsx` | Botão "Ver arquivo" |
| `apps/web/src/components/FilePreviewModal.tsx` | Novo componente |
| `apps/web/src/pages/VehicleDetail.tsx` | Seção de documentos |
| `apps/web/src/pages/DriverDetail.tsx` | Nova página |
| `apps/web/src/pages/DriverList.tsx` | Link "Ver detalhes" |
| `apps/web/src/App.tsx` | Rota `/drivers/:id` |
| `apps/web/src/locales/pt-BR.json` | Chaves de i18n novas |
| `apps/web/src/locales/en-US.json` | Chaves de i18n novas |
| `CLAUDE.md` | Atualizar estado do projeto |
