# Fleet Manager — Acesso do Frontend, i18n e Dashboard

**Data:** 2026-05-06  
**Status:** referência vigente do frontend inicial

---

## Objetivo

Descrever a base do frontend autenticado: acesso por login/registro, proteção de rotas, internacionalização e dashboard inicial.

---

## Stack do Frontend

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Roteamento | React Router DOM |
| Acesso | JWT próprio armazenado no cliente |
| Estilos | Tailwind CSS |
| i18n | react-i18next + i18next |

---

## Fluxo de Acesso

1. Usuário acessa `/login` ou `/register`.
2. Login envia credenciais para `POST /auth/login`.
3. Frontend salva `fm_token` no `localStorage`.
4. `ProtectedRoute` libera telas privadas quando o token está presente.
5. Requisições autenticadas usam `Authorization: Bearer <token>`.
6. Logout remove o token local e redireciona para a entrada pública.

---

## Estrutura Relevante

```text
apps/web/src/
├── components/
│   ├── ProtectedRoute.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── hooks/
│   ├── useToken.ts
│   └── useCurrentUser.ts
├── lib/
│   ├── api.ts
│   └── i18n.ts
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── Dashboard.tsx
└── App.tsx
```

---

## Convenções

- Token salvo em `localStorage` com a chave `fm_token`.
- Idioma padrão em pt-BR, com alternância para en-US.
- Sidebar e ações de UI seguem o role persistido no banco.
- Dashboard usa dados reais do backend na versão atual.

