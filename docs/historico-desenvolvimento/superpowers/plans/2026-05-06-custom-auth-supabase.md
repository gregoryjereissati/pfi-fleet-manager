# Fleet Manager — Registro Consolidado da Arquitetura Atual

**Data:** 2026-05-06  
**Status:** concluído

---

## Objetivo

Registrar de forma curta o que compõe a arquitetura atual adotada no projeto.

---

## Itens Consolidados

- Backend autenticando com JWT próprio.
- Senhas armazenadas com hash bcrypt.
- Banco PostgreSQL hospedado no Supabase.
- Frontend com login, registro e rotas protegidas.
- Persistência de token local com `fm_token`.
- RBAC baseado no role salvo no banco.

---

## Checklist de Manutenção

- Manter `apps/api/.env` com `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET`.
- Garantir que novas rotas privadas usem `authenticate`.
- Garantir que mutações sensíveis usem `authorize(...)`.
- Atualizar `CLAUDE.md` sempre que a arquitetura ou fluxo operacional mudar.

---

## Verificação Recomendada

```bash
cd apps/api && npx tsc --noEmit
npm run test:api

cd apps/web && npx tsc --noEmit
npm run build
```
