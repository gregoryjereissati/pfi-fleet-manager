# Fleet Manager — Guia do Projeto para Colaboradores

> **Este arquivo é o ponto de entrada para qualquer pessoa (humano ou agente de IA) que for trabalhar neste repositório.**
> Leia do início ao fim antes de tocar em qualquer código.

---

## O que é este projeto

**Fleet Manager** é um sistema web para gestão inteligente de frotas, desenvolvido como Projeto Final Integrador I (PFI) na Universidade de Fortaleza – UNIFOR, Ciência da Computação, 2026.

O sistema centraliza controle operacional, financeiro e documental de veículos: cadastro de veículos e motoristas, registro de despesas, controle de manutenções, alertas de vencimento de documentos e dashboard com indicadores financeiros.

**Repositório:** https://github.com/gregoryjereissati/pfi-fleet-manager  
**Orientador:** Prof. Me. Ronaldo Gonçalves Junior

---

## Decisões de Arquitetura (não discutir, já decidido)

Essas decisões foram tomadas e documentadas no spec. Não altere sem alinhar com o time.

| Camada | Tecnologia | Decisão |
|---|---|---|
| Frontend | React.js + TypeScript | Hospedado na Vercel |
| Backend | Node.js + Express + TypeScript | API REST, Layered Architecture |
| ORM | Prisma | Melhor type-safety com TypeScript + PostgreSQL |
| Banco de dados | PostgreSQL | Docker local em dev, AWS RDS em produção |
| Cache / Filas | Redis | Em memória no dev, migrar para prod no final |
| Autenticação | Auth0 + JWT (jose) | JWT validado via JWKS do Auth0 |
| Validação | Zod | Validação de body nas rotas e de env vars na startup |
| Controle de acesso | RBAC | Roles: ADMIN, MANAGER, OPERATOR |
| Containers | Docker + AWS ECS | Somente em produção |
| Monorepo | npm workspaces | Sem Turborepo/Nx — simples e suficiente |
| Framework HTTP | Express 4 | Mais documentado, ampla adoção acadêmica |
| Testes | Vitest | Rápido, TypeScript nativo |

### Estrutura do Monorepo

```
fleet-manager/
├── apps/
│   ├── api/        ← Backend Node.js + Express (Layered Architecture)
│   └── web/        ← Frontend React.js + Vite
├── packages/
│   └── shared/     ← Tipos TypeScript compartilhados (enums + DTOs)
├── docker-compose.yml
├── package.json    ← npm workspaces root
└── tsconfig.base.json
```

### Estrutura do Backend (Layered Architecture)

```
apps/api/src/
├── controllers/    ← recebe requisição HTTP, chama service, retorna resposta
├── services/       ← regras de negócio (sem dependência de HTTP)
├── repositories/   ← acesso ao banco de dados via Prisma
├── routes/         ← registra rotas e aplica middlewares
├── middlewares/    ← authenticate, authorize, validate, error-handler
├── config/         ← env.ts (Zod), database.ts (Prisma singleton)
├── types/          ← augmentações de tipos (ex: express.d.ts)
└── server.ts       ← entrypoint (só chama app.listen)
```

### Fluxo de Autenticação

```
1. Frontend faz login via Auth0 SDK
2. Auth0 retorna JWT (access token)
3. Frontend envia: Authorization: Bearer <token>
4. Backend valida JWT via JWKS do Auth0 (jose)
5. Middleware extrai auth0Id → busca User no banco
6. Middleware RBAC verifica role antes de liberar a rota
```

### Matriz de Acesso RBAC

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

## Modelo de Dados

Todas as entidades estão definidas em `apps/api/prisma/schema.prisma`. Resumo:

| Entidade | Campos principais |
|---|---|
| User | id, name, email, role (ADMIN/MANAGER/OPERATOR), auth0Id |
| Vehicle | id, plate, brand, model, year, color, status (ACTIVE/INACTIVE) |
| Driver | id, name, cpf, cnh, cnhExpiry, phone, status |
| Expense | id, vehicleId, type (FUEL/MAINTENANCE/FINE/IPVA/INSURANCE/OTHER), amount, date |
| Maintenance | id, vehicleId, type (PREVENTIVE/CORRECTIVE), status (SCHEDULED/DONE/OVERDUE), scheduledDate |
| Document | id, vehicleId?, driverId?, type, expiryDate, alertSent |

**Relações:**
- Vehicle 1:N Expense
- Vehicle 1:N Maintenance
- Vehicle 1:N Document
- Driver 1:N Document
- Vehicle N:M Driver (tabela implícita `_VehicleDrivers`)

---

## Documentação Completa

| Arquivo | Conteúdo |
|---|---|
| `docs/sprint-0-setup/design.md` | Spec de arquitetura e decisões do projeto |
| `docs/sprint-0-setup/plan.md` | Plano de implementação do Pré-Sprint (12 tasks detalhadas com código) |
| `docs/sprint-1-auth/design.md` + `plan.md` | Spec e plano da Sprint 1 (Auth0, i18n, Dashboard) |
| `docs/sprint-2-vehicles/design.md` + `plan.md` | Spec e plano da Sprint 2 (Veículos e Motoristas) |
| `docs/academico/` | Documentos acadêmicos da UNIFOR (.docx) |

**Leia o spec antes de qualquer coisa.** Ele contém todas as decisões tomadas e o motivo de cada uma.

---

## Como rodar o projeto localmente

### Pré-requisitos

- Node.js 20+
- Docker Desktop rodando
- Conta Auth0 com tenant configurado

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/api/.env
# Editar apps/api/.env com AUTH0_DOMAIN e AUTH0_AUDIENCE reais

# 3. Subir banco de dados
docker compose up -d

# 4. Rodar migrations e seed
cd apps/api && npx prisma migrate dev && npx prisma db seed

# 5. Iniciar servidor
npm run dev:api
```

### Testar

```bash
npm run test:api          # rodar testes da API
curl localhost:3000/health # verificar servidor
```

### Atenção: auth0Id do usuário

O seed cria um usuário admin com `auth0Id: 'auth0|seed-admin-000'` (placeholder). Para acessar a aplicação com um usuário real, é necessário atualizar o banco com o `user_id` real do Auth0:

```bash
cd apps/api && npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "User" SET "auth0Id" = '<SEU_AUTH0_USER_ID>' WHERE "email" = 'admin@fleet-manager.com';
EOF
```

O `user_id` real do Gregory é `auth0|69e018c5d9e051a46c3af7cc` (Auth0 Dashboard → User Management → Users).

---

## Estado Atual do Projeto

> **Última atualização:** 2026-04-17 (Sprint 4 — COMPLETA: documentos, alertas, cron job, badge no sidebar e sino no header)  
> **Atualizar esta seção a cada task concluída antes de fazer push.**

### ✅ Concluído

#### Pré-Sprint — COMPLETO
- [x] **Task 1: Inicializar Git e Monorepo Root** — commits `f26f755`, `dd581d6`
  - npm workspaces configurado (`apps/*`, `packages/*`)
  - `tsconfig.base.json` com `strict`, `esModuleInterop`, `moduleResolution: node`
  - ESLint v8 + `@typescript-eslint` v7 (v9 incompatível com `.eslintrc.js`)
  - `.gitattributes` com `eol=lf` para compatibilidade Windows/Linux
  - `apps/web/package.json` stub adicionado (frontend vem na Sprint 1)
  - `package-lock.json` commitado para installs reproduzíveis
- [x] **Task 2: packages/shared — Enums** — commit `50922a0`
- [x] **Task 3: packages/shared — DTOs** — commit `bb62fda`
- [x] **Task 4: Docker Compose + .env** — commit `b6146e9` ⚠️ Docker Desktop não instalado ainda
- [x] **Task 5: Prisma Schema** — commit `13369cd`
- [x] **Task 6: Prisma Seed** — commit `13369cd` ⚠️ Migration pendente — requer Docker Desktop
- [x] **Task 7: Express App, Config e Error Handler** — commit `fe22487`
- [x] **Task 8: Middleware de Autenticação Auth0/JWT (TDD)** — commit `89a63a6` — 4 testes
- [x] **Task 9: Middleware de Autorização RBAC (TDD)** — commit `cfe6f07` — 4 testes
- [x] **Task 10: Middleware de Validação Zod (TDD)** — commit `9dba69f` — 3 testes
- [x] **Task 11: Users Repository e Service (TDD)** — commit `3911c76` — 3 testes
- [x] **Task 12: Users Controller, Routes e Smoke Test** — commit `6003d1a` — 14 testes total

#### Pendências antes da Sprint 1 — COMPLETO
- [x] **Docker Desktop instalado e rodando** — `docker compose up -d` executado, container `fleet-manager-db` ativo
- [x] **Migration executada** — `prisma migrate dev --name init` — tabelas criadas no PostgreSQL
- [x] **Seed executado** — admin, veículo (Toyota Corolla ABC-1234) e motorista (João Silva) inseridos
- [x] **Auth0 configurado** — API "Fleet Manager API" criada no tenant `dev-ul8bdg6vfdrtwzgo.us.auth0.com`, audience `https://api.fleet-manager.com`, `.env` atualizado

### 🔄 Em Andamento

_Nenhum._

### 📋 Backlog por Sprint

#### Pré-Sprint — Setup
- [x] Task 1: Inicializar Git e Monorepo Root
- [x] Task 2: packages/shared — Enums
- [x] Task 3: packages/shared — DTOs
- [x] Task 4: Docker Compose + .env
- [x] Task 5: Prisma Schema
- [x] Task 6: Prisma Seed
- [x] Task 7: Express App, Config e Error Handler
- [x] Task 8: Middleware de Autenticação Auth0/JWT (TDD)
- [x] Task 9: Middleware de Autorização RBAC (TDD)
- [x] Task 10: Middleware de Validação Zod (TDD)
- [x] Task 11: Users Repository e Service (TDD)
- [x] Task 12: Users Controller, Routes e Smoke Test

#### Pendências antes da Sprint 1
- [x] Instalar Docker Desktop e rodar `docker compose up -d`
- [x] Executar `cd apps/api && npx prisma migrate dev --name init`
- [x] Executar `npx prisma db seed`
- [x] Preencher `AUTH0_DOMAIN` e `AUTH0_AUDIENCE` reais no `apps/api/.env`

#### Sprint 1 — Auth Frontend + Dashboard + i18n (issues: #21, #22, #23) — COMPLETA
- [x] [#21] Integrar Auth0 SDK ao frontend
- [x] [#22] Implementar i18n pt-BR / en-US
- [x] [#23] Implementar tela de Dashboard (dados mockados)
- [x] Fix: Auth0ProviderWithNavigate + onRedirectCallback + User Access autorizado no Auth0

#### Sprint 2 — Veículos e Motoristas (issues: #1, #24–#29) — COMPLETA E VALIDADA
- [x] [#1] API REST de veículos e motoristas (backend)
- [x] [#24] Tela de listagem de veículos com filtros
- [x] [#25] Formulário de cadastro e edição de veículos
- [x] [#26] Tela de detalhes do veículo
- [x] [#27] Tela de listagem de motoristas
- [x] [#28] Formulário de cadastro e edição de motoristas
- [x] [#29] Vinculação motorista ↔ veículo

#### Sprint 3 — Despesas e Manutenções (issues: #2, #3, #30–#33)
- [x] [#2] API de despesas (backend)
- [x] [#3] API de manutenções (backend)
- [x] [#30] Tela de listagem de despesas com filtros
- [x] [#31] Formulário de registro de despesas
- [x] [#32] Tela de listagem de manutenções
- [x] [#33] Formulário de manutenções preventivas e corretivas

#### Sprint 4 — Documentos e Alertas (issues: #20, #5, #34–#37) — COMPLETA
- [x] [#20] API de documentos obrigatórios (backend)
- [x] [#5] Job de alertas de vencimento com node-cron (backend)
- [x] [#34] Tela de listagem de documentos com status de vencimento
- [x] [#35] Formulário de cadastro de documentos
- [x] [#36] Central de alertas de vencimento
- [x] [#37] Notificações visuais de alertas no sidebar/header

#### Sprint 5 — Dashboard Real, Usuários e Testes (issues: #6, #38–#40)
- [ ] [#6] Endpoints de indicadores financeiros (backend)
- [ ] [#38] Tela de gerenciamento de usuários (ADMIN)
- [ ] Conectar Dashboard ao backend real (Recharts)
- [ ] [#39] Testes unitários do backend
- [ ] [#40] Validação do MVP com dados reais

#### Sprint 6 — Deploy e Entrega (issues: #41–#44)
- [ ] [#41] Deploy do frontend na Vercel
- [ ] [#42] Deploy do backend no AWS ECS
- [ ] [#43] Configurar AWS RDS (produção)
- [ ] [#44] Entrega final e apresentação

---

## Regras para Colaboradores

### Antes de começar a trabalhar

1. **Leia o spec:** `docs/sprint-0-setup/design.md` (arquitetura geral)
2. **Leia o spec e plano da sprint atual** em `docs/sprint-N-*/`
3. **Verifique o "Estado Atual"** acima — não faça o que já está feito
4. **Abra a issue correspondente** no GitHub antes de começar

### Ao concluir uma task

1. Rodar os testes: `npm run test:api`
2. Confirmar que o servidor sobe: `npm run dev:api`
3. **Atualizar este CLAUDE.md — IMEDIATAMENTE ao concluir cada sub-item:**
   - ✅ **Marcar o checkbox `[ ]` → `[x]` assim que a sub-task for concluída** (não esperar terminar tudo)
   - Mover a task da seção `📋 Backlog` para `✅ Concluído` quando todos os sub-itens estiverem feitos
   - Atualizar a data de "Última atualização"
   - Adicionar na seção de Histórico abaixo (data, quem fez, o que fez)
4. Fazer commit com mensagem no padrão: `feat(api): descrição da task`
5. Push para o repositório

> **REGRA INEGOCIÁVEL:** Cada checkbox deve ser marcado no momento em que aquela sub-task específica é concluída. Nunca acumular para marcar tudo de uma vez no final.

### Padrão de commits

```
feat(api): add vehicles CRUD endpoints
feat(web): add vehicle listing page
feat(shared): add vehicle DTOs
fix(api): handle missing auth header in authenticate middleware
chore: update dependencies
test(api): add integration tests for expenses
```

---

## Histórico de Implementação

> **Registro de tudo que foi feito, por quem e quando.**  
> Adicionar uma entrada a cada task concluída.

| Data | Responsável | Task | Notas |
|---|---|---|---|
| 2026-04-14 | Luiz Eduardo | Spec + Plano do Pré-Sprint | Spec em `docs/specs/`, plano em `docs/plans/` |
| 2026-04-14 | Claude | Task 1: Monorepo Root | ESLint v8 (não v9 — incompatível com .eslintrc.js). .gitattributes adicionado para LF. package-lock.json commitado. |
| 2026-04-14 | Claude | Task 2: packages/shared Enums | 6 enums: UserRole, VehicleStatus, DriverStatus, ExpenseType, MaintenanceType, MaintenanceStatus |
| 2026-04-14 | Claude | Task 3: packages/shared DTOs | Interfaces para User, Vehicle, Driver, Expense, Maintenance, Document (Create/Update/Response) |
| 2026-04-15 | Claude | Task 5: Prisma Schema | Schema completo com todas as entidades e enums. Migration pendente (requer Docker). |
| 2026-04-15 | Claude | Task 6: Prisma Seed | Seed com admin user, veículo e motorista de exemplo. |
| 2026-04-15 | Claude | Task 7: Express App + Config + Error Handler | env.ts (Zod), database.ts (Prisma singleton), express.d.ts, error-handler.ts, app.ts, server.ts, routes/index.ts |
| 2026-04-15 | Claude | Task 8: Middleware authenticate (TDD) | 4 testes. JWT Auth0 via jose + JWKS. |
| 2026-04-15 | Claude | Task 9: Middleware authorize (TDD) | 4 testes. RBAC com UserRole. |
| 2026-04-15 | Claude | Task 10: Middleware validate (TDD) | 3 testes. Validação de body com Zod + strip de campos extras. |
| 2026-04-15 | Claude | Task 11: User Repository + Service (TDD) | 3 testes. findAll, findById, updateRole com AppError 404. |
| 2026-04-15 | Claude | Task 12: User Controller + Routes | listUsers e updateRole. Rotas protegidas com authenticate + authorize(ADMIN). 14 testes passando. |
| 2026-04-15 | Gregory + Claude | Pendências pré-Sprint 1 | Docker Desktop instalado. Migration e seed executados. Auth0 API criada (audience: https://api.fleet-manager.com). .env atualizado com credenciais reais. |
| 2026-04-15 | Claude | Reorganização de docs | .docx e .tsv movidos para docs/academico/. docs/superpowers/ renomeada para docs/specs/ e docs/plans/. |
| 2026-04-15 | Claude | Sprint 1: Scaffold React + Vite + Tailwind + shadcn/ui | Estrutura completa do frontend — commit dc84aec |
| 2026-04-15 | Claude | Sprint 1: Auth0 SDK integrado | Landing page, ProtectedRoute, Auth0Provider. Aguarda Client ID do SPA no apps/web/.env |
| 2026-04-15 | Claude | Sprint 1: i18n pt-BR / en-US | react-i18next, toggle no header, persistência em localStorage |
| 2026-04-15 | Claude | Sprint 1: Dashboard mockado | 4 cards em src/mocks/dashboard.ts — substituíveis por API na Sprint 5 |
| 2026-04-15 | Gregory + Claude | Sprint 1: Fix Auth0 callback flow | BrowserRouter movido para main.tsx. Auth0ProviderWithNavigate com onRedirectCallback usando useNavigate. ProtectedRoute expõe erro do Auth0. User Access autorizado no Auth0 (Application Access → Fleet Manager Web). Sprint 1 funcionando end-to-end. |
| 2026-04-16 | Codex | Sprint 2: Vehicles and Drivers | Backend REST de vehicles/drivers com vinculação, 25 novos testes de service (39 passando no total), helper de API e telas React de listagem, formulário, detalhe e vínculo. `tsc --noEmit` da API e web passou. `npm run build` do frontend passou. |
| 2026-04-17 | Gregory + Claude | Fix: useToken loop infinito | `useToken` retornava nova função a cada render, causando loop infinito nos hooks. Corrigido com `useCallback` em `apps/web/src/hooks/useToken.ts`. |
| 2026-04-17 | Gregory + Claude | Fix: auth0Id do usuário real | Seed criava usuário com `auth0Id: 'auth0|seed-admin-000'`. Atualizado para o auth0Id real do Gregory (`auth0|69e018c5d9e051a46c3af7cc`) via `prisma db execute`. Sprint 2 validada end-to-end: veículos e motoristas funcionando no browser. |
| 2026-04-17 | Codex | Sprint 3: API de despesas | `expense.repository`, `expense.service` (TDD com 9 testes), controller e rotas `/expenses` com filtros por veículo/período e RBAC para CRUD. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: API de manutenções | `maintenance.repository`, `maintenance.service` (TDD com 10 testes), controller e rotas `/maintenances` com filtros e normalização de `completedDate` ao mudar status. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: Frontend despesas e manutenções | `ExpenseList`, `ExpenseForm`, `MaintenanceList`, `MaintenanceForm` + hooks `useExpenses`/`useMaintenances`. Rotas `/expenses` e `/maintenances` registradas no App.tsx e links no Sidebar. i18n pt-BR/en-US atualizado. `tsc --noEmit` do frontend passou. |
| 2026-04-17 | Codex | Sprint 4: API de documentos | `document.repository` com status computado, `document.service` (TDD com 15 testes), controller e rotas `/documents` + `/documents/alerts/count`. Migration `DocumentType` aplicada e Prisma Client regenerado. |
| 2026-04-17 | Codex | Sprint 4: Cron job de alertas | `alertCron.ts` registrado na API, execução diária via `node-cron` e marcação idempotente de `alertSent=true` para documentos vencidos ou vencendo em 30 dias. |
| 2026-04-17 | Codex | Sprint 4: Frontend documentos e alertas | `DocumentList`, `DocumentForm`, `AlertCenter`, hooks `useDocuments`/`useAlertCount`, rotas `/documents` e `/alerts`, badge no Sidebar, sino no Header e i18n pt-BR/en-US atualizado. `tsc --noEmit` e `npm run build` do frontend passaram. |

---

## Fora do Escopo (não implementar)

- Rastreamento GPS em tempo real
- Telemetria avançada
- Planejamento e otimização de rotas
- Integração automática com DETRAN
- Aplicativo mobile nativo
