# Sprint 1 — Auth Frontend + Dashboard + i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o frontend do Fleet Manager do zero: scaffold Vite + React + TypeScript, integração Auth0, i18n pt-BR/en-US, layout com sidebar e Dashboard com 4 cards mockados.

**Architecture:** Single Page Application com React Router para roteamento, Auth0 SDK para autenticação, react-i18next para internacionalização. Layout autenticado com sidebar fixa e header. Dados do Dashboard são constantes em `src/mocks/dashboard.ts`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router DOM v6, @auth0/auth0-react, react-i18next, lucide-react

---

## Mapa de Arquivos

```
apps/web/
├── .env                          ← variáveis de ambiente (não commitado)
├── .env.example                  ← template de variáveis (commitado)
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.css                 ← Tailwind directives + CSS vars do shadcn
    ├── main.tsx                  ← entrypoint: Auth0Provider + i18n + App
    ├── App.tsx                   ← definição de rotas
    ├── components/
    │   ├── Header.tsx            ← título da página + toggle idioma
    │   ├── ProtectedRoute.tsx    ← guarda rotas autenticadas
    │   └── Sidebar.tsx           ← navegação lateral fixa
    ├── layouts/
    │   └── AppLayout.tsx         ← Sidebar + Header + Outlet
    ├── lib/
    │   ├── i18n.ts              ← configuração do i18next
    │   └── utils.ts             ← função cn() do shadcn
    ├── locales/
    │   ├── en-US.json
    │   └── pt-BR.json
    ├── mocks/
    │   └── dashboard.ts          ← dados mockados substituíveis na Sprint 5
    └── pages/
        ├── Dashboard.tsx
        └── Landing.tsx
```

---

## Task 1: Criar Auth0 SPA Application

> Pré-requisito manual — feito no painel Auth0, não no código.

**Files:** nenhum (configuração externa)

- [ ] **Step 1: Acessar Auth0 dashboard**

  Abrir `manage.auth0.com` → menu esquerdo: **Applications → Applications** → botão **+ Create Application**

- [ ] **Step 2: Criar a aplicação**

  - Name: `Fleet Manager Web`
  - Type: **Single Page Web Application**
  - Clicar em **Create**

- [ ] **Step 3: Configurar URLs permitidas**

  Na aba **Settings** da aplicação recém-criada, preencher:
  - **Allowed Callback URLs:** `http://localhost:5173/dashboard`
  - **Allowed Logout URLs:** `http://localhost:5173`
  - **Allowed Web Origins:** `http://localhost:5173`
  - Clicar em **Save Changes**

- [ ] **Step 4: Copiar o Client ID**

  Ainda na aba Settings, copiar o valor de **Client ID** — será usado no `.env` da Task 14.

---

## Task 2: Scaffold apps/web — package.json

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Substituir o package.json stub pelo definitivo**

  ```json
  {
    "name": "@fleet-manager/web",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "@auth0/auth0-react": "^2.2.4",
      "i18next": "^23.11.5",
      "lucide-react": "^0.378.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "react-i18next": "^14.1.2",
      "react-router-dom": "^6.23.1"
    },
    "devDependencies": {
      "@types/node": "^20.14.0",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.0",
      "autoprefixer": "^10.4.19",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.1.1",
      "postcss": "^8.4.38",
      "tailwind-merge": "^2.3.0",
      "tailwindcss": "^3.4.4",
      "tailwindcss-animate": "^1.0.7",
      "typescript": "^5.4.5",
      "vite": "^5.2.12"
    }
  }
  ```

- [ ] **Step 2: Instalar dependências**

  ```bash
  npm install
  ```

  Esperado: instalação sem erros, `node_modules` atualizado.

---

## Task 3: Scaffold apps/web — arquivos de configuração

**Files:**
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/index.html`

- [ ] **Step 1: Criar tsconfig.json**

  > Não estende o base — o frontend usa módulos ESNext e bundler resolution (incompatível com o commonjs do base).

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["src"]
  }
  ```

- [ ] **Step 2: Criar vite.config.ts**

  ```ts
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  })
  ```

- [ ] **Step 3: Criar postcss.config.js**

  ```js
  export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
  ```

- [ ] **Step 4: Criar index.html**

  ```html
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Fleet Manager</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

---

## Task 4: Configurar Tailwind CSS + shadcn/ui base

**Files:**
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/lib/utils.ts`

- [ ] **Step 1: Criar tailwind.config.ts**

  ```ts
  import type { Config } from 'tailwindcss'

  const config: Config = {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      extend: {
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        colors: {
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))',
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))',
          },
        },
      },
    },
    plugins: [require('tailwindcss-animate')],
  }

  export default config
  ```

- [ ] **Step 2: Criar src/index.css**

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --ring: 222.2 84% 4.9%;
      --radius: 0.5rem;
    }

    * {
      border-color: hsl(var(--border));
    }

    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
  }
  ```

- [ ] **Step 3: Criar src/lib/utils.ts**

  ```ts
  import { type ClassValue, clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

---

## Task 5: Configurar i18n

**Files:**
- Create: `apps/web/src/lib/i18n.ts`
- Create: `apps/web/src/locales/pt-BR.json`
- Create: `apps/web/src/locales/en-US.json`

- [ ] **Step 1: Criar src/lib/i18n.ts**

  ```ts
  import i18n from 'i18next'
  import { initReactI18next } from 'react-i18next'
  import ptBR from '../locales/pt-BR.json'
  import enUS from '../locales/en-US.json'

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        'pt-BR': { translation: ptBR },
        'en-US': { translation: enUS },
      },
      lng: localStorage.getItem('i18nextLng') ?? 'pt-BR',
      fallbackLng: 'pt-BR',
      interpolation: {
        escapeValue: false,
      },
    })

  export default i18n
  ```

- [ ] **Step 2: Criar src/locales/pt-BR.json**

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
    "lang.switch": "EN"
  }
  ```

- [ ] **Step 3: Criar src/locales/en-US.json**

  ```json
  {
    "app.name": "Fleet Manager",
    "nav.dashboard": "Dashboard",
    "nav.vehicles": "Vehicles",
    "nav.drivers": "Drivers",
    "nav.expenses": "Expenses",
    "nav.maintenances": "Maintenances",
    "nav.documents": "Documents",
    "nav.users": "Users",
    "nav.comingSoon": "Coming soon",
    "nav.logout": "Logout",
    "landing.title": "Fleet Manager",
    "landing.subtitle": "Smart fleet management",
    "landing.login": "Sign In",
    "dashboard.title": "Dashboard",
    "dashboard.vehicles": "Active vehicles",
    "dashboard.drivers": "Active drivers",
    "dashboard.expenses": "Expenses this month",
    "dashboard.maintenances": "Pending maintenances",
    "lang.switch": "PT"
  }
  ```

---

## Task 6: Criar ProtectedRoute

**Files:**
- Create: `apps/web/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Criar src/components/ProtectedRoute.tsx**

  ```tsx
  import { useAuth0 } from '@auth0/auth0-react'
  import { Navigate } from 'react-router-dom'

  interface ProtectedRouteProps {
    children: React.ReactNode
  }

  export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth0()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <span className="text-gray-500 text-sm">Carregando...</span>
        </div>
      )
    }

    if (!isAuthenticated) {
      return <Navigate to="/" replace />
    }

    return <>{children}</>
  }
  ```

---

## Task 7: Criar Landing Page

**Files:**
- Create: `apps/web/src/pages/Landing.tsx`

- [ ] **Step 1: Criar src/pages/Landing.tsx**

  ```tsx
  import { useAuth0 } from '@auth0/auth0-react'
  import { useTranslation } from 'react-i18next'

  export function Landing() {
    const { loginWithRedirect } = useAuth0()
    const { t } = useTranslation()

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-6 max-w-sm px-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-white text-2xl font-bold">FM</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{t('landing.title')}</h1>
            <p className="text-gray-500">{t('landing.subtitle')}</p>
          </div>
          <button
            onClick={() => loginWithRedirect()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('landing.login')}
          </button>
        </div>
      </div>
    )
  }
  ```

---

## Task 8: Criar Sidebar

**Files:**
- Create: `apps/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Criar src/components/Sidebar.tsx**

  ```tsx
  import { NavLink } from 'react-router-dom'
  import { useTranslation } from 'react-i18next'
  import { useAuth0 } from '@auth0/auth0-react'
  import {
    LayoutDashboard,
    Car,
    Users,
    Receipt,
    Wrench,
    FileText,
    UserCog,
    LogOut,
  } from 'lucide-react'
  import { cn } from '@/lib/utils'

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', enabled: true },
    { to: '/vehicles',  icon: Car,             labelKey: 'nav.vehicles',  enabled: false },
    { to: '/drivers',   icon: Users,           labelKey: 'nav.drivers',   enabled: false },
    { to: '/expenses',  icon: Receipt,         labelKey: 'nav.expenses',  enabled: false },
    { to: '/maintenances', icon: Wrench,       labelKey: 'nav.maintenances', enabled: false },
    { to: '/documents', icon: FileText,        labelKey: 'nav.documents', enabled: false },
    { to: '/users',     icon: UserCog,         labelKey: 'nav.users',     enabled: false },
  ]

  export function Sidebar() {
    const { t } = useTranslation()
    const { user, logout } = useAuth0()

    return (
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">FM</span>
            </div>
            <span className="font-bold text-gray-900">{t('app.name')}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, labelKey, enabled }) =>
            enabled ? (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )
                }
              >
                <Icon size={17} />
                {t(labelKey)}
              </NavLink>
            ) : (
              <div
                key={to}
                title={t('nav.comingSoon')}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed select-none"
              >
                <Icon size={17} />
                {t(labelKey)}
              </div>
            )
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name ?? ''}
                className="w-7 h-7 rounded-full shrink-0"
              />
            )}
            <span className="text-sm font-medium text-gray-700 truncate">
              {user?.name}
            </span>
          </div>
          <button
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut size={15} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>
    )
  }
  ```

---

## Task 9: Criar Header

**Files:**
- Create: `apps/web/src/components/Header.tsx`

- [ ] **Step 1: Criar src/components/Header.tsx**

  ```tsx
  import { useTranslation } from 'react-i18next'
  import { useLocation } from 'react-router-dom'

  const pageTitleKeys: Record<string, string> = {
    '/dashboard': 'dashboard.title',
  }

  export function Header() {
    const { t, i18n } = useTranslation()
    const { pathname } = useLocation()

    const toggleLanguage = () => {
      const next = i18n.language === 'pt-BR' ? 'en-US' : 'pt-BR'
      i18n.changeLanguage(next)
      localStorage.setItem('i18nextLng', next)
    }

    const titleKey = pageTitleKeys[pathname] ?? 'app.name'

    return (
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">{t(titleKey)}</h2>
        <button
          onClick={toggleLanguage}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1 transition-colors"
        >
          {t('lang.switch')}
        </button>
      </header>
    )
  }
  ```

---

## Task 10: Criar AppLayout

**Files:**
- Create: `apps/web/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Criar src/layouts/AppLayout.tsx**

  ```tsx
  import { Outlet } from 'react-router-dom'
  import { Sidebar } from '@/components/Sidebar'
  import { Header } from '@/components/Header'

  export function AppLayout() {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }
  ```

---

## Task 11: Criar mocks e Dashboard

**Files:**
- Create: `apps/web/src/mocks/dashboard.ts`
- Create: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Criar src/mocks/dashboard.ts**

  ```ts
  export const dashboardMocks = {
    vehicles: 12,
    drivers: 8,
    expensesThisMonth: 4200,
    pendingMaintenances: 3,
  } as const
  ```

- [ ] **Step 2: Criar src/pages/Dashboard.tsx**

  ```tsx
  import { useTranslation } from 'react-i18next'
  import { Car, Users, Receipt, Wrench } from 'lucide-react'
  import { dashboardMocks } from '@/mocks/dashboard'

  interface SummaryCardProps {
    icon: React.ReactNode
    label: string
    value: string
  }

  function SummaryCard({ icon, label, value }: SummaryCardProps) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center gap-4">
        <div className="text-blue-600 shrink-0">{icon}</div>
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    )
  }

  export function Dashboard() {
    const { t } = useTranslation()

    const cards = [
      {
        icon: <Car size={28} />,
        label: t('dashboard.vehicles'),
        value: String(dashboardMocks.vehicles),
      },
      {
        icon: <Users size={28} />,
        label: t('dashboard.drivers'),
        value: String(dashboardMocks.drivers),
      },
      {
        icon: <Receipt size={28} />,
        label: t('dashboard.expenses'),
        value: `R$ ${dashboardMocks.expensesThisMonth.toLocaleString('pt-BR')}`,
      },
      {
        icon: <Wrench size={28} />,
        label: t('dashboard.maintenances'),
        value: String(dashboardMocks.pendingMaintenances),
      },
    ]

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
    )
  }
  ```

---

## Task 12: Configurar rotas (App.tsx) e entrypoint (main.tsx)

**Files:**
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/main.tsx`

- [ ] **Step 1: Criar src/App.tsx**

  ```tsx
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
  import { AppLayout } from '@/layouts/AppLayout'
  import { Landing } from '@/pages/Landing'
  import { Dashboard } from '@/pages/Dashboard'
  import { ProtectedRoute } from '@/components/ProtectedRoute'

  export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }
  ```

- [ ] **Step 2: Criar src/main.tsx**

  ```tsx
  import React from 'react'
  import ReactDOM from 'react-dom/client'
  import { Auth0Provider } from '@auth0/auth0-react'
  import './lib/i18n'
  import './index.css'
  import App from './App'

  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI as string

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: redirectUri,
          audience,
        }}
      >
        <App />
      </Auth0Provider>
    </React.StrictMode>,
  )
  ```

---

## Task 13: Criar .env e .env.example do frontend

**Files:**
- Create: `apps/web/.env` (não commitado)
- Create: `apps/web/.env.example` (commitado)

- [ ] **Step 1: Criar apps/web/.env**

  Substituir `<CLIENT_ID>` pelo valor copiado na Task 1 Step 4.

  ```
  VITE_AUTH0_DOMAIN=dev-ul8bdg6vfdrtwzgo.us.auth0.com
  VITE_AUTH0_CLIENT_ID=<CLIENT_ID>
  VITE_AUTH0_AUDIENCE=https://api.fleet-manager.com
  VITE_AUTH0_REDIRECT_URI=http://localhost:5173/dashboard
  ```

- [ ] **Step 2: Criar apps/web/.env.example**

  ```
  VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
  VITE_AUTH0_CLIENT_ID=your-client-id
  VITE_AUTH0_AUDIENCE=https://api.fleet-manager.com
  VITE_AUTH0_REDIRECT_URI=http://localhost:5173/dashboard
  ```

- [ ] **Step 3: Verificar que apps/web/.env está no .gitignore**

  Abrir o `.gitignore` da raiz e confirmar que há uma linha `.env` ou `**/.env`. Se não houver, adicionar:
  ```
  apps/web/.env
  ```

---

## Task 14: Adicionar scripts ao monorepo e rodar o servidor

**Files:**
- Modify: `package.json` (raiz)

- [ ] **Step 1: Adicionar script dev:web ao package.json da raiz**

  Adicionar dentro de `"scripts"`:
  ```json
  "dev:web": "npm run dev --workspace=apps/web"
  ```

  O bloco scripts completo ficará:
  ```json
  "scripts": {
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:web": "npm run dev --workspace=apps/web",
    "build:api": "npm run build --workspace=apps/api",
    "test": "npm run test --workspaces --if-present",
    "test:api": "npm run test --workspace=apps/api",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  }
  ```

- [ ] **Step 2: Rodar o servidor de desenvolvimento**

  ```bash
  npm run dev:web
  ```

  Esperado:
  ```
  VITE v5.x.x  ready in Xms
  ➜  Local:   http://localhost:5173/
  ```

---

## Task 15: Commit

**Files:** todos os arquivos criados nas tasks anteriores

- [ ] **Step 1: Verificar o que será commitado**

  ```bash
  git status
  ```

- [ ] **Step 2: Fazer o commit**

  ```bash
  git add apps/web/ docs/
  git commit -m "feat(web): scaffold Sprint 1 — Auth0, i18n, Dashboard mockado"
  ```

---

## Task 16: Verificação manual

- [ ] Abrir `http://localhost:5173` — aparece a Landing com botão "Entrar"
- [ ] Clicar em "Entrar" — redireciona para o login do Auth0
- [ ] Fazer login — redireciona para `http://localhost:5173/dashboard`
- [ ] Dashboard exibe 4 cards: Veículos (12), Motoristas (8), Despesas (R$ 4.200), Manutenções (3)
- [ ] Itens da sidebar (Veículos, Motoristas, etc.) aparecem em cinza e não são clicáveis
- [ ] Hover nos itens desabilitados exibe tooltip "Disponível em breve"
- [ ] Clicar no toggle `EN` no header — todos os textos mudam para inglês
- [ ] Recarregar a página — idioma inglês persiste
- [ ] Clicar em `PT` — volta para português
- [ ] Tentar acessar `http://localhost:5173/dashboard` sem login — redireciona para `/`
- [ ] Clicar em "Sair" — volta para a Landing
- [ ] **Atualizar CLAUDE.md:** marcar `[x]` nos itens `#21`, `#22`, `#23` do backlog

---

## Task 17: Atualizar CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Marcar Sprint 1 como concluída no CLAUDE.md**

  Na seção `📋 Backlog por Sprint → Sprint 1`, marcar:
  ```markdown
  - [x] [#21] Integrar Auth0 SDK ao frontend
  - [x] [#22] Implementar i18n pt-BR / en-US
  - [x] [#23] Implementar tela de Dashboard (dados mockados)
  ```

- [ ] **Step 2: Adicionar entradas no Histórico de Implementação**

  ```markdown
  | 2026-04-15 | Claude | Sprint 1: Scaffold React + Vite + Tailwind + shadcn/ui | Estrutura completa do frontend criada |
  | 2026-04-15 | Claude | Sprint 1: Auth0 SDK integrado | Landing page, ProtectedRoute, Auth0Provider |
  | 2026-04-15 | Claude | Sprint 1: i18n pt-BR / en-US | react-i18next, toggle no header, persistência em localStorage |
  | 2026-04-15 | Claude | Sprint 1: Dashboard mockado | 4 cards de resumo com dados em src/mocks/dashboard.ts |
  ```

- [ ] **Step 3: Atualizar a data de "Última atualização"**

  ```markdown
  > **Última atualização:** 2026-04-15 (Sprint 1 completa)
  ```
