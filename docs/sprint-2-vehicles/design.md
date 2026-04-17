# Sprint 2 — Veículos e Motoristas: Design Spec

**Data:** 2026-04-16  
**Issues:** #1, #24, #25, #26, #27, #28, #29  
**Sprint:** 2 de 6

---

## Objetivo

Implementar CRUD completo de Veículos e Motoristas com vinculação entre eles — backend REST + frontend React — sobre a base do pré-sprint (autenticação, RBAC, validação Zod já prontos).

---

## Abordagem

**Backend primeiro**, depois frontend. Evita context-switching entre camadas e reutiliza padrões estabelecidos: Repository → Service → Controller → Routes com TDD (Vitest).

---

## Backend (issue #1)

### Veículos

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | `/vehicles` | todos | Listagem com filtros e ordenação |
| GET | `/vehicles/:id` | todos | Detalhes + motoristas vinculados |
| POST | `/vehicles` | ADMIN, MANAGER | Cadastro |
| PUT | `/vehicles/:id` | ADMIN, MANAGER | Edição |
| DELETE | `/vehicles/:id` | ADMIN, MANAGER | Exclusão lógica (status → INACTIVE) |

**Filtros em GET /vehicles:** `plate`, `brand`, `model`, `status`, `yearMin`, `yearMax`, `orderBy`, `order` (asc/desc).

**GET /vehicles/:id** retorna o veículo com:
- Array de motoristas vinculados (via `_VehicleDrivers`)
- Últimas 5 despesas (`Expense`)
- Últimas 5 manutenções (`Maintenance`)

### Motoristas

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | `/drivers` | todos | Listagem com filtros |
| GET | `/drivers/:id` | todos | Detalhes + veículos vinculados |
| POST | `/drivers` | ADMIN, MANAGER | Cadastro |
| PUT | `/drivers/:id` | ADMIN, MANAGER | Edição |
| DELETE | `/drivers/:id` | ADMIN, MANAGER | Exclusão lógica (status → INACTIVE) |

**Filtros em GET /drivers:** `name`, `cpf`, `status`.

### Vinculação

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | `/vehicles/:id/drivers` | ADMIN, MANAGER | Vincula motorista(s) ao veículo |
| DELETE | `/vehicles/:vehicleId/drivers/:driverId` | ADMIN, MANAGER | Remove vínculo |

**Body de POST /vehicles/:id/drivers:** `{ driverIds: string[] }`

### Estrutura de Arquivos (backend)

```
apps/api/src/
├── repositories/
│   ├── vehicle.repository.ts
│   └── driver.repository.ts
├── services/
│   ├── vehicle.service.ts
│   ├── driver.service.ts
│   └── __tests__/
│       ├── vehicle.service.test.ts
│       └── driver.service.test.ts
├── controllers/
│   ├── vehicle.controller.ts
│   └── driver.controller.ts
└── routes/
    ├── vehicle.routes.ts
    └── driver.routes.ts
```

`routes/index.ts` já registrado — só adicionar as novas rotas.

### Validação (Zod)

- `CreateVehicleSchema`: `plate` (string, obrigatório), `brand`, `model`, `year` (number, 1900–2030), `color` (opcional), `status` (enum VehicleStatus, default ACTIVE)
- `UpdateVehicleSchema`: todos os campos opcionais
- `CreateDriverSchema`: `name`, `cpf` (11 dígitos), `cnh`, `cnhExpiry` (date), `phone` (opcional), `status` (enum DriverStatus, default ACTIVE)
- `UpdateDriverSchema`: todos os campos opcionais
- `LinkDriversSchema`: `{ driverIds: [string, ...string[]] }` (array não-vazio)

### Tratamento de Erros

- Veículo/Motorista não encontrado → `AppError(404, 'Vehicle not found')`
- Placa duplicada → `AppError(409, 'Plate already in use')`
- CPF duplicado → `AppError(409, 'CPF already in use')`
- Motorista já vinculado → idempotente (sem erro, apenas ignora)

### Testes

Cada service terá testes unitários mockando o repository (padrão de `user.service.test.ts`):
- `vehicle.service.test.ts`: findAll com filtros, findById com relações, create, update, delete lógico, vincular/desvincular
- `driver.service.test.ts`: findAll com filtros, findById, create, update, delete lógico

---

## Frontend

Reutiliza `AppLayout`, `Sidebar`, `Header` existentes. Integração via `fetch` + JWT do Auth0 (`getAccessTokenSilently`). Estado local com `useState` + `useEffect` — sem biblioteca global de estado.

### Novas Rotas (`App.tsx`)

```
/vehicles             → VehicleList
/vehicles/new         → VehicleForm (modo criação)
/vehicles/:id         → VehicleDetail
/vehicles/:id/edit    → VehicleForm (modo edição)
/vehicles/:id/drivers → VehicleDrivers (vinculação)
/drivers              → DriverList
/drivers/new          → DriverForm (modo criação)
/drivers/:id/edit     → DriverForm (modo edição)
```

Todas protegidas com `ProtectedRoute`.

### Tela: Listagem de Veículos (#24)

- Tabela com colunas: Placa, Marca, Modelo, Ano, Cor, Status (badge colorido), Ações
- Filtros no topo: campo de texto (placa/marca/modelo), select de status, inputs de ano min/max
- Ordenação por clique no cabeçalho da coluna
- Botão "Novo Veículo" (visível apenas para ADMIN/MANAGER)
- Botões de ação por linha: Ver, Editar, Motoristas (visível apenas ADMIN/MANAGER), Desativar

### Tela: Formulário de Veículo (#25)

- Campos: Placa, Marca, Modelo, Ano, Cor, Status
- Modo criação: POST `/vehicles`
- Modo edição: GET `/vehicles/:id` para pré-preencher, PUT `/vehicles/:id`
- Validação client-side com feedback inline
- Botão Cancelar volta para `/vehicles`

### Tela: Detalhes do Veículo (#26)

- Dados do veículo em destaque (placa, marca, modelo, ano, status)
- Seção "Motoristas Vinculados": lista com nome, CNH, status + link para `/vehicles/:id/drivers`
- Seção "Últimas Despesas": tabela simples (tipo, valor, data) — dados reais da API
- Seção "Últimas Manutenções": tabela simples (tipo, status, data agendada)
- Botão "Editar Veículo" (ADMIN/MANAGER)

### Tela: Listagem de Motoristas (#27)

- Tabela com colunas: Nome, CPF (mascarado), CNH, Vencimento CNH (badge vermelho se vencido/próximo), Status, Ações
- Filtros: busca por nome/CPF, select de status
- Botão "Novo Motorista" (ADMIN/MANAGER)
- Botões de ação por linha: Editar, Desativar

### Tela: Formulário de Motorista (#28)

- Campos: Nome, CPF, CNH, Vencimento CNH (date picker), Telefone, Status
- Modo criação/edição (mesmo padrão do formulário de veículo)

### Tela: Vinculação Motorista ↔ Veículo (#29)

- Header com dados do veículo (placa + modelo)
- Seção "Motoristas Vinculados": lista com nome, CNH + botão "Remover" por linha
- Seção "Adicionar Motorista": campo de busca por nome/CPF que filtra motoristas disponíveis (status ACTIVE, não vinculados ainda) → botão "Vincular"
- Chamadas: POST `/vehicles/:id/drivers` e DELETE `/vehicles/:vehicleId/drivers/:driverId`

### Estrutura de Arquivos (frontend)

```
apps/web/src/
├── pages/
│   ├── VehicleList.tsx
│   ├── VehicleForm.tsx
│   ├── VehicleDetail.tsx
│   ├── VehicleDrivers.tsx
│   ├── DriverList.tsx
│   └── DriverForm.tsx
├── hooks/
│   ├── useVehicles.ts      ← fetch GET /vehicles
│   ├── useVehicle.ts       ← fetch GET /vehicles/:id
│   ├── useDrivers.ts       ← fetch GET /drivers
│   └── useDriver.ts        ← fetch GET /drivers/:id
└── lib/
    └── api.ts              ← helper: fetch com Authorization header
```

### Helper `api.ts`

Centraliza `fetch` com JWT:
```ts
export async function apiFetch(path: string, token: string, options?: RequestInit)
```

Retorna `{ data, error }`. Todos os hooks e mutations usam esse helper.

---

## Sequência de Implementação

1. Backend: vehicle repository + service (TDD)
2. Backend: vehicle controller + routes
3. Backend: driver repository + service (TDD)
4. Backend: driver controller + routes
5. Frontend: `api.ts` helper + hooks de veículos
6. Frontend: VehicleList + VehicleForm + VehicleDetail
7. Frontend: hooks de motoristas + DriverList + DriverForm
8. Frontend: VehicleDrivers (vinculação)
9. Frontend: adicionar rotas no `App.tsx` + links no `Sidebar`
10. CLAUDE.md: atualizar estado e histórico

---

## Fora do Escopo desta Sprint

- Paginação (backlog Sprint 5)
- Upload de foto do veículo/motorista
- Histórico de manutenções no detalhe do motorista (virá na Sprint 3)
- Testes de integração do frontend
