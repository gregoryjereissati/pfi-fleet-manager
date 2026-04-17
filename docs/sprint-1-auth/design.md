# Fleet Manager — Sprint 1: Auth Frontend + Dashboard + i18n

**Data:** 2026-04-15  
**Sprint:** 1  
**Issues:** #21 (Auth0 frontend), #22 (i18n), #23 (Dashboard mockado)  
**Projeto:** Fleet Manager – PFI UNIFOR 2026

---

## Contexto

O backend está completo (Pré-Sprint). O frontend (`apps/web`) existe apenas como stub. Esta sprint constrói o scaffold completo do React, integra autenticação via Auth0 SDK, implementa i18n pt-BR/en-US, e entrega o Dashboard com dados mockados.

---

## Stack Frontend

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Roteamento | React Router DOM v6 |
| Autenticação | @auth0/auth0-react |
| Estilos | Tailwind CSS |
| Componentes | shadcn/ui |
| i18n | react-i18next + i18next |

---

## Estrutura de Arquivos

```
apps/web/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          ← navegação lateral fixa
│   │   ├── Header.tsx           ← título + toggle idioma + avatar
│   │   └── ProtectedRoute.tsx   ← guarda rotas autenticadas
│   ├── layouts/
│   │   └── AppLayout.tsx        ← wrapper: Sidebar + Header + Outlet
│   ├── pages/
│   │   ├── Landing.tsx          ← página pública com botão "Entrar"
│   │   └── Dashboard.tsx        ← 4 cards de resumo
│   ├── mocks/
│   │   └── dashboard.ts         ← dados hardcoded substituíveis na Sprint 5
│   ├── lib/
│   │   ├── auth0.tsx            ← configuração do Auth0Provider
│   │   └── i18n.ts             ← configuração do i18next
│   ├── locales/
│   │   ├── pt-BR.json           ← idioma padrão
│   │   └── en-US.json
│   ├── App.tsx                  ← definição de rotas
│   └── main.tsx                 ← entrypoint
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Fluxo de Autenticação

```
1. Usuário acessa /
   → Landing page pública
   → Botão "Entrar" chama loginWithRedirect() do Auth0 SDK

2. Auth0 autentica e retorna com callback
   → React Router redireciona para /dashboard

3. /dashboard é protegida por <ProtectedRoute>
   → Verifica isAuthenticated do useAuth0()
   → Se false: redireciona para /
   → Se true: renderiza AppLayout + Dashboard

4. Usuário clica em "Sair"
   → chama logout() do Auth0 SDK
   → retorna para /
```

**Variáveis de ambiente (apps/web/.env):**
```
VITE_AUTH0_DOMAIN=dev-ul8bdg6vfdrtwzgo.us.auth0.com
VITE_AUTH0_CLIENT_ID=<client_id_do_spa_auth0>
VITE_AUTH0_AUDIENCE=https://api.fleet-manager.com
VITE_AUTH0_REDIRECT_URI=http://localhost:5173/dashboard
```

> O Client ID do SPA precisa ser criado no Auth0 (Applications → Applications → Create → Single Page Web Application). O tenant já existe.

---

## Layout

### AppLayout

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (240px, fixa)    │  Header (h-14)           │
│                           │──────────────────────────│
│  Fleet Manager (logo)     │                          │
│  ──────────────────       │   Conteúdo da página     │
│  📊 Dashboard             │   (<Outlet />)           │
│  🚙 Veículos   [disabled] │                          │
│  👤 Motoristas [disabled] │                          │
│  💰 Despesas   [disabled] │                          │
│  🔧 Manutenções[disabled] │                          │
│  📄 Documentos [disabled] │                          │
│  👥 Usuários   [disabled] │                          │
│                           │                          │
│  ──────────────────       │                          │
│  [avatar] Nome    Sair    │                          │
└──────────────────────────────────────────────────────┘
```

**Itens desabilitados na sidebar:**
- Visíveis com opacidade reduzida e `cursor-not-allowed`
- Tooltip: "Disponível em breve"
- Sem evento de clique

### Header

- Esquerda: título da página atual (ex: "Dashboard")
- Direita: toggle de idioma `PT | EN` + avatar do usuário logado

---

## Dashboard

4 cards em grid 2×2 responsivo (em mobile: 1 coluna, em tablet: 2 colunas):

| Card | Valor mockado | Subtítulo |
|---|---|---|
| Veículos | 12 | ativos |
| Motoristas | 8 | ativos |
| Despesas | R$ 4.200 | este mês |
| Manutenções | 3 | pendentes |

Dados definidos em `src/mocks/dashboard.ts` como constantes TypeScript — substituíveis por chamadas à API na Sprint 5 sem alterar os componentes.

---

## i18n

**Idioma padrão:** pt-BR (independente do navegador)  
**Persistência:** preferência salva em `localStorage` (`i18nextLng`)  
**Toggle:** botão `PT | EN` no Header chama `i18n.changeLanguage()`

**Chaves de tradução (Sprint 1):**

```json
{
  "app.name": "Fleet Manager",
  "nav.dashboard": "Dashboard",
  "nav.vehicles": "Veículos",
  "nav.drivers": "Motoristas",
  "nav.expenses": "Despesas",
  "nav.maintenances": "Manutenções",
  "nav.documents": "Documentos",
  "nav.users": "Usuários",
  "nav.comingSoon": "Disponível em breve",
  "nav.logout": "Sair",
  "landing.title": "Fleet Manager",
  "landing.subtitle": "Gestão inteligente da sua frota",
  "landing.login": "Entrar",
  "dashboard.title": "Dashboard",
  "dashboard.vehicles": "Veículos ativos",
  "dashboard.drivers": "Motoristas ativos",
  "dashboard.expenses": "Despesas este mês",
  "dashboard.maintenances": "Manutenções pendentes",
  "lang.toggle": "EN"
}
```

---

## Rotas

```
/             → <Landing />          (pública)
/dashboard    → <Dashboard />        (protegida)
*             → redireciona para /
```

Rotas futuras (veículos, motoristas, etc.) serão adicionadas nas sprints seguintes sem alterar a estrutura base.

---

## Testes

Não há testes unitários no frontend nesta sprint — o foco é entregar a estrutura base funcionando. Validação é manual:

- [ ] Landing abre sem login
- [ ] Botão "Entrar" redireciona para Auth0
- [ ] Após login, `/dashboard` exibe os 4 cards
- [ ] Tentar acessar `/dashboard` sem login redireciona para `/`
- [ ] Toggle PT/EN altera todos os textos da interface
- [ ] Preferência de idioma persiste após recarregar a página
- [ ] Itens desabilitados na sidebar não são clicáveis

---

## O que NÃO está no escopo desta sprint

- Chamadas reais à API (dados são mockados)
- Telas de Veículos, Motoristas, Despesas, Manutenções, Documentos, Usuários
- Testes automatizados de frontend
- Deploy na Vercel
