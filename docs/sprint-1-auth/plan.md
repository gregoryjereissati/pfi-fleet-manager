# Fleet Manager — Plano Atual do Frontend Inicial

**Data:** 2026-05-06  
**Status:** concluído e mantido como referência

---

## Objetivo

Resumir os elementos que compõem a base autenticada do frontend na arquitetura atual.

---

## Entregas Principais

- Página de login com envio de e-mail e senha.
- Página de solicitação de acesso.
- Proteção de rotas privadas com verificação do token local.
- Sidebar, header e layout autenticado.
- Internacionalização pt-BR / en-US.
- Dashboard conectado ao backend.

---

## Contratos de Integração

- `POST /auth/login`
- `POST /auth/register`
- `GET /users/me`
- `GET /dashboard/indicators`

---

## Convenções de Implementação

- Usar `apiFetch` para chamadas HTTP.
- Usar `useToken` para recuperar o token persistido.
- Usar `useCurrentUser` para role e dados do usuário atual.
- Exibir estados de `PENDING_APPROVAL` e `BLOCKED` no login.

---

## Verificação

```bash
cd apps/web && npx tsc --noEmit
npm run build
```

