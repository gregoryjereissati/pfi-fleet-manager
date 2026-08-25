# Fleet Manager — Plano Base Atualizado

**Data:** 2026-05-06  
**Status:** concluído e mantido como referência operacional

---

## Objetivo

Registrar o checklist mínimo para subir e entender a base atual do projeto.

---

## Checklist de Ambiente

- Instalar dependências com `npm install`.
- Configurar `apps/api/.env` com `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET`.
- Aplicar migrations com `cd apps/api && npx prisma migrate dev`.
- Popular dados iniciais com `cd apps/api && npx prisma db seed`.
- Subir a API com `npm run dev:api`.
- Subir o frontend com `npm run dev:web`.

---

## Checklist do Backend

- Prisma configurado com PostgreSQL do Supabase.
- Middlewares de `authenticate`, `authorize` e `validate` ativos.
- Rotas públicas de acesso em `/auth/register` e `/auth/login`.
- Camadas separadas em controller, service e repository.
- Tipos e DTOs compartilhados em `packages/shared`.

---

## Checklist de Verificação

```bash
cd apps/api && npx tsc --noEmit
npm run test:api

cd apps/web && npx tsc --noEmit
npm run build
```

---

## Observações

- O usuário admin inicial é criado pelo seed.
- Rodar o seed novamente não altera a senha do admin existente.
- A fonte de verdade do estado atual do projeto continua sendo `CLAUDE.md`.

