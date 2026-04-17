# Fleet Manager — Design de Inicialização do Projeto

**Data:** 2026-04-14  
**Projeto:** Fleet Manager – Sistema de Gestão Inteligente de Frotas  
**Código:** FM-PFI-2026  
**Instituição:** UNIFOR – Ciência da Computação

---

## Contexto

O Fleet Manager é um sistema web para gestão inteligente de frotas desenvolvido como TCC. O sistema centraliza controle operacional, financeiro e documental de veículos. Este documento descreve as decisões de arquitetura e o plano de implementação inicial do projeto.

---

## Decisões Arquiteturais

### Stack Tecnológica (conforme documentos do projeto)

| Camada | Tecnologia |
|---|---|
| Frontend | React.js + TypeScript (hospedado na Vercel) |
| Backend | Node.js + Express + TypeScript (API REST) |
| ORM | Prisma |
| Banco de Dados | PostgreSQL (Docker local → AWS RDS em produção) |
| Cache / Filas | Redis (em memória no dev → migrar para produção no final) |
| Autenticação | Auth0 + JWT |
| Validação | Zod |
| Controle de Acesso | RBAC (Administrador, Gestor, Operador) |
| Containers | Docker + AWS ECS (produção) |

### Organização do Repositório

**Monorepo com npm workspaces:**

```
fleet-manager/
├── apps/
│   ├── api/                  ← Backend Node.js + Express
│   └── web/                  ← Frontend React.js
├── packages/
│   └── shared/               ← Tipos TypeScript compartilhados (DTOs, enums)
├── docker-compose.yml        ← PostgreSQL local
├── package.json              ← npm workspaces root
├── tsconfig.base.json        ← TypeScript base config
└── .env.example
```

### Estrutura Interna do Backend (Layered Architecture)

```
apps/api/src/
├── controllers/     ← recebe requisição HTTP, chama service
├── services/        ← regras de negócio
├── repositories/    ← acesso ao banco via Prisma
├── routes/          ← definição e agrupamento de rotas
├── middlewares/     ← authenticate, authorize (RBAC), validate (Zod)
├── config/          ← env, database, redis
├── types/           ← tipos locais do backend
└── server.ts        ← entrypoint Express
```

### Pacote Compartilhado

```
packages/shared/src/
├── dtos/            ← CreateVehicleDto, UpdateExpenseDto, etc.
└── enums/           ← UserRole, MaintenanceStatus, ExpenseType, etc.
```

---

## Modelo de Dados (Prisma Schema)

### Entidades Principais

**User**
- `id`, `name`, `email`
- `role`: `ADMIN | MANAGER | OPERATOR`
- `auth0Id`, `createdAt`, `updatedAt`

**Vehicle**
- `id`, `plate`, `brand`, `model`, `year`, `color`
- `status`: `ACTIVE | INACTIVE`
- `createdAt`, `updatedAt`

**Driver**
- `id`, `name`, `cpf`, `cnh`, `cnhExpiry`
- `phone`, `status`: `ACTIVE | INACTIVE`
- `createdAt`, `updatedAt`

**Expense**
- `id`, `vehicleId` → Vehicle
- `type`: `FUEL | MAINTENANCE | FINE | IPVA | INSURANCE | OTHER`
- `amount`, `date`, `description`, `createdAt`

**Maintenance**
- `id`, `vehicleId` → Vehicle
- `type`: `PREVENTIVE | CORRECTIVE`
- `status`: `SCHEDULED | DONE | OVERDUE`
- `description`, `scheduledDate`, `completedDate`, `createdAt`

**Document**
- `id`, `vehicleId?` → Vehicle, `driverId?` → Driver
- `type` (ex: `CRLV`, `IPVA`, `CNH`, `INSURANCE`)
- `expiryDate`, `alertSent` (bool), `createdAt`

### Relações
- `Vehicle` 1:N `Expense`
- `Vehicle` 1:N `Maintenance`
- `Vehicle` 1:N `Document`
- `Driver` 1:N `Document`

---

## Autenticação e RBAC

### Fluxo de Autenticação
1. Frontend faz login via Auth0 (SDK)
2. Auth0 retorna um JWT (access token)
3. Frontend envia o token no header: `Authorization: Bearer <token>`
4. Backend valida o JWT usando a chave pública do Auth0 (lib: `jose`)
5. Middleware extrai o `auth0Id` e busca o `User` no banco
6. Middleware de RBAC verifica o `role` antes de liberar a rota

### Middlewares
- `authenticate.ts` — valida JWT do Auth0
- `authorize.ts` — verifica role permitido para a rota
- `validate.ts` — valida body da requisição com Zod

### Matriz de Acesso

| Recurso              | ADMIN | MANAGER | OPERATOR |
|----------------------|-------|---------|----------|
| Gerenciar usuários   | ✅    | ❌      | ❌       |
| Cadastrar veículos   | ✅    | ✅      | ❌       |
| Cadastrar motoristas | ✅    | ✅      | ❌       |
| Registrar despesas   | ✅    | ✅      | ✅       |
| Registrar manutenções| ✅    | ✅      | ✅       |
| Ver dashboard        | ✅    | ✅      | ✅       |
| Excluir registros    | ✅    | ✅      | ❌       |

---

## Repositório GitHub

**URL:** https://github.com/gregoryjereissati/pfi-fleet-manager

---

## Plano de Implementação por Sprints

Tudo parte do zero. Nenhuma tarefa está concluída.

Itens sem número de issue são tarefas novas identificadas no design que não constam no board original.

---

### Pré-Sprint — Setup e Backend Core
> [#9](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/9) · [#16](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/16) · [#7](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/7) · [#14](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/14)

**Setup do monorepo — [#9](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/9)**
- Inicializar repositório git e `package.json` raiz com npm workspaces (`apps/*`, `packages/*`)
- Configurar `tsconfig.base.json` compartilhado
- Criar estrutura de pastas: `apps/api`, `apps/web`, `packages/shared`
- Configurar ESLint + Prettier na raiz

**Banco de dados — [#16](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/16)**
- Criar `docker-compose.yml` com PostgreSQL (porta 5432)
- Inicializar Prisma em `apps/api` (`prisma init`)
- Escrever schema completo (User, Vehicle, Driver, Expense, Maintenance, Document)
- Rodar primeira migration (`prisma migrate dev --name init`)
- Criar seed básico com dados de teste (`prisma/seed.ts`)

**Pacote compartilhado** *(novo)*
- Criar `packages/shared/src/dtos/` — DTOs de entrada para cada entidade
- Criar `packages/shared/src/enums/` — UserRole, ExpenseType, MaintenanceStatus, MaintenanceType

**Backend core — [#14](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/14)**
- Montar servidor Express com TypeScript (`apps/api/src/server.ts`)
- Configurar variáveis de ambiente com dotenv + validação via Zod (`src/config/env.ts`)
- Implementar handler global de erros

**Autenticação e RBAC — [#7](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/7)**
- Implementar `middlewares/authenticate.ts` — validação JWT via Auth0 (`jose`)
- Implementar `middlewares/authorize.ts` — verificação de role (RBAC)
- Implementar `middlewares/validate.ts` — validação de body com Zod

---

### Sprint 1 — Auth Frontend + Dashboard + i18n
> [#21](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/21) · [#22](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/22) · [#23](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/23)

**Frontend:**
- [#21](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/21) ◻ Integrar Auth0 SDK ao frontend — login, logout, proteção de rotas (RF09/RF10)
- [#22](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/22) ◻ Implementar i18n pt-BR / en-US
- [#23](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/23) ◻ Implementar tela de Dashboard (RF08) — estrutura inicial com dados mockados; será conectada ao backend na Sprint 5

---

### Sprint 2 — Veículos e Motoristas
> [#1](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/1) · [#24](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/24) · [#25](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/25) · [#26](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/26) · [#27](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/27) · [#28](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/28) · [#29](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/29)

**Backend — [#1](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/1)**
- CRUD completo de veículos: `GET /vehicles`, `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id`
- CRUD completo de motoristas: `GET /drivers`, `POST /drivers`, `PATCH /drivers/:id`, `DELETE /drivers/:id`
- Endpoint de vinculação motorista ↔ veículo

**Frontend:**
- [#24](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/24) ◻ Tela de listagem de veículos com filtros e paginação (RF01)
- [#25](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/25) ◻ Formulário de cadastro e edição de veículos (RF01)
- [#26](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/26) ◻ Tela de detalhes do veículo (RF01)
- [#27](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/27) ◻ Tela de listagem de motoristas (RF02)
- [#28](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/28) ◻ Formulário de cadastro e edição de motoristas (RF02)
- [#29](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/29) ◻ Vinculação motorista ↔ veículo (RF02)

---

### Sprint 3 — Despesas e Manutenções
> [#2](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/2) · [#3](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/3) · [#30](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/30) · [#31](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/31) · [#32](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/32) · [#33](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/33)

**Backend:**
- [#2](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/2) ◻ API de despesas — CRUD + filtros por veículo e período (`/expenses`)
- [#3](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/3) ◻ API de manutenções — CRUD + atualização de status (`/maintenances`)

**Frontend:**
- [#30](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/30) ◻ Tela de listagem de despesas com filtros (RF03/RF04)
- [#31](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/31) ◻ Formulário de registro de despesas (RF03/RF04)
- [#32](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/32) ◻ Tela de listagem de manutenções (RF05)
- [#33](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/33) ◻ Formulário de manutenções preventivas e corretivas (RF05)

---

### Sprint 4 — Documentos e Alertas
> [#20](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/20) · [#5](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/5) · [#34](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/34) · [#35](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/35) · [#36](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/36) · [#37](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/37)

**Backend:**
- [#20](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/20) ◻ API de documentos obrigatórios — CRUD + campo `expiryDate` + flag `alertSent` (`/documents`)
- [#5](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/5) ◻ Job de alertas de vencimento com `node-cron` — varrer documentos próximos do vencimento e marcar `alertSent`

**Frontend:**
- [#34](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/34) ◻ Tela de listagem de documentos com status de vencimento (RF06)
- [#35](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/35) ◻ Formulário de cadastro de documentos (RF06)
- [#36](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/36) ◻ Central de alertas de vencimento (RF07)
- [#37](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/37) ◻ Notificações visuais de alertas no sidebar/header (RF07)

---

### Sprint 5 — Dashboard Real, Usuários e Testes
> [#6](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/6) · [#38](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/38) · [#39](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/39) · [#40](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/40)

**Backend:**
- [#6](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/6) ◻ Endpoints de indicadores financeiros — custo por veículo, evolução mensal de despesas (`/dashboard`)

**Frontend:**
- [#38](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/38) ◻ Tela de gerenciamento de usuários — somente ADMIN (RF10)
- ◻ Conectar Dashboard ao backend real — substituir mocks por dados reais, gráficos com Recharts *(novo)*

**Qualidade:**
- [#39](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/39) ◻ Testes unitários do backend — services e middlewares principais
- [#40](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/40) ◻ Validação do MVP com dados reais

---

### Sprint 6 — Deploy e Entrega Final
> [#41](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/41) · [#42](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/42) · [#43](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/43) · [#44](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/44)

- [#41](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/41) ◻ Deploy do frontend na Vercel
- [#42](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/42) ◻ Deploy do backend no AWS ECS (Docker)
- [#43](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/43) ◻ Configurar banco de dados na AWS RDS (migrar de Docker local para produção)
- [#44](https://github.com/gregoryjereissati/pfi-fleet-manager/issues/44) ◻ Entrega final e apresentação

---

## Fora do Escopo (conforme documento original)
- Rastreamento GPS em tempo real
- Telemetria avançada
- Planejamento e otimização de rotas
- Integração automática com DETRAN
- Aplicativo mobile nativo
