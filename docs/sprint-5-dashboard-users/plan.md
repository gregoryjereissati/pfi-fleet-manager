# Sprint 5 — Dashboard, Usuários e Validação

**Data:** 2026-05-06  
**Status:** concluído e mantido como resumo de referência

---

## Escopo Entregue

- Indicadores financeiros reais no backend.
- Dashboard conectado ao backend no frontend.
- Tela de gerenciamento de usuários.
- Validação do MVP com dados reais.

---

## Backend

- `GET /dashboard/indicators` protegido por autenticação.
- Service e repository específicos para agregações financeiras.
- Testes unitários cobrindo a camada de indicadores.

---

## Frontend

- Hook de dashboard para carregar indicadores reais.
- Cards, gráficos e totais ligados ao backend.
- Página de usuários disponível apenas para `ADMIN`.
- Sidebar e permissões baseadas no usuário real carregado do backend.

---

## Verificação

```bash
cd apps/api && npx tsc --noEmit
npm run test:api

cd apps/web && npx tsc --noEmit
npm run build
```
