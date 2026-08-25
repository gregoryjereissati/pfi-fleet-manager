# Fleet Manager — Arquitetura Atual de Acesso e Banco

**Data:** 2026-05-05  
**Status:** vigente

---

## Escopo

Documentar a arquitetura atual de autenticação própria com JWT e o uso de PostgreSQL hospedado no Supabase.

---

## Backend

- Login por e-mail e senha.
- Hash de senha com `bcryptjs`.
- Assinatura e validação de token com `jose`.
- Middleware `authenticate` baseado em `userId`.
- RBAC com `ADMIN`, `MANAGER` e `OPERATOR`.

---

## Banco

- PostgreSQL gerenciado no Supabase.
- Prisma como única interface de acesso.
- `DATABASE_URL` e `DIRECT_URL` configuradas por ambiente.
- Seed responsável por criar o usuário administrativo inicial.

---

## Frontend

- Token persistido em `localStorage` como `fm_token`.
- `ProtectedRoute` bloqueia páginas privadas sem token.
- `apiFetch` centraliza o header `Authorization`.
- Sidebar e permissões visuais seguem o usuário real carregado do backend.

---

## Arquivos-Chave

- `apps/api/src/services/auth.service.ts`
- `apps/api/src/lib/verify-token.ts`
- `apps/api/src/middlewares/authenticate.ts`
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/hooks/useToken.ts`
- `apps/web/src/hooks/useCurrentUser.ts`

