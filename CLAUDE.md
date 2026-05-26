# Fleet Manager â€” Guia do Projeto para Colaboradores

> **Este arquivo Ã© o ponto de entrada para qualquer pessoa (humano ou agente de IA) que for trabalhar neste repositÃ³rio.**
> Leia do inÃ­cio ao fim antes de tocar em qualquer cÃ³digo.

---

## O que Ã© este projeto

**Fleet Manager** Ã© um sistema web para gestÃ£o inteligente de frotas, desenvolvido como Projeto Final Integrador I (PFI) na Universidade de Fortaleza â€“ UNIFOR, CiÃªncia da ComputaÃ§Ã£o, 2026.

O sistema centraliza controle operacional, financeiro e documental de veÃ­culos: cadastro de veÃ­culos e motoristas, registro de despesas, controle de manutenÃ§Ãµes, alertas de vencimento de documentos e dashboard com indicadores financeiros.

**RepositÃ³rio:** https://github.com/gregoryjereissati/pfi-fleet-manager  
**Orientador:** Prof. Me. Ronaldo GonÃ§alves Junior

---

## DecisÃµes de Arquitetura (nÃ£o discutir, jÃ¡ decidido)

Essas decisÃµes foram tomadas e documentadas no spec. NÃ£o altere sem alinhar com o time.

| Camada | Tecnologia | DecisÃ£o |
|---|---|---|
| Frontend | React.js + TypeScript | Hospedado na Vercel |
| Backend | Node.js + Express + TypeScript | API REST, Layered Architecture |
| ORM | Prisma | Melhor type-safety com TypeScript + PostgreSQL |
| Banco de dados | PostgreSQL (Supabase) | Banco gerenciado no Supabase, acessado via Prisma |
| Cache / Filas | Redis | Em memÃ³ria no dev, migrar para prod no final |
| AutenticaÃ§Ã£o | JWT prÃ³prio + e-mail/senha | Hash com `bcryptjs`, token assinado e validado com `jose` + `JWT_SECRET` |
| ValidaÃ§Ã£o | Zod | ValidaÃ§Ã£o de body nas rotas e de env vars na startup |
| Controle de acesso | RBAC | Roles: ADMIN, MANAGER, OPERATOR |
| Deploy Backend | Railway | Deploy do backend Node.js via GitHub — suporta processo persistente e cron jobs; free tier suficiente para apresentação |
| Monorepo | npm workspaces | Sem Turborepo/Nx â€” simples e suficiente |
| Framework HTTP | Express 4 | Mais documentado, ampla adoÃ§Ã£o acadÃªmica |
| Testes | Vitest | RÃ¡pido, TypeScript nativo |

### Estrutura do Monorepo

```
fleet-manager/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ api/        â† Backend Node.js + Express (Layered Architecture)
â”‚   â””â”€â”€ web/        â† Frontend React.js + Vite
â”œâ”€â”€ packages/
â”‚   â””â”€â”€ shared/     â† Tipos TypeScript compartilhados (enums + DTOs)
â”œâ”€â”€ package.json    â† npm workspaces root
â””â”€â”€ tsconfig.base.json
```

### Estrutura do Backend (Layered Architecture)

```
apps/api/src/
â”œâ”€â”€ controllers/    â† recebe requisiÃ§Ã£o HTTP, chama service, retorna resposta
â”œâ”€â”€ services/       â† regras de negÃ³cio (sem dependÃªncia de HTTP)
â”œâ”€â”€ repositories/   â† acesso ao banco de dados via Prisma
â”œâ”€â”€ routes/         â† registra rotas e aplica middlewares
â”œâ”€â”€ middlewares/    â† authenticate, authorize, validate, error-handler
â”œâ”€â”€ config/         â† env.ts (Zod), database.ts (Prisma singleton)
â”œâ”€â”€ types/          â† augmentaÃ§Ãµes de tipos (ex: express.d.ts)
â””â”€â”€ server.ts       â† entrypoint (sÃ³ chama app.listen)
```

### Fluxo de AutenticaÃ§Ã£o

```
1. Frontend envia e-mail e senha para POST /auth/login
2. Backend valida a senha com bcrypt e assina um JWT prÃ³prio
3. Frontend salva o token e envia: Authorization: Bearer <token>
4. Backend valida o JWT com JWT_SECRET local
5. Middleware extrai userId do token e busca User no banco
6. Middleware RBAC verifica role antes de liberar a rota
```

### Matriz de Acesso RBAC

| Recurso              | ADMIN | MANAGER | OPERATOR |
|----------------------|-------|---------|----------|
| Gerenciar usuÃ¡rios   | âœ…    | âŒ      | âŒ       |
| Cadastrar veÃ­culos   | âœ…    | âœ…      | âŒ       |
| Cadastrar motoristas | âœ…    | âœ…      | âŒ       |
| Registrar despesas   | âœ…    | âœ…      | âœ…       |
| Registrar manutenÃ§Ãµes| âœ…    | âœ…      | âœ…       |
| Ver dashboard        | âœ…    | âœ…      | âœ…       |
| Excluir registros    | âœ…    | âœ…      | âŒ       |

---

## Modelo de Dados

Todas as entidades estÃ£o definidas em `apps/api/prisma/schema.prisma`. Resumo:

| Entidade | Campos principais |
|---|---|
| User | id, name, email, cpf, phone, passwordHash, role (ADMIN/MANAGER/OPERATOR), status |
| Vehicle | id, plate, brand, model, year, color, status (ACTIVE/INACTIVE) |
| Driver | id, name, cpf, cnh, cnhExpiry, phone, status |
| Expense | id, vehicleId, type (FUEL/MAINTENANCE/FINE/IPVA/INSURANCE/OTHER), amount, date |
| Maintenance | id, vehicleId, type (PREVENTIVE/CORRECTIVE), status (SCHEDULED/DONE/OVERDUE), scheduledDate |
| Document | id, vehicleId?, driverId?, type, expiryDate, alertSent |

**RelaÃ§Ãµes:**
- Vehicle 1:N Expense
- Vehicle 1:N Maintenance
- Vehicle 1:N Document
- Driver 1:N Document
- Vehicle N:M Driver (tabela implÃ­cita `_VehicleDrivers`)

---

## DocumentaÃ§Ã£o Completa

| Arquivo | ConteÃºdo |
|---|---|
| `docs/sprint-0-setup/design.md` | ReferÃªncia atualizada de setup e arquitetura base |
| `docs/sprint-0-setup/plan.md` | ReferÃªncia atualizada de setup do backend e ambiente |
| `docs/sprint-1-auth/design.md` + `plan.md` | ReferÃªncia atualizada de acesso do frontend, i18n e dashboard |
| `docs/sprint-2-vehicles/design.md` + `plan.md` | Spec e plano da Sprint 2 (histÃ³rico funcional) |
| `docs/superpowers/specs/2026-05-05-custom-auth-supabase-design.md` | Documento de referÃªncia da arquitetura atual de autenticaÃ§Ã£o e banco |
| `docs/superpowers/plans/2026-05-06-custom-auth-supabase.md` | Registro consolidado da implementaÃ§Ã£o da arquitetura atual |
| `docs/academico/` | Documentos acadÃªmicos da UNIFOR (.docx) |

**Leia o spec antes de qualquer coisa.** Ele contÃ©m todas as decisÃµes tomadas e o motivo de cada uma.

---

## Como rodar o projeto localmente

### PrÃ©-requisitos

- Node.js 20+
- Projeto Supabase com connection string PostgreSQL disponÃ­vel

### Setup

```bash
# 1. Instalar dependÃªncias
npm install

# 2. Configurar variÃ¡veis de ambiente
# Criar/editar apps/api/.env com DATABASE_URL, DIRECT_URL e JWT_SECRET

# 3. Rodar migrations e seed no banco do Supabase
cd apps/api && npx prisma migrate dev && npx prisma db seed

# 4. Iniciar servidor da API
npm run dev:api

# 5. Iniciar frontend
npm run dev:web
```

### Testar

```bash
npm run test:api          # rodar testes da API
curl localhost:3000/health # verificar servidor
```

### AtenÃ§Ã£o: usuÃ¡rio admin do seed

O seed cria um usuÃ¡rio admin com:

- e-mail: `admin@fleet-manager.com`
- senha inicial: `admin123`
- status: `ACTIVE`

ObservaÃ§Ã£o: o `upsert` do seed usa `update: {}`. Isso significa que rodar o seed novamente nÃ£o altera a senha de um admin jÃ¡ existente.

---

## Estado Atual do Projeto

> **Última atualização:** 2026-05-26 (upload de arquivos nos documentos, filtro de tipos por entidade, DriverDetail, seção de documentos em VehicleDetail e DriverDetail)
> **Atualizar esta seÃ§Ã£o a cada task concluÃ­da antes de fazer push.**

> ReferÃªncias antigas Ã  arquitetura anterior podem aparecer em seÃ§Ãµes histÃ³ricas de sprints jÃ¡ concluÃ­das. O estado atual do projeto Ã© o descrito nas seÃ§Ãµes de arquitetura, setup e fluxo acima.

### âœ… ConcluÃ­do

> Os blocos abaixo preservam o histÃ³rico de execuÃ§Ã£o das sprints. Alguns nomes de tasks continuam refletindo a arquitetura vigente na Ã©poca em que foram entregues.

#### PrÃ©-Sprint â€” COMPLETO
- [x] **Task 1: Inicializar Git e Monorepo Root** â€” commits `f26f755`, `dd581d6`
  - npm workspaces configurado (`apps/*`, `packages/*`)
  - `tsconfig.base.json` com `strict`, `esModuleInterop`, `moduleResolution: node`
  - ESLint v8 + `@typescript-eslint` v7 (v9 incompatÃ­vel com `.eslintrc.js`)
  - `.gitattributes` com `eol=lf` para compatibilidade Windows/Linux
  - `apps/web/package.json` stub adicionado (frontend vem na Sprint 1)
  - `package-lock.json` commitado para installs reproduzÃ­veis
- [x] **Task 2: packages/shared â€” Enums** â€” commit `50922a0`
- [x] **Task 3: packages/shared â€” DTOs** â€” commit `bb62fda`
- [x] **Task 4: Ambiente local + .env** â€” commit `b6146e9`
- [x] **Task 5: Prisma Schema** â€” commit `13369cd`
- [x] **Task 6: Prisma Seed** â€” commit `13369cd`
- [x] **Task 7: Express App, Config e Error Handler** â€” commit `fe22487`
- [x] **Task 8: Middleware de AutenticaÃ§Ã£o JWT (TDD)** â€” commit `89a63a6` â€” 4 testes
- [x] **Task 9: Middleware de AutorizaÃ§Ã£o RBAC (TDD)** â€” commit `cfe6f07` â€” 4 testes
- [x] **Task 10: Middleware de ValidaÃ§Ã£o Zod (TDD)** â€” commit `9dba69f` â€” 3 testes
- [x] **Task 11: Users Repository e Service (TDD)** â€” commit `3911c76` â€” 3 testes
- [x] **Task 12: Users Controller, Routes e Smoke Test** â€” commit `6003d1a` â€” 14 testes total

#### PendÃªncias antes da Sprint 1 â€” COMPLETO
- [x] **Ambiente local validado**
- [x] **Migration executada** â€” `prisma migrate dev --name init` â€” tabelas criadas no PostgreSQL
- [x] **Seed executado** â€” admin, veÃ­culo (Toyota Corolla ABC-1234) e motorista (JoÃ£o Silva) inseridos
- [x] **AutenticaÃ§Ã£o inicial configurada**

#### PÃ³s-Sprint 5 â€” AutenticaÃ§Ã£o prÃ³pria + Supabase â€” COMPLETO
- [x] **Consolidar autenticaÃ§Ã£o prÃ³pria no frontend e backend**
- [x] **Implementar autenticaÃ§Ã£o prÃ³pria com e-mail/senha + JWT**
- [x] **Migrar PostgreSQL para o Supabase**
- [x] **Limpar documentaÃ§Ã£o legada da arquitetura anterior**

#### Ajustes pos-MVP - COMPLETO
- [x] **Hotfix: exclusao permanente, reativacao de veiculos e normalizacao uppercase**
  - Endpoint `DELETE /vehicles/:id/permanent` com hard delete via Prisma e cascade existente
  - Listagem exibe acoes separadas para desativar, reativar e excluir permanentemente
  - Confirmacoes da listagem de veiculos usam modal proprio da aplicacao
  - Formulario de veiculos normaliza placa, marca, modelo e cor para maiusculas
- [x] **Feature: upload de arquivo + melhorias no módulo de documentos**
  - Campo `fileUrl` adicionado ao model `Document` (migration aplicada)
  - Upload direto para Supabase Storage via `@supabase/supabase-js`
  - `DocumentForm` filtra tipos por entidade (veículo vs motorista) e aceita upload de imagem/PDF
  - `DocumentList` exibe botão "Ver arquivo" com `FilePreviewModal`
  - `VehicleDetail` ganhou seção de documentos com preview
  - `DriverDetail` criado com seções de veículos vinculados e documentos
  - `DriverList` ganhou link "Ver detalhes"

### ðŸ”„ Em Andamento

_Nenhum._

### ðŸ“‹ Backlog por Sprint

#### PrÃ©-Sprint â€” Setup
- [x] Task 1: Inicializar Git e Monorepo Root
- [x] Task 2: packages/shared â€” Enums
- [x] Task 3: packages/shared â€” DTOs
- [x] Task 4: Ambiente local + .env
- [x] Task 5: Prisma Schema
- [x] Task 6: Prisma Seed
- [x] Task 7: Express App, Config e Error Handler
- [x] Task 8: Middleware de AutenticaÃ§Ã£o JWT (TDD)
- [x] Task 9: Middleware de AutorizaÃ§Ã£o RBAC (TDD)
- [x] Task 10: Middleware de ValidaÃ§Ã£o Zod (TDD)
- [x] Task 11: Users Repository e Service (TDD)
- [x] Task 12: Users Controller, Routes e Smoke Test

#### PendÃªncias antes da Sprint 1
- [x] Validar ambiente local
- [x] Executar `cd apps/api && npx prisma migrate dev --name init`
- [x] Executar `npx prisma db seed`
- [x] Configurar variÃ¡veis do backend

#### Sprint 1 â€” Acesso Frontend + Dashboard + i18n (issues: #21, #22, #23) â€” COMPLETA
- [x] [#21] Integrar autenticaÃ§Ã£o do frontend
- [x] [#22] Implementar i18n pt-BR / en-US
- [x] [#23] Implementar tela de Dashboard (dados mockados)
- [x] Fix: fluxo de redirecionamento e acesso do frontend

#### Sprint 2 â€” VeÃ­culos e Motoristas (issues: #1, #24â€“#29) â€” COMPLETA E VALIDADA
- [x] [#1] API REST de veÃ­culos e motoristas (backend)
- [x] [#24] Tela de listagem de veÃ­culos com filtros
- [x] [#25] FormulÃ¡rio de cadastro e ediÃ§Ã£o de veÃ­culos
- [x] [#26] Tela de detalhes do veÃ­culo
- [x] [#27] Tela de listagem de motoristas
- [x] [#28] FormulÃ¡rio de cadastro e ediÃ§Ã£o de motoristas
- [x] [#29] VinculaÃ§Ã£o motorista â†” veÃ­culo

#### Sprint 3 â€” Despesas e ManutenÃ§Ãµes (issues: #2, #3, #30â€“#33)
- [x] [#2] API de despesas (backend)
- [x] [#3] API de manutenÃ§Ãµes (backend)
- [x] [#30] Tela de listagem de despesas com filtros
- [x] [#31] FormulÃ¡rio de registro de despesas
- [x] [#32] Tela de listagem de manutenÃ§Ãµes
- [x] [#33] FormulÃ¡rio de manutenÃ§Ãµes preventivas e corretivas

#### Sprint 4 â€” Documentos e Alertas (issues: #20, #5, #34â€“#37) â€” COMPLETA
- [x] [#20] API de documentos obrigatÃ³rios (backend)
- [x] [#5] Job de alertas de vencimento com node-cron (backend)
- [x] [#34] Tela de listagem de documentos com status de vencimento
- [x] [#35] FormulÃ¡rio de cadastro de documentos
- [x] [#36] Central de alertas de vencimento
- [x] [#37] NotificaÃ§Ãµes visuais de alertas no sidebar/header

#### Sprint 5 â€” Dashboard Real, UsuÃ¡rios e Testes (issues: #6, #38â€“#40) â€” COMPLETA
- [x] [#6] Endpoints de indicadores financeiros (backend)
- [x] [#38] Tela de gerenciamento de usuÃ¡rios (ADMIN)
- [x] Conectar Dashboard ao backend real (Recharts)
- [x] [#39] Testes unitÃ¡rios do backend
- [x] [#40] ValidaÃ§Ã£o do MVP com dados reais

#### Sprint 6 â€” Deploy e Entrega (issues: #41â€“#44)
- [ ] [#41] Deploy do frontend na Vercel
- [ ] [#42] Deploy do backend no Railway
- [ ] [#43] Configurar PostgreSQL do Supabase para produÃ§Ã£o
- [ ] [#44] Entrega final e apresentaÃ§Ã£o

---

## Regras para Colaboradores

### Acentuação obrigatória em português (REGRA INEGOCIÁVEL)

**Todo texto em português no projeto DEVE usar acentuação correta.** Isso vale para Claude, Codex e qualquer colaborador.

Aplica-se a: arquivos de i18n (pt-BR.json), mensagens de UI, labels, placeholders, erros, confirmações, comentários e documentação.

Exemplos corretos:
- Veículos (não Veiculos)
- Manutenções (não Manutencoes)
- Usuários (não Usuarios)
- não, ação, gestão, está, já, veículo, período, descrição, conclusão, Combustível

Ao criar qualquer texto novo em português, acentue sempre. Nunca omita acento por conveniência.

### Antes de comeÃ§ar a trabalhar

1. **Leia o spec:** `docs/sprint-0-setup/design.md` (arquitetura geral)
2. **Leia o spec e plano da sprint atual** em `docs/sprint-N-*/`
3. **Verifique o "Estado Atual"** acima â€” nÃ£o faÃ§a o que jÃ¡ estÃ¡ feito
4. **Abra a issue correspondente** no GitHub antes de comeÃ§ar

### Ao concluir uma task

1. Rodar os testes: `npm run test:api`
2. Confirmar que o servidor sobe: `npm run dev:api`
3. **Atualizar este CLAUDE.md â€” IMEDIATAMENTE ao concluir cada sub-item:**
   - âœ… **Marcar o checkbox `[ ]` â†’ `[x]` assim que a sub-task for concluÃ­da** (nÃ£o esperar terminar tudo)
   - Mover a task da seÃ§Ã£o `ðŸ“‹ Backlog` para `âœ… ConcluÃ­do` quando todos os sub-itens estiverem feitos
   - Atualizar a data de "Ãšltima atualizaÃ§Ã£o"
   - Adicionar na seÃ§Ã£o de HistÃ³rico abaixo (data, quem fez, o que fez)
4. Fazer commit com mensagem no padrÃ£o: `feat(api): descriÃ§Ã£o da task`
5. Push para o repositÃ³rio

> **REGRA INEGOCIÃVEL:** Cada checkbox deve ser marcado no momento em que aquela sub-task especÃ­fica Ã© concluÃ­da. Nunca acumular para marcar tudo de uma vez no final.

### PadrÃ£o de commits

```
feat(api): add vehicles CRUD endpoints
feat(web): add vehicle listing page
feat(shared): add vehicle DTOs
fix(api): handle missing auth header in authenticate middleware
chore: update dependencies
test(api): add integration tests for expenses
```

---

## HistÃ³rico de ImplementaÃ§Ã£o

> **Registro de tudo que foi feito, por quem e quando.**  
> Adicionar uma entrada a cada task concluÃ­da.
> As entradas abaixo preservam o contexto histÃ³rico de implementaÃ§Ã£o e foram normalizadas para a arquitetura atual do projeto.

| Data | ResponsÃ¡vel | Task | Notas |
|---|---|---|---|
| 2026-04-14 | Luiz Eduardo | Spec + Plano do PrÃ©-Sprint | Spec em `docs/specs/`, plano em `docs/plans/` |
| 2026-04-14 | Claude | Task 1: Monorepo Root | ESLint v8 (nÃ£o v9 â€” incompatÃ­vel com .eslintrc.js). .gitattributes adicionado para LF. package-lock.json commitado. |
| 2026-04-14 | Claude | Task 2: packages/shared Enums | 6 enums: UserRole, VehicleStatus, DriverStatus, ExpenseType, MaintenanceType, MaintenanceStatus |
| 2026-04-14 | Claude | Task 3: packages/shared DTOs | Interfaces para User, Vehicle, Driver, Expense, Maintenance, Document (Create/Update/Response) |
| 2026-04-15 | Claude | Task 5: Prisma Schema | Schema completo com todas as entidades e enums. |
| 2026-04-15 | Claude | Task 6: Prisma Seed | Seed com admin user, veÃ­culo e motorista de exemplo. |
| 2026-04-15 | Claude | Task 7: Express App + Config + Error Handler | env.ts (Zod), database.ts (Prisma singleton), express.d.ts, error-handler.ts, app.ts, server.ts, routes/index.ts |
| 2026-04-15 | Claude | Task 8: Middleware authenticate (TDD) | 4 testes de autenticaÃ§Ã£o JWT. |
| 2026-04-15 | Claude | Task 9: Middleware authorize (TDD) | 4 testes. RBAC com UserRole. |
| 2026-04-15 | Claude | Task 10: Middleware validate (TDD) | 3 testes. ValidaÃ§Ã£o de body com Zod + strip de campos extras. |
| 2026-04-15 | Claude | Task 11: User Repository + Service (TDD) | 3 testes. findAll, findById, updateRole com AppError 404. |
| 2026-04-15 | Claude | Task 12: User Controller + Routes | listUsers e updateRole. Rotas protegidas com authenticate + authorize(ADMIN). 14 testes passando. |
| 2026-04-15 | Gregory + Claude | PendÃªncias prÃ©-Sprint 1 | Ambiente validado. Migration e seed executados. VariÃ¡veis do backend atualizadas. |
| 2026-04-15 | Claude | ReorganizaÃ§Ã£o de docs | .docx e .tsv movidos para docs/academico/. docs/superpowers/ renomeada para docs/specs/ e docs/plans/. |
| 2026-04-15 | Claude | Sprint 1: Scaffold React + Vite + Tailwind + shadcn/ui | Estrutura completa do frontend â€” commit dc84aec |
| 2026-04-15 | Claude | Sprint 1: autenticaÃ§Ã£o do frontend integrada | Landing page, ProtectedRoute e fluxo inicial de acesso. |
| 2026-04-15 | Claude | Sprint 1: i18n pt-BR / en-US | react-i18next, toggle no header, persistÃªncia em localStorage |
| 2026-04-15 | Claude | Sprint 1: Dashboard mockado | 4 cards em src/mocks/dashboard.ts â€” substituÃ­veis por API na Sprint 5 |
| 2026-04-15 | Gregory + Claude | Sprint 1: fix do fluxo de acesso | Ajustes de roteamento e fluxo de autenticaÃ§Ã£o do frontend. Sprint 1 funcionando end-to-end. |
| 2026-04-16 | Codex | Sprint 2: Vehicles and Drivers | Backend REST de vehicles/drivers com vinculaÃ§Ã£o, 25 novos testes de service (39 passando no total), helper de API e telas React de listagem, formulÃ¡rio, detalhe e vÃ­nculo. `tsc --noEmit` da API e web passou. `npm run build` do frontend passou. |
| 2026-04-17 | Gregory + Claude | Fix: useToken loop infinito | `useToken` retornava nova funÃ§Ã£o a cada render, causando loop infinito nos hooks. Corrigido com `useCallback` em `apps/web/src/hooks/useToken.ts`. |
| 2026-04-17 | Gregory + Claude | Fix: usuÃ¡rio administrativo validado | Ajuste do usuÃ¡rio administrativo no banco. Sprint 2 validada end-to-end: veÃ­culos e motoristas funcionando no browser. |
| 2026-04-17 | Codex | Sprint 3: API de despesas | `expense.repository`, `expense.service` (TDD com 9 testes), controller e rotas `/expenses` com filtros por veÃ­culo/perÃ­odo e RBAC para CRUD. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: API de manutenÃ§Ãµes | `maintenance.repository`, `maintenance.service` (TDD com 10 testes), controller e rotas `/maintenances` com filtros e normalizaÃ§Ã£o de `completedDate` ao mudar status. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: Frontend despesas e manutenÃ§Ãµes | `ExpenseList`, `ExpenseForm`, `MaintenanceList`, `MaintenanceForm` + hooks `useExpenses`/`useMaintenances`. Rotas `/expenses` e `/maintenances` registradas no App.tsx e links no Sidebar. i18n pt-BR/en-US atualizado. `tsc --noEmit` do frontend passou. |
| 2026-04-17 | Codex | Sprint 4: API de documentos | `document.repository` com status computado, `document.service` (TDD com 15 testes), controller e rotas `/documents` + `/documents/alerts/count`. Migration `DocumentType` aplicada e Prisma Client regenerado. |
| 2026-04-17 | Codex | Sprint 4: Cron job de alertas | `alertCron.ts` registrado na API, execuÃ§Ã£o diÃ¡ria via `node-cron` e marcaÃ§Ã£o idempotente de `alertSent=true` para documentos vencidos ou vencendo em 30 dias. |
| 2026-04-17 | Codex | Sprint 4: Frontend documentos e alertas | `DocumentList`, `DocumentForm`, `AlertCenter`, hooks `useDocuments`/`useAlertCount`, rotas `/documents` e `/alerts`, badge no Sidebar, sino no Header e i18n pt-BR/en-US atualizado. `tsc --noEmit` e `npm run build` do frontend passaram. |
| 2026-04-23 | Codex | Sprint 5: API de indicadores | `dashboard.repository`, `dashboard.service` (TDD com 2 testes), controller e rota protegida `GET /dashboard/indicators`. `npx tsc --noEmit` e `npm run test:api` passaram. |
| 2026-04-23 | Codex | Sprint 5: Gerenciamento de usuÃ¡rios | `useUsers`, pÃ¡gina `UserList`, rota `/users`, link no Sidebar habilitado para ADMIN e i18n pt-BR/en-US atualizado. |
| 2026-04-23 | Codex | Sprint 5: Dashboard real com Recharts | `useDashboard`, cards reais, `BarChart` por mÃªs e `PieChart` por tipo em `Dashboard.tsx`. `apps/web` passou em `npx tsc --noEmit` e `npm run build`. |
| 2026-04-23 | Gregory | Sprint 5: ValidaÃ§Ã£o do MVP com dados reais | Dashboard validado manualmente no browser apÃ³s a implementaÃ§Ã£o da sprint 5, com indicadores e grÃ¡ficos funcionando corretamente. |
| 2026-04-23 | Codex | Hotfix: auto-cadastro no authenticate | Novos usuÃ¡rios autenticados passam a ser criados automaticamente com role `OPERATOR` no primeiro acesso, liberando dashboard, despesas e manutenÃ§Ãµes. `authenticate.test.ts`, `npm run test:api` e `npx tsc --noEmit` da API passaram. |
| 2026-04-23 | Codex | Hotfix: frontend usa role real do banco | `GET /users/me` adicionado na API e novo `useCurrentUser` no frontend para que Sidebar e aÃ§Ãµes da UI usem o role persistido no banco, corrigindo o acesso de admins Ã  gestÃ£o de usuÃ¡rios. `npm run test:api`, `apps/api npx tsc --noEmit`, `apps/web npx tsc --noEmit` e `apps/web npm run build` passaram. |
| 2026-05-06 | Gregory | ConsolidaÃ§Ã£o da arquitetura atual | Login passa a usar e-mail/senha com JWT prÃ³prio. Banco PostgreSQL migrado para o Supabase. |
| 2026-05-06 | Codex | Limpeza de documentaÃ§Ã£o base | `CLAUDE.md` e `AGENTS.md` alinhados ao estado atual do projeto, removendo instruÃ§Ãµes desatualizadas da arquitetura anterior. |
| 2026-05-06 | Codex | Limpeza ampla da documentaÃ§Ã£o | `README.md`, exemplos de ambiente e documentos de sprint foram normalizados para a arquitetura atual, sem referÃªncias Ã  stack anterior. |
| 2026-05-14 | Codex | Hotfix: veiculos delete permanente + reativacao + modal + uppercase | `DELETE /vehicles/:id/permanent` adicionado com cascade Prisma, listagem de veiculos ganhou acoes de exclusao permanente e reativacao via `PUT /vehicles/:id`, confirmacoes passaram para `ConfirmDialog` proprio e formulario passou a normalizar placa, marca, modelo e cor para maiusculas. `apps/api` passou em `npx tsc --noEmit` e `npm run test`; `apps/web` passou em `npx tsc --noEmit` e `npm run build`. |
| 2026-05-26 | Codex | Feature: upload de arquivo e melhorias em documentos | `fileUrl` no schema, Supabase Storage client-side, `FilePreviewModal`, `DocumentForm` com filtro de tipos, `VehicleDetail` e `DriverDetail` com seção de documentos. |

---

## Fora do Escopo (nÃ£o implementar)

- Rastreamento GPS em tempo real
- Telemetria avanÃ§ada
- Planejamento e otimizaÃ§Ã£o de rotas
- IntegraÃ§Ã£o automÃ¡tica com DETRAN
- Aplicativo mobile nativo
