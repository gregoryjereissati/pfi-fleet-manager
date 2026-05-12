# Fleet Manager — Setup Base e Arquitetura Atual

**Data:** 2026-05-06  
**Status:** referência vigente  
**Projeto:** Fleet Manager — PFI UNIFOR 2026

---

## Objetivo

Consolidar a visão atual do setup inicial do projeto para novos colaboradores, usando a arquitetura que está ativa no repositório hoje.

---

## Stack Atual

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Banco de dados | PostgreSQL hospedado no Supabase |
| Autenticação | JWT próprio com e-mail e senha |
| Validação | Zod |
| Controle de acesso | RBAC (`ADMIN`, `MANAGER`, `OPERATOR`) |
| Testes | Vitest |

---

## Estrutura do Repositório

```text
fleet-manager/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── shared/
├── docs/
├── package.json
└── tsconfig.base.json
```

---

## Fluxo de Acesso

1. Usuário envia e-mail e senha para `POST /auth/login`.
2. Backend valida a senha com `bcryptjs`.
3. Backend assina um JWT com `JWT_SECRET`.
4. Frontend salva o token e envia `Authorization: Bearer <token>`.
5. Middleware `authenticate` valida o token e carrega o usuário.
6. Middleware `authorize` aplica RBAC nas rotas protegidas.

---

## Variáveis de Ambiente do Backend

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=...
```

---

## Regras Arquiteturais

- Controllers recebem a requisição e delegam para services.
- Services concentram regra de negócio e lançam `AppError` quando necessário.
- Repositories encapsulam acesso ao Prisma.
- Rotas protegidas usam `authenticate`.
- RBAC usa `authorize(role)`.
- Validação de entrada usa Zod.

---

## Referências de Código

- Schema: `apps/api/prisma/schema.prisma`
- Seed: `apps/api/prisma/seed.ts`
- Auth backend: `apps/api/src/controllers/auth.controller.ts`
- Middleware de autenticação: `apps/api/src/middlewares/authenticate.ts`
- Login frontend: `apps/web/src/pages/Login.tsx`

