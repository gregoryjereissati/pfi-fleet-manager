# Sprint 4 — Documentos e Alertas: Design Spec

**Data:** 2026-04-17  
**Issues:** #20, #5, #34, #35, #36, #37  
**Status:** Aprovado

---

## Objetivo

Implementar o módulo de documentos obrigatórios da frota (CRLV, CNH, seguros, etc.) com controle de vencimento, job de alertas automáticos e notificações visuais no frontend.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Tipos de documento | Enum fixo (`DocumentType`) | Filtros e i18n consistentes |
| Status de vencimento | Computado em tempo real no repository | Sem campo extra no banco, sempre fresco |
| Canal de alertas | UI-only (sem e-mail) | Escopo acadêmico suficiente |
| Janela de alerta | 30 dias antes do vencimento | Padrão para renovações de frota |
| `alertSent` | Flag idempotente para o cron job | Evita re-marcar documentos já notificados |

---

## Modelo de Dados

### Alteração no Prisma Schema

Converter o campo `type` do model `Document` de `String` para o novo enum `DocumentType`:

```prisma
enum DocumentType {
  CRLV
  IPVA
  SEGURO
  CNH
  LICENCA
  OUTRO
}

model Document {
  id         String       @id @default(cuid())
  vehicleId  String?
  vehicle    Vehicle?     @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  driverId   String?
  driver     Driver?      @relation(fields: [driverId], references: [id], onDelete: Cascade)
  type       DocumentType
  expiryDate DateTime
  alertSent  Boolean      @default(false)
  createdAt  DateTime     @default(now())
}
```

**Constraint:** `vehicleId` e `driverId` não podem ser ambos nulos — validado no service.

### Status Computado (não armazenado)

Calculado no repository a partir de `expiryDate` e da data atual:

| Status | Condição |
|---|---|
| `EXPIRED` | `expiryDate < hoje` |
| `EXPIRING_SOON` | `hoje <= expiryDate <= hoje + 30 dias` |
| `OK` | `expiryDate > hoje + 30 dias` |

### DTOs Atualizados

```typescript
// packages/shared/src/dtos/document.dto.ts
export type DocumentStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentDto {
  id: string;
  vehicleId?: string;
  vehiclePlate?: string;   // join para display
  driverId?: string;
  driverName?: string;     // join para display
  type: DocumentType;
  expiryDate: string;
  alertSent: boolean;
  status: DocumentStatus;  // campo computado
  createdAt: string;
}

export interface CreateDocumentDto {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: string;
}

export interface UpdateDocumentDto {
  type?: DocumentType;
  expiryDate?: string;
}
```

---

## Backend

### Estrutura de Arquivos

```
apps/api/src/
├── repositories/document.repository.ts
├── services/document.service.ts
├── services/__tests__/document.service.test.ts
├── controllers/document.controller.ts
├── routes/document.routes.ts
└── jobs/
    └── alertCron.ts
```

### API Endpoints

| Método | Rota | Roles | Descrição |
|---|---|---|---|
| GET | `/documents` | ALL | Lista com filtros opcionais |
| GET | `/documents/alerts/count` | ALL | Count para badge do sidebar |
| GET | `/documents/:id` | ALL | Detalhe de um documento |
| POST | `/documents` | ADMIN, MANAGER | Criar documento |
| PUT | `/documents/:id` | ADMIN, MANAGER | Atualizar documento |
| DELETE | `/documents/:id` | ADMIN, MANAGER | Excluir documento |

**Filtros disponíveis em `GET /documents`:**
- `vehicleId` — filtra por veículo
- `driverId` — filtra por motorista
- `type` — filtra por `DocumentType`
- `status` — filtra por status computado (`OK`, `EXPIRING_SOON`, `EXPIRED`)

### Document Repository

```typescript
interface DocumentFilters {
  vehicleId?: string;
  driverId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
}

// Métodos principais
findAll(filters: DocumentFilters): Promise<DocumentDto[]>
findById(id: string): Promise<DocumentDto | null>
create(data: CreateDocumentDto): Promise<DocumentDto>
update(id: string, data: UpdateDocumentDto): Promise<DocumentDto>
delete(id: string): Promise<void>
countAlertsActive(): Promise<number>         // EXPIRED + EXPIRING_SOON
findNeedingAlert(days: number): Promise<Document[]>   // alertSent=false AND expiryDate <= hoje+days
markAlertSent(ids: string[]): Promise<void>
```

**Lógica do status computado no repository:**
- Calcular `today = new Date()` e `threshold = today + 30 dias`
- Aplicar no `select` de cada documento (pode ser via `include` com campo calculado em memória após query, ou via `Prisma.$queryRaw` se necessário para filtro por status)
- Para `status` como filtro: buscar no Prisma com condição `WHERE` em `expiryDate`

### Document Service

Validações de negócio:
- `vehicleId` ou `driverId` deve ser fornecido (não ambos nulos)
- Não aceitar ambos `vehicleId` e `driverId` preenchidos simultaneamente (documento pertence a uma entidade)
- `expiryDate` deve ser uma data válida

Lança `AppError(404)` se documento não encontrado.

### Cron Job — `alertCron.ts`

```typescript
import cron from 'node-cron';

// Executa todo dia à meia-noite
cron.schedule('0 0 * * *', async () => {
  // Inclui docs já EXPIRED (expiryDate <= hoje) e EXPIRING_SOON (até +30 dias)
  const docs = await documentRepository.findNeedingAlert(30);
  if (docs.length === 0) return;
  await documentRepository.markAlertSent(docs.map(d => d.id));
  console.log(`[alertCron] ${docs.length} document(s) marked as alert sent`);
});
```

Registrado em `apps/api/src/app.ts` via `import './jobs/alertCron'`.

### Testes (TDD — ~10 testes)

```
document.service.test.ts:
- findAll retorna lista com status computado
- findAll filtra por status EXPIRING_SOON
- findAll filtra por status EXPIRED
- findById retorna documento com status
- findById lança 404 se não encontrar
- create valida vehicleId ou driverId obrigatório
- create lança erro se ambos vehicleId e driverId nulos
- update lança 404 se documento não existir
- delete lança 404 se documento não existir
- countAlertsActive retorna count correto
```

---

## Frontend

### Estrutura de Arquivos

```
apps/web/src/
├── pages/
│   ├── DocumentList.tsx
│   ├── DocumentForm.tsx
│   └── AlertCenter.tsx
├── hooks/
│   ├── useDocuments.ts
│   └── useAlertCount.ts
```

### Rotas (App.tsx)

```
/documents          → DocumentList
/documents/new      → DocumentForm (criação)
/documents/:id/edit → DocumentForm (edição)
/alerts             → AlertCenter
```

### DocumentList (`/documents`)

- Tabela com colunas: **Entidade** (placa do veículo ou nome do motorista), **Tipo**, **Vencimento**, **Status** (badge colorido), **Ações**
- Badge de status: verde (`OK`), amarelo (`EXPIRING_SOON`), vermelho (`EXPIRED`)
- Filtros: veículo (dropdown), tipo (dropdown), status (dropdown)
- Botão "Novo Documento" → `/documents/new`
- Delete disponível para ADMIN/MANAGER

### DocumentForm (`/documents/new`, `/documents/:id/edit`)

Campos:
- **Entidade** — radio "Veículo" / "Motorista" + dropdown correspondente (obrigatório)
- **Tipo** — select com os valores do enum `DocumentType` (obrigatório)
- **Data de vencimento** — date picker (obrigatório)

Validações:
- Entidade obrigatória (veículo ou motorista selecionado)
- Tipo obrigatório
- Data obrigatória

Após submit: redireciona para `/documents`.

### AlertCenter (`/alerts`)

- Lista todos os documentos com status `EXPIRING_SOON` ou `EXPIRED`
- Agrupados em duas seções: "Vencidos" (EXPIRED) e "Vencendo em breve" (EXPIRING_SOON)
- Cada item mostra: entidade, tipo, data de vencimento, dias restantes/vencidos
- Link "Ver todos os documentos" → `/documents`
- Estado vazio: mensagem de sucesso "Nenhum alerta ativo"

### Notificações Visuais (#37)

**Sidebar (`Sidebar.tsx`):**
- Item "Documentos" exibe badge vermelho com `count` de `useAlertCount()`
- Item "Alertas" (novo) exibe o mesmo count
- Badge some quando `count === 0`

**Header (`Header.tsx`):**
- Ícone de sino (`Bell` do lucide-react) com badge numérico
- Ao clicar: navega para `/alerts`

### Hook `useAlertCount`

```typescript
// Polling a cada 5 minutos para manter badge atualizado
// Retorna: { count: number, loading: boolean }
```

---

## i18n

Novas chaves em `pt-BR.json` e `en-US.json`:

```json
// Documentos
"documents.title": "Documentos",
"documents.subtitle": "Controle de vencimentos de CRLV, seguros, CNH e outros.",
"documents.new": "Novo Documento",
"documents.empty": "Nenhum documento encontrado.",
"documents.deleteConfirm": "Excluir este documento?",
"documents.columns.entity": "Entidade",
"documents.columns.type": "Tipo",
"documents.columns.expiryDate": "Vencimento",
"documents.columns.status": "Status",
"documents.entity.vehicle": "Veículo",
"documents.entity.driver": "Motorista",
"documents.types.CRLV": "CRLV",
"documents.types.IPVA": "IPVA",
"documents.types.SEGURO": "Seguro",
"documents.types.CNH": "CNH",
"documents.types.LICENCA": "Licença de Operação",
"documents.types.OUTRO": "Outro",
"documents.statuses.OK": "Em dia",
"documents.statuses.EXPIRING_SOON": "Vencendo em breve",
"documents.statuses.EXPIRED": "Vencido",
"documents.validation.entity": "Selecione um veículo ou motorista.",
"documents.validation.type": "Selecione o tipo do documento.",
"documents.validation.expiryDate": "Informe a data de vencimento.",
// Alertas
"alerts.title": "Central de Alertas",
"alerts.subtitle": "Documentos vencidos ou vencendo nos próximos 30 dias.",
"alerts.expired": "Vencidos",
"alerts.expiringSoon": "Vencendo em breve",
"alerts.empty": "Nenhum alerta ativo",
"alerts.daysOverdue": "{{days}} dia(s) vencido(s)",
"alerts.daysRemaining": "Vence em {{days}} dia(s)",
"nav.alerts": "Alertas"
```

---

## Checklist de Entrega

- [ ] Migration Prisma: `DocumentType` enum + campo `type` atualizado
- [ ] `packages/shared`: enum `DocumentType` + `DocumentStatus` + DTOs atualizados
- [ ] Backend TDD: 10 testes em `document.service.test.ts`
- [ ] Backend: repository, service, controller, routes
- [ ] Backend: `GET /documents/alerts/count`
- [ ] Backend: `alertCron.ts` registrado no `app.ts`
- [ ] Frontend: `DocumentList`, `DocumentForm`, `AlertCenter`
- [ ] Frontend: `useDocuments`, `useAlertCount`
- [ ] Frontend: badge no Sidebar e ícone de sino no Header
- [ ] i18n: chaves pt-BR e en-US completas
- [ ] `tsc --noEmit` API e web passando
- [ ] `npm run test:api` passando (todos os testes)
- [ ] CLAUDE.md atualizado com checkboxes marcados
