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
| Banco de dados | PostgreSQL (Supabase) | Banco gerenciado no Supabase, acessado via Prisma |
| Autenticação | Supabase Auth (e-mail/senha) | Credenciais no Supabase; a API verifica o token ES256 pelo JWKS do projeto, sem segredo compartilhado. Papel e situação seguem na tabela `User` |
| Validação | Zod | Validação de body nas rotas e de env vars na startup |
| Controle de acesso | RBAC | Roles: ADMIN, MANAGER, OPERATOR |
| Deploy | Vercel (projeto único) | Frontend estático e API serverless no mesmo domínio: elimina CORS e mantém uma única URL, no plano gratuito. O Railway foi descartado por não ter mais plano gratuito permanente. Publicado em https://pfi-fleet-manager-api.vercel.app |
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
1. Frontend autentica no Supabase Auth (supabase.auth.signInWithPassword)
2. Supabase devolve access_token (JWT ES256) e renova a sessão automaticamente
3. Frontend envia: Authorization: Bearer <access_token>
4. Backend verifica assinatura, emissor e público usando o JWKS do projeto
5. Middleware busca o User pelo authUserId e rejeita PENDING/BLOCKED
6. Middleware RBAC verifica role antes de liberar a rota

Cadastro (duas etapas):
1. Frontend cria a conta no Supabase Auth (signUp)
2. Com o token, chama POST /auth/register enviando os dados cadastrais
3. A API cria o perfil com status PENDING vinculado ao authUserId
4. Se ja existir perfil com o mesmo e-mail e sem conta vinculada, ela vincula
   o perfil existente, preservando role e status
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
| User | id, name, email, cpf, phone, authUserId (Supabase Auth), role (ADMIN/MANAGER/OPERATOR), status (PENDING/ACTIVE/BLOCKED), endereço completo |
| Vehicle | id, plate, brand, model, year, color, status (ACTIVE/INACTIVE) |
| Driver | id, name, cpf, cnh, cnhExpiry, phone, status |
| Expense | id, vehicleId, type (FUEL/MAINTENANCE/FINE/IPVA/INSURANCE/OTHER), amount, date |
| Maintenance | id, vehicleId, type (PREVENTIVE/CORRECTIVE), status (SCHEDULED/DONE/OVERDUE), scheduledDate |
| Document | id, vehicleId?, driverId?, type, expiryDate, fileUrl?, alertSent |

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
| `docs/01-descricao-do-problema-e-escopo.md` | **Documento principal da entrega** — problema, escopo, objetivos |
| `docs/02-visao-geral-do-projeto.md` | Visão geral dos módulos |
| `docs/03-requisitos.md` | RF, RNF, regras de negócio e matriz RBAC |
| `docs/04-arquitetura.md` | Arquitetura real da solução |
| `docs/05-banco-de-dados.md` | Modelo de dados e dicionário |
| `docs/06-status-de-desenvolvimento.md` | Status verificado por funcionalidade |
| `docs/07-configuracao-e-execucao.md` | Instalação e execução |
| `docs/08-proximas-etapas.md` | Trabalho restante |
| `docs/historico-desenvolvimento/` | Registro histórico das sprints — **não é documentação vigente** |
| `docs/academico/` | Documentos acadêmicos da UNIFOR (.docx) |

**Leia `docs/04-arquitetura.md` antes de qualquer coisa.** Ele descreve a arquitetura efetivamente implementada e registra o que foi previsto e não implementado.

---

## Como rodar o projeto localmente

### Pré-requisitos

- Node.js 20+
- Projeto Supabase com connection string PostgreSQL disponível

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Criar/editar apps/api/.env com DATABASE_URL, DIRECT_URL e SUPABASE_URL
# Criar/editar apps/web/.env com VITE_API_URL, VITE_SUPABASE_URL e
# VITE_SUPABASE_ANON_KEY
# No painel do Supabase, DESATIVAR "Confirm email" em Authentication >
# Sign In / Providers > Email — sem isso o cadastro nao se completa

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

### Atenção: perfis de demonstração do seed

O seed cria três perfis já aprovados (`ACTIVE`) e **sem conta de acesso vinculada**:

- `admin@fleet-manager.com` — ADMIN
- `gerente@fleet-manager.com` — MANAGER
- `operador@fleet-manager.com` — OPERATOR

O seed **não cria contas no Supabase Auth**. Para acessar com qualquer um deles, cadastre o mesmo e-mail pela tela de cadastro da aplicação escolhendo a senha: a API vincula o perfil existente à conta nova, preservando role e status `ACTIVE`.

---

## Estado Atual do Projeto

> **Última atualização:** 2026-08-26 (Supabase Auth e publicação em produção na Vercel — https://pfi-fleet-manager-api.vercel.app)
> **Atualizar esta seção a cada task concluída antes de fazer push.**

> Referências antigas à arquitetura anterior podem aparecer em seções históricas de sprints já concluídas. O estado atual do projeto é o descrito nas seções de arquitetura, setup e fluxo acima.

### ✅ Concluído

> Os blocos abaixo preservam o histórico de execução das sprints. Alguns nomes de tasks continuam refletindo a arquitetura vigente na época em que foram entregues.

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
- [x] **Task 4: Ambiente local + .env** — commit `b6146e9`
- [x] **Task 5: Prisma Schema** — commit `13369cd`
- [x] **Task 6: Prisma Seed** — commit `13369cd`
- [x] **Task 7: Express App, Config e Error Handler** — commit `fe22487`
- [x] **Task 8: Middleware de Autenticação JWT (TDD)** — commit `89a63a6` — 4 testes
- [x] **Task 9: Middleware de Autorização RBAC (TDD)** — commit `cfe6f07` — 4 testes
- [x] **Task 10: Middleware de Validação Zod (TDD)** — commit `9dba69f` — 3 testes
- [x] **Task 11: Users Repository e Service (TDD)** — commit `3911c76` — 3 testes
- [x] **Task 12: Users Controller, Routes e Smoke Test** — commit `6003d1a` — 14 testes total

#### Pendências antes da Sprint 1 — COMPLETO
- [x] **Ambiente local validado**
- [x] **Migration executada** — `prisma migrate dev --name init` — tabelas criadas no PostgreSQL
- [x] **Seed executado** — admin, veículo (Toyota Corolla ABC-1234) e motorista (João Silva) inseridos
- [x] **Autenticação inicial configurada**

#### Pós-Sprint 5 — Autenticação própria + Supabase — COMPLETO
- [x] **Consolidar autenticação própria no frontend e backend**
- [x] **Implementar autenticação própria com e-mail/senha + JWT**
- [x] **Migrar PostgreSQL para o Supabase**
- [x] **Limpar documentação legada da arquitetura anterior**

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
- [x] **Seed ampliado com dados fictícios para validação**
  - `apps/api/prisma/seed.ts` agora popula usuários, veículos, motoristas, vínculos, despesas, manutenções e documentos
  - Seed idempotente para dados derivados da frota fictícia, evitando duplicação em novas execuções
  - Seed executado no banco PostgreSQL do Supabase configurado no `.env`
- [x] **Dashboard real com filtros e indicadores operacionais**
  - Endpoint `/dashboard/indicators` aceita filtros de período, veículo e tipo de despesa
  - Indicadores financeiros usam o mesmo recorte dos gráficos e da listagem de despesas
  - Dashboard exibe total, quantidade, média, despesas por mês, por tipo, por veículo e últimas despesas
  - Alertas de manutenção e documentos foram separados em pendentes, atrasados, vencidos e vencendo

- [x] **Publicação em produção na Vercel**
  - Projeto único: frontend estático e API serverless no mesmo domínio, sem CORS entre eles
  - `api/index.ts` exporta a aplicação Express como função; `vercel.json` define build, reescritas e cron
  - `node-cron` desligado quando `VERCEL=1`; a rotina diária passa a ser chamada em `GET /api/jobs/alerts`, protegida por `CRON_SECRET`
  - `packages/shared` passou a emitir CJS e ESM — o `main` apontava para `.ts`, que o Node do runtime não carrega
  - `binaryTargets` do Prisma inclui `rhel-openssl-3.0.x`
  - Publicado e validado em https://pfi-fleet-manager-api.vercel.app

- [x] **Migração da autenticação para o Supabase Auth**
  - Credenciais deixam de ser armazenadas pela aplicação; `passwordHash` removido
  - `User` ganhou `authUserId` (único, opcional) vinculando ao `auth.users.id`
  - Migration `20260826000000_supabase_auth` criada
  - `verify-token.ts` passou a verificar JWT ES256 via JWKS, conferindo emissor e público
  - Novo middleware `requireSupabaseSession` para o cadastro (token válido, perfil ainda inexistente)
  - `authenticate` busca por `authUserId` e responde 404 `PROFILE_NOT_FOUND` quando não há perfil
  - Cadastro em duas etapas; perfis do seed sem conta são vinculados por e-mail
  - Frontend usa `supabase.auth` para login, cadastro, logout e troca de senha
  - `bcryptjs` removido das dependências; `JWT_SECRET` deixou de existir
  - 100 testes passando; `tsc` e build verificados
  - Requer "Confirm email" desativado no painel do Supabase

- [x] **Auditoria completa, documentação oficial e novo ambiente Supabase**
  - Auditoria integral do repositório: código, documentação, Git, banco e dependências
  - Documentação oficial criada em `docs/01`–`docs/08`, baseada em evidência do código
  - Conteúdo dos `.docx` acadêmicos recuperado e incorporado (RF01–RF10, RNF01–RNF07, objetivos)
  - `README.md` reescrito — removidas referências a Redis e AWS ECS, que nunca existiram no projeto
  - Registros de processo movidos para `docs/historico-desenvolvimento/`
  - `supabase/schema-completo.sql` e `supabase/storage-setup.sql` versionados — ambiente reprodutível
  - Projeto Supabase anterior estava inacessível; novo projeto configurado
  - `logo.svg` versionado (estava fora do Git e é usado em 4 telas)
  - Acentuação corrompida (mojibake) corrigida em 138 linhas do `CLAUDE.md`
  - Removidos: `dist/` com código Auth0 antigo, 4 logs soltos na raiz e mock não utilizado
  - Notificação de vencimentos por e-mail movida para **fora do escopo**, por decisão de projeto

### 🔄 Em Andamento

_Nenhum._

### 📋 Backlog por Sprint

#### Pré-Sprint — Setup
- [x] Task 1: Inicializar Git e Monorepo Root
- [x] Task 2: packages/shared — Enums
- [x] Task 3: packages/shared — DTOs
- [x] Task 4: Ambiente local + .env
- [x] Task 5: Prisma Schema
- [x] Task 6: Prisma Seed
- [x] Task 7: Express App, Config e Error Handler
- [x] Task 8: Middleware de Autenticação JWT (TDD)
- [x] Task 9: Middleware de Autorização RBAC (TDD)
- [x] Task 10: Middleware de Validação Zod (TDD)
- [x] Task 11: Users Repository e Service (TDD)
- [x] Task 12: Users Controller, Routes e Smoke Test

#### Pendências antes da Sprint 1
- [x] Validar ambiente local
- [x] Executar `cd apps/api && npx prisma migrate dev --name init`
- [x] Executar `npx prisma db seed`
- [x] Configurar variáveis do backend

#### Sprint 1 — Acesso Frontend + Dashboard + i18n (issues: #21, #22, #23) — COMPLETA
- [x] [#21] Integrar autenticação do frontend
- [x] [#22] Implementar i18n pt-BR / en-US
- [x] [#23] Implementar tela de Dashboard (dados mockados)
- [x] Fix: fluxo de redirecionamento e acesso do frontend

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

#### Sprint 5 — Dashboard Real, Usuários e Testes (issues: #6, #38–#40) — COMPLETA
- [x] [#6] Endpoints de indicadores financeiros (backend)
- [x] [#38] Tela de gerenciamento de usuários (ADMIN)
- [x] Conectar Dashboard ao backend real (Recharts)
- [x] [#39] Testes unitários do backend
- [x] [#40] Validação do MVP com dados reais

#### Sprint 6 — Deploy e Entrega (issues: #41–#44)
- [x] [#41] Deploy do frontend na Vercel
- [x] [#42] Deploy do backend — Vercel serverless, no mesmo projeto
- [x] [#43] Configurar PostgreSQL do Supabase para produção
- [ ] [#44] Entrega final e apresentação

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

### Antes de começar a trabalhar

1. **Leia a arquitetura:** `docs/04-arquitetura.md`
2. **Leia o escopo:** `docs/01-descricao-do-problema-e-escopo.md` e o status em `docs/06-status-de-desenvolvimento.md`
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
> As entradas abaixo preservam o contexto histórico de implementação e foram normalizadas para a arquitetura atual do projeto.

| Data | Responsável | Task | Notas |
|---|---|---|---|
| 2026-04-14 | Luiz Eduardo | Spec + Plano do Pré-Sprint | Spec em `docs/specs/`, plano em `docs/plans/` |
| 2026-04-14 | Claude | Task 1: Monorepo Root | ESLint v8 (não v9 — incompatível com .eslintrc.js). .gitattributes adicionado para LF. package-lock.json commitado. |
| 2026-04-14 | Claude | Task 2: packages/shared Enums | 6 enums: UserRole, VehicleStatus, DriverStatus, ExpenseType, MaintenanceType, MaintenanceStatus |
| 2026-04-14 | Claude | Task 3: packages/shared DTOs | Interfaces para User, Vehicle, Driver, Expense, Maintenance, Document (Create/Update/Response) |
| 2026-04-15 | Claude | Task 5: Prisma Schema | Schema completo com todas as entidades e enums. |
| 2026-04-15 | Claude | Task 6: Prisma Seed | Seed com admin user, veículo e motorista de exemplo. |
| 2026-04-15 | Claude | Task 7: Express App + Config + Error Handler | env.ts (Zod), database.ts (Prisma singleton), express.d.ts, error-handler.ts, app.ts, server.ts, routes/index.ts |
| 2026-04-15 | Claude | Task 8: Middleware authenticate (TDD) | 4 testes de autenticação JWT. |
| 2026-04-15 | Claude | Task 9: Middleware authorize (TDD) | 4 testes. RBAC com UserRole. |
| 2026-04-15 | Claude | Task 10: Middleware validate (TDD) | 3 testes. Validação de body com Zod + strip de campos extras. |
| 2026-04-15 | Claude | Task 11: User Repository + Service (TDD) | 3 testes. findAll, findById, updateRole com AppError 404. |
| 2026-04-15 | Claude | Task 12: User Controller + Routes | listUsers e updateRole. Rotas protegidas com authenticate + authorize(ADMIN). 14 testes passando. |
| 2026-04-15 | Gregory + Claude | Pendências pré-Sprint 1 | Ambiente validado. Migration e seed executados. Variáveis do backend atualizadas. |
| 2026-04-15 | Claude | Reorganização de docs | .docx e .tsv movidos para docs/academico/. docs/superpowers/ renomeada para docs/specs/ e docs/plans/. |
| 2026-04-15 | Claude | Sprint 1: Scaffold React + Vite + Tailwind + shadcn/ui | Estrutura completa do frontend — commit dc84aec |
| 2026-04-15 | Claude | Sprint 1: autenticação do frontend integrada | Landing page, ProtectedRoute e fluxo inicial de acesso. |
| 2026-04-15 | Claude | Sprint 1: i18n pt-BR / en-US | react-i18next, toggle no header, persistência em localStorage |
| 2026-04-15 | Claude | Sprint 1: Dashboard mockado | 4 cards em src/mocks/dashboard.ts — substituíveis por API na Sprint 5 |
| 2026-04-15 | Gregory + Claude | Sprint 1: fix do fluxo de acesso | Ajustes de roteamento e fluxo de autenticação do frontend. Sprint 1 funcionando end-to-end. |
| 2026-04-16 | Codex | Sprint 2: Vehicles and Drivers | Backend REST de vehicles/drivers com vinculação, 25 novos testes de service (39 passando no total), helper de API e telas React de listagem, formulário, detalhe e vínculo. `tsc --noEmit` da API e web passou. `npm run build` do frontend passou. |
| 2026-04-17 | Gregory + Claude | Fix: useToken loop infinito | `useToken` retornava nova função a cada render, causando loop infinito nos hooks. Corrigido com `useCallback` em `apps/web/src/hooks/useToken.ts`. |
| 2026-04-17 | Gregory + Claude | Fix: usuário administrativo validado | Ajuste do usuário administrativo no banco. Sprint 2 validada end-to-end: veículos e motoristas funcionando no browser. |
| 2026-04-17 | Codex | Sprint 3: API de despesas | `expense.repository`, `expense.service` (TDD com 9 testes), controller e rotas `/expenses` com filtros por veículo/período e RBAC para CRUD. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: API de manutenções | `maintenance.repository`, `maintenance.service` (TDD com 10 testes), controller e rotas `/maintenances` com filtros e normalização de `completedDate` ao mudar status. `tsc --noEmit` e `npm run test` da API passaram. |
| 2026-04-17 | Codex | Sprint 3: Frontend despesas e manutenções | `ExpenseList`, `ExpenseForm`, `MaintenanceList`, `MaintenanceForm` + hooks `useExpenses`/`useMaintenances`. Rotas `/expenses` e `/maintenances` registradas no App.tsx e links no Sidebar. i18n pt-BR/en-US atualizado. `tsc --noEmit` do frontend passou. |
| 2026-04-17 | Codex | Sprint 4: API de documentos | `document.repository` com status computado, `document.service` (TDD com 15 testes), controller e rotas `/documents` + `/documents/alerts/count`. Migration `DocumentType` aplicada e Prisma Client regenerado. |
| 2026-04-17 | Codex | Sprint 4: Cron job de alertas | `alertCron.ts` registrado na API, execução diária via `node-cron` e marcação idempotente de `alertSent=true` para documentos vencidos ou vencendo em 30 dias. |
| 2026-04-17 | Codex | Sprint 4: Frontend documentos e alertas | `DocumentList`, `DocumentForm`, `AlertCenter`, hooks `useDocuments`/`useAlertCount`, rotas `/documents` e `/alerts`, badge no Sidebar, sino no Header e i18n pt-BR/en-US atualizado. `tsc --noEmit` e `npm run build` do frontend passaram. |
| 2026-04-23 | Codex | Sprint 5: API de indicadores | `dashboard.repository`, `dashboard.service` (TDD com 2 testes), controller e rota protegida `GET /dashboard/indicators`. `npx tsc --noEmit` e `npm run test:api` passaram. |
| 2026-04-23 | Codex | Sprint 5: Gerenciamento de usuários | `useUsers`, página `UserList`, rota `/users`, link no Sidebar habilitado para ADMIN e i18n pt-BR/en-US atualizado. |
| 2026-04-23 | Codex | Sprint 5: Dashboard real com Recharts | `useDashboard`, cards reais, `BarChart` por mês e `PieChart` por tipo em `Dashboard.tsx`. `apps/web` passou em `npx tsc --noEmit` e `npm run build`. |
| 2026-04-23 | Gregory | Sprint 5: Validação do MVP com dados reais | Dashboard validado manualmente no browser após a implementação da sprint 5, com indicadores e gráficos funcionando corretamente. |
| 2026-04-23 | Codex | Hotfix: auto-cadastro no authenticate | Novos usuários autenticados passam a ser criados automaticamente com role `OPERATOR` no primeiro acesso, liberando dashboard, despesas e manutenções. `authenticate.test.ts`, `npm run test:api` e `npx tsc --noEmit` da API passaram. |
| 2026-04-23 | Codex | Hotfix: frontend usa role real do banco | `GET /users/me` adicionado na API e novo `useCurrentUser` no frontend para que Sidebar e ações da UI usem o role persistido no banco, corrigindo o acesso de admins à gestão de usuários. `npm run test:api`, `apps/api npx tsc --noEmit`, `apps/web npx tsc --noEmit` e `apps/web npm run build` passaram. |
| 2026-05-06 | Gregory | Consolidação da arquitetura atual | Login passa a usar e-mail/senha com JWT próprio. Banco PostgreSQL migrado para o Supabase. |
| 2026-05-06 | Codex | Limpeza de documentação base | `CLAUDE.md` e `AGENTS.md` alinhados ao estado atual do projeto, removendo instruções desatualizadas da arquitetura anterior. |
| 2026-05-06 | Codex | Limpeza ampla da documentação | `README.md`, exemplos de ambiente e documentos de sprint foram normalizados para a arquitetura atual, sem referências à stack anterior. |
| 2026-05-14 | Codex | Hotfix: veiculos delete permanente + reativacao + modal + uppercase | `DELETE /vehicles/:id/permanent` adicionado com cascade Prisma, listagem de veiculos ganhou acoes de exclusao permanente e reativacao via `PUT /vehicles/:id`, confirmacoes passaram para `ConfirmDialog` proprio e formulario passou a normalizar placa, marca, modelo e cor para maiusculas. `apps/api` passou em `npx tsc --noEmit` e `npm run test`; `apps/web` passou em `npx tsc --noEmit` e `npm run build`. |
| 2026-05-26 | Codex | Feature: upload de arquivo e melhorias em documentos | `fileUrl` no schema, Supabase Storage client-side, `FilePreviewModal`, `DocumentForm` com filtro de tipos, `VehicleDetail` e `DriverDetail` com seção de documentos. |
| 2026-06-09 | Codex | Seed ampliado com dados fictícios | `apps/api/prisma/seed.ts` atualizado para popular usuários, frota, motoristas, vínculos, despesas, manutenções e documentos. Seed executado no Supabase e validado com contagens específicas: 8 veículos, 6 motoristas, 27 despesas, 14 manutenções e 25 documentos. |
| 2026-08-26 | Claude | Migração para o Supabase Auth | Credenciais delegadas ao Supabase Auth; `passwordHash` removido e `authUserId` adicionado ao model `User`; verificação de token por JWKS (ES256); cadastro em duas etapas com vínculo de perfis preexistentes; `bcryptjs` e `JWT_SECRET` eliminados. 100 testes, `tsc` e build verificados. |
| 2026-08-24 | Claude | Auditoria, documentação oficial e novo Supabase | Documentação `docs/01`–`docs/08` criada a partir do código e dos `.docx`. README corrigido (Redis e AWS ECS removidos). Scripts SQL versionados em `supabase/`. Mojibake corrigido no CLAUDE.md. E-mail de alertas movido para fora do escopo. 99 testes e `tsc` verificados após as mudanças. |
| 2026-06-09 | Codex | Dashboard real com filtros e indicadores | Backend do dashboard passou a aceitar filtros de período, veículo e tipo de despesa; frontend ganhou filtros, cards financeiros, gráfico por veículo e lista de últimas despesas. Validação real no Supabase retornou todos os tipos de despesa populados. |

---

## Fora do Escopo (não implementar)

- Rastreamento GPS em tempo real
- Telemetria avançada
- Planejamento e otimização de rotas
- Integração automática com DETRAN
- Aplicativo mobile nativo
- **Notificação de vencimentos por e-mail, SMS ou mensagem** — o acompanhamento é feito dentro da aplicação, pela central de alertas. Decisão registrada em `docs/01-descricao-do-problema-e-escopo.md`
- **Recuperação autônoma de senha** — depende de envio por canal externo, também fora do escopo
