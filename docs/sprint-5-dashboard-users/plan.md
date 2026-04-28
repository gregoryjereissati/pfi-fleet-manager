# Sprint 5 — Dashboard Real, Usuários e Testes

---

## 🤖 Para o Codex — Leia antes de qualquer coisa

Você foi aberto para implementar a **Sprint 5 do Fleet Manager**. Este documento é o seu plano completo de implementação. Siga as tasks na ordem, uma por vez.

**Contexto do projeto:**
- Monorepo npm workspaces: `apps/api` (Express + Prisma + TypeScript) e `apps/web` (React + Vite + TypeScript)
- Banco de dados PostgreSQL via Docker — já está rodando
- Autenticação Auth0 com JWT — já implementada
- Arquitetura do backend: Controller → Service → Repository (padrão Layered)
- Testes com Vitest — padrão TDD com mocks de repository
- Leia `CLAUDE.md` na raiz para entender o estado completo do projeto

**Como executar:**
```bash
# Rodar testes da API
npm run test:api

# Verificar TypeScript da API
cd apps/api && npx tsc --noEmit

# Verificar TypeScript do frontend
cd apps/web && npx tsc --noEmit

# Build do frontend
cd apps/web && npm run build
```

**Regras inegociáveis:**
1. Implemente task por task, na ordem numerada
2. Em cada task com TDD: escreva o teste primeiro, rode para confirmar que falha, depois implemente
3. Faça commit ao final de cada task (mensagens no padrão `feat(api):` / `feat(web):`)
4. Após concluir todas as tasks, marque os checkboxes no CLAUDE.md (seção Sprint 5 do Backlog)

---

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Execute task-by-task in order.

**Goal:** Conectar o Dashboard a dados reais com gráficos Recharts, implementar gerenciamento de usuários (ADMIN), e finalizar testes do backend.

**Architecture:** O backend ganha um novo módulo `dashboard` (repository → service → controller → route) expondo `GET /api/dashboard/indicators`. O frontend usa o hook `useDashboard` para buscar os indicadores e renderiza BarChart + PieChart via Recharts. A página `/users` usa o endpoint `GET /api/users` já existente (ADMIN-only).

**Tech Stack:** Express + Prisma (backend), React + Recharts + react-i18next (frontend), Vitest (testes).

---

## Mapa de Arquivos

### Criar
- `apps/api/src/repositories/dashboard.repository.ts` — queries Prisma para KPIs
- `apps/api/src/services/dashboard.service.ts` — orquestra as 3 queries
- `apps/api/src/services/__tests__/dashboard.service.test.ts` — 2 testes (TDD)
- `apps/api/src/controllers/dashboard.controller.ts` — recebe req, chama service
- `apps/api/src/routes/dashboard.routes.ts` — `GET /indicators` com authenticate
- `apps/web/src/hooks/useDashboard.ts` — fetch `/api/dashboard/indicators`
- `apps/web/src/hooks/useUsers.ts` — fetch `/api/users` + updateRole
- `apps/web/src/pages/UserList.tsx` — tabela de usuários com edição inline de role

### Modificar
- `apps/api/src/routes/index.ts` — registrar dashboardRouter em `/dashboard`
- `apps/web/src/App.tsx` — adicionar rota `/users`
- `apps/web/src/components/Sidebar.tsx` — habilitar link Users para ADMIN
- `apps/web/src/pages/Dashboard.tsx` — substituir mocks por dados reais + Recharts
- `apps/web/src/locales/pt-BR.json` — chaves de users + dashboard (gráficos)
- `apps/web/src/locales/en-US.json` — mesmas chaves em inglês

---

## Task 1: Dashboard Repository

**Files:**
- Create: `apps/api/src/repositories/dashboard.repository.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// apps/api/src/repositories/dashboard.repository.ts
import { VehicleStatus, DriverStatus, MaintenanceStatus } from '@prisma/client';
import { prisma } from '../config/database';

export const dashboardRepository = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      expensesAgg,
      pendingMaintenances,
      expiringDocuments,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: VehicleStatus.ACTIVE } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: DriverStatus.ACTIVE } }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: startOfMonth } },
      }),
      prisma.maintenance.count({ where: { status: MaintenanceStatus.SCHEDULED } }),
      prisma.document.count({ where: { expiryDate: { lte: in30Days } } }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      expensesThisMonth: Number(expensesAgg._sum.amount ?? 0),
      pendingMaintenances,
      expiringDocuments,
    };
  },

  async getExpensesByMonth(months = 6) {
    const now = new Date();
    const results: { month: string; total: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const agg = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: start, lt: end } },
      });
      results.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        total: Number(agg._sum.amount ?? 0),
      });
    }

    return results;
  },

  async getExpensesByType() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const groups = await prisma.expense.groupBy({
      by: ['type'],
      where: { date: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    return groups.map((g) => ({
      type: g.type,
      total: Number(g._sum.amount ?? 0),
    }));
  },
};
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd "apps/api" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/repositories/dashboard.repository.ts
git commit -m "feat(api): add dashboard repository with KPI queries"
```

---

## Task 2: Dashboard Service (TDD)

**Files:**
- Create: `apps/api/src/services/__tests__/dashboard.service.test.ts`
- Create: `apps/api/src/services/dashboard.service.ts`

- [ ] **Step 1: Escrever o teste (vermelho)**

```typescript
// apps/api/src/services/__tests__/dashboard.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardService } from '../dashboard.service';
import { dashboardRepository } from '../../repositories/dashboard.repository';

vi.mock('../../repositories/dashboard.repository', () => ({
  dashboardRepository: {
    getSummary: vi.fn(),
    getExpensesByMonth: vi.fn(),
    getExpensesByType: vi.fn(),
  },
}));

const mockSummary = {
  totalVehicles: 5,
  activeVehicles: 3,
  totalDrivers: 4,
  activeDrivers: 4,
  expensesThisMonth: 1500,
  pendingMaintenances: 2,
  expiringDocuments: 1,
};

const mockMonthly = [
  { month: '2025-11', total: 900 },
  { month: '2025-12', total: 1100 },
  { month: '2026-01', total: 800 },
  { month: '2026-02', total: 600 },
  { month: '2026-03', total: 1200 },
  { month: '2026-04', total: 1500 },
];

const mockByType = [
  { type: 'FUEL', total: 800 },
  { type: 'MAINTENANCE', total: 700 },
];

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIndicators', () => {
    it('returns summary, expensesByMonth, and expensesByType', async () => {
      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(mockSummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue(mockMonthly);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue(mockByType);

      const result = await dashboardService.getIndicators();

      expect(result.summary).toEqual(mockSummary);
      expect(result.expensesByMonth).toEqual(mockMonthly);
      expect(result.expensesByType).toEqual(mockByType);
      expect(dashboardRepository.getExpensesByMonth).toHaveBeenCalledWith(6);
    });

    it('returns zero values when no data exists', async () => {
      const emptySummary = {
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        expensesThisMonth: 0,
        pendingMaintenances: 0,
        expiringDocuments: 0,
      };
      vi.mocked(dashboardRepository.getSummary).mockResolvedValue(emptySummary);
      vi.mocked(dashboardRepository.getExpensesByMonth).mockResolvedValue([]);
      vi.mocked(dashboardRepository.getExpensesByType).mockResolvedValue([]);

      const result = await dashboardService.getIndicators();

      expect(result.summary.totalVehicles).toBe(0);
      expect(result.expensesByMonth).toHaveLength(0);
      expect(result.expensesByType).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Rodar o teste — esperar FALHA**

Run: `cd "apps/api" && npx vitest run src/services/__tests__/dashboard.service.test.ts`
Expected: FAIL — "Cannot find module '../dashboard.service'"

- [ ] **Step 3: Implementar o service**

```typescript
// apps/api/src/services/dashboard.service.ts
import { dashboardRepository } from '../repositories/dashboard.repository';

export const dashboardService = {
  async getIndicators() {
    const [summary, expensesByMonth, expensesByType] = await Promise.all([
      dashboardRepository.getSummary(),
      dashboardRepository.getExpensesByMonth(6),
      dashboardRepository.getExpensesByType(),
    ]);
    return { summary, expensesByMonth, expensesByType };
  },
};
```

- [ ] **Step 4: Rodar o teste — esperar VERDE**

Run: `cd "apps/api" && npx vitest run src/services/__tests__/dashboard.service.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Rodar todos os testes**

Run: `cd "apps/api" && npx vitest run`
Expected: todos os testes anteriores continuam passando.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/dashboard.service.ts apps/api/src/services/__tests__/dashboard.service.test.ts
git commit -m "feat(api): add dashboard service with TDD (2 tests)"
```

---

## Task 3: Dashboard Controller, Routes e Registro

**Files:**
- Create: `apps/api/src/controllers/dashboard.controller.ts`
- Create: `apps/api/src/routes/dashboard.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar o controller**

```typescript
// apps/api/src/controllers/dashboard.controller.ts
import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  async getIndicators(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await dashboardService.getIndicators();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 2: Criar as rotas**

```typescript
// apps/api/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/indicators', dashboardController.getIndicators);
```

- [ ] **Step 3: Registrar no router principal**

Abrir `apps/api/src/routes/index.ts` e substituir pelo seguinte:

```typescript
// apps/api/src/routes/index.ts
import { Router } from 'express';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';
import { driverRouter } from './driver.routes';
import { expenseRouter } from './expense.routes';
import { maintenanceRouter } from './maintenance.routes';
import { documentRouter } from './document.routes';
import { dashboardRouter } from './dashboard.routes';

export const router = Router();

router.use('/users', userRouter);
router.use('/vehicles', vehicleRouter);
router.use('/drivers', driverRouter);
router.use('/expenses', expenseRouter);
router.use('/maintenances', maintenanceRouter);
router.use('/documents', documentRouter);
router.use('/dashboard', dashboardRouter);
```

- [ ] **Step 4: Verificar TypeScript e testes**

Run: `cd "apps/api" && npx tsc --noEmit && npx vitest run`
Expected: sem erros de tipos; todos os testes passando.

- [ ] **Step 5: Testar o endpoint manualmente**

Certifique-se de que o servidor está rodando (`npm run dev:api`), depois:

```bash
# Obter um token real do Auth0 e testar o endpoint
curl -s http://localhost:3000/api/dashboard/indicators \
  -H "Authorization: Bearer <TOKEN>" | npx json
```

Expected: JSON com `summary`, `expensesByMonth`, `expensesByType`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/dashboard.controller.ts \
        apps/api/src/routes/dashboard.routes.ts \
        apps/api/src/routes/index.ts
git commit -m "feat(api): add dashboard indicators endpoint GET /api/dashboard/indicators"
```

---

## Task 4: useUsers Hook + UserList Page

**Files:**
- Create: `apps/web/src/hooks/useUsers.ts`
- Create: `apps/web/src/pages/UserList.tsx`

- [ ] **Step 1: Criar o hook useUsers**

```typescript
// apps/web/src/hooks/useUsers.ts
import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR'
  createdAt: string
}

export function useUsers() {
  const getToken = useToken()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const data = await apiFetch<User[]>('/users', token)
      setUsers(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const updateRole = useCallback(
    async (id: string, role: string) => {
      setSavingId(id)
      try {
        const token = await getToken()
        await apiFetch(`/users/${id}/role`, token, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        })
        await load()
      } finally {
        setSavingId(null)
      }
    },
    [getToken, load],
  )

  useEffect(() => {
    void load()
  }, [load])

  return { users, loading, error, savingId, updateRole }
}
```

- [ ] **Step 2: Criar a página UserList**

```tsx
// apps/web/src/pages/UserList.tsx
import { useTranslation } from 'react-i18next'
import { useUsers } from '@/hooks/useUsers'

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR'] as const

export function UserList() {
  const { t } = useTranslation()
  const { users, loading, error, savingId, updateRole } = useUsers()

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('users.title')}</h1>
        <p className="text-sm text-gray-500">{t('users.subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">{t('users.columns.name')}</th>
              <th className="px-4 py-3">{t('users.columns.email')}</th>
              <th className="px-4 py-3">{t('users.columns.role')}</th>
              <th className="px-4 py-3">{t('users.columns.createdAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={savingId === user.id}
                    onChange={(e) => void updateRole(user.id, e.target.value)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`users.roles.${r}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            {t('users.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript do frontend**

Run: `cd "apps/web" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useUsers.ts apps/web/src/pages/UserList.tsx
git commit -m "feat(web): add useUsers hook and UserList page"
```

---

## Task 5: Rota /users, Sidebar e i18n

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/Sidebar.tsx`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`

- [ ] **Step 1: Adicionar rota /users no App.tsx**

Em `apps/web/src/App.tsx`, adicionar o import e a rota. As linhas finais do bloco de imports ficam:

```typescript
// adicionar este import junto com os outros de pages
import { UserList } from '@/pages/UserList'
```

Dentro do bloco de rotas protegidas, adicionar após a rota `/alerts`:

```tsx
<Route path="/users" element={<UserList />} />
```

- [ ] **Step 2: Habilitar link Users no Sidebar para ADMIN**

Substituir o conteúdo de `apps/web/src/components/Sidebar.tsx` pelo seguinte:

```tsx
// apps/web/src/components/Sidebar.tsx
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
  Bell,
  UserCog,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlertCount } from '@/hooks/useAlertCount'
import { getUserRole } from '@/lib/roles'

export function Sidebar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth0()
  const { count: alertCount } = useAlertCount()
  const isAdmin = getUserRole(user) === 'ADMIN'

  const navItems = [
    { to: '/dashboard',    icon: LayoutDashboard, labelKey: 'nav.dashboard',    enabled: true    },
    { to: '/vehicles',     icon: Car,             labelKey: 'nav.vehicles',     enabled: true    },
    { to: '/drivers',      icon: Users,           labelKey: 'nav.drivers',      enabled: true    },
    { to: '/expenses',     icon: Receipt,         labelKey: 'nav.expenses',     enabled: true    },
    { to: '/maintenances', icon: Wrench,          labelKey: 'nav.maintenances', enabled: true    },
    { to: '/documents',    icon: FileText,        labelKey: 'nav.documents',    enabled: true    },
    { to: '/alerts',       icon: Bell,            labelKey: 'nav.alerts',       enabled: true    },
    { to: '/users',        icon: UserCog,         labelKey: 'nav.users',        enabled: isAdmin },
  ]

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
                    : 'text-gray-700 hover:bg-gray-100',
                )
              }
            >
              <Icon size={17} />
              <span className="flex-1">{t(labelKey)}</span>
              {(to === '/documents' || to === '/alerts') && alertCount > 0 && (
                <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                  {alertCount}
                </span>
              )}
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
          ),
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

- [ ] **Step 3: Adicionar chaves i18n — pt-BR**

No arquivo `apps/web/src/locales/pt-BR.json`, adicionar as seguintes chaves antes do `}` final:

```json
  "users.title": "Usuarios",
  "users.subtitle": "Gerenciamento de usuarios e permissoes.",
  "users.empty": "Nenhum usuario encontrado.",
  "users.columns.name": "Nome",
  "users.columns.email": "E-mail",
  "users.columns.role": "Funcao",
  "users.columns.createdAt": "Cadastrado em",
  "users.roles.ADMIN": "Administrador",
  "users.roles.MANAGER": "Gerente",
  "users.roles.OPERATOR": "Operador",
  "dashboard.expiringDocuments": "Documentos vencendo",
  "dashboard.expensesByMonth": "Despesas por mes (ultimos 6 meses)",
  "dashboard.expensesByType": "Despesas por tipo (mes atual)",
  "dashboard.noData": "Sem dados para exibir"
```

- [ ] **Step 4: Adicionar chaves i18n — en-US**

No arquivo `apps/web/src/locales/en-US.json`, adicionar antes do `}` final:

```json
  "users.title": "Users",
  "users.subtitle": "User and permission management.",
  "users.empty": "No users found.",
  "users.columns.name": "Name",
  "users.columns.email": "Email",
  "users.columns.role": "Role",
  "users.columns.createdAt": "Created at",
  "users.roles.ADMIN": "Administrator",
  "users.roles.MANAGER": "Manager",
  "users.roles.OPERATOR": "Operator",
  "dashboard.expiringDocuments": "Expiring documents",
  "dashboard.expensesByMonth": "Expenses by month (last 6 months)",
  "dashboard.expensesByType": "Expenses by type (current month)",
  "dashboard.noData": "No data to display"
```

- [ ] **Step 5: Verificar TypeScript**

Run: `cd "apps/web" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx \
        apps/web/src/components/Sidebar.tsx \
        apps/web/src/locales/pt-BR.json \
        apps/web/src/locales/en-US.json
git commit -m "feat(web): add /users route, enable Users link for ADMIN, update i18n"
```

---

## Task 6: Instalar Recharts + useDashboard Hook

**Files:**
- Modify: `apps/web/package.json` (via npm install)
- Create: `apps/web/src/hooks/useDashboard.ts`

- [ ] **Step 1: Instalar recharts no workspace web**

Run: `npm install recharts --workspace=@fleet-manager/web`
Expected: `recharts` aparece em `apps/web/package.json` > `dependencies`.

- [ ] **Step 2: Criar o hook useDashboard**

```typescript
// apps/web/src/hooks/useDashboard.ts
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

interface DashboardSummary {
  totalVehicles: number
  activeVehicles: number
  totalDrivers: number
  activeDrivers: number
  expensesThisMonth: number
  pendingMaintenances: number
  expiringDocuments: number
}

interface MonthlyExpense {
  month: string
  total: number
}

interface TypeExpense {
  type: string
  total: number
}

export interface DashboardData {
  summary: DashboardSummary
  expensesByMonth: MonthlyExpense[]
  expensesByType: TypeExpense[]
}

export function useDashboard() {
  const getToken = useToken()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        const result = await apiFetch<DashboardData>('/dashboard/indicators', token)
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [getToken])

  return { data, loading, error }
}
```

- [ ] **Step 3: Verificar TypeScript**

Run: `cd "apps/web" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/src/hooks/useDashboard.ts
git commit -m "feat(web): install recharts and add useDashboard hook"
```

---

## Task 7: Conectar Dashboard a Dados Reais com Gráficos

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Substituir o conteúdo de Dashboard.tsx**

```tsx
// apps/web/src/pages/Dashboard.tsx
import { useTranslation } from 'react-i18next'
import { Car, Users, Receipt, Wrench, FileText } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useDashboard } from '@/hooks/useDashboard'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

const TYPE_LABELS: Record<string, string> = {
  FUEL: 'Combustível',
  MAINTENANCE: 'Manutenção',
  FINE: 'Multa',
  IPVA: 'IPVA',
  INSURANCE: 'Seguro',
  OTHER: 'Outro',
}

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

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export function Dashboard() {
  const { t } = useTranslation()
  const { data, loading, error } = useDashboard()

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error || !data)
    return <p className="text-red-500">Erro ao carregar dashboard.</p>

  const { summary, expensesByMonth, expensesByType } = data

  const cards = [
    {
      icon: <Car size={28} />,
      label: t('dashboard.vehicles'),
      value: String(summary.activeVehicles),
    },
    {
      icon: <Users size={28} />,
      label: t('dashboard.drivers'),
      value: String(summary.activeDrivers),
    },
    {
      icon: <Receipt size={28} />,
      label: t('dashboard.expenses'),
      value: formatBRL(summary.expensesThisMonth),
    },
    {
      icon: <Wrench size={28} />,
      label: t('dashboard.maintenances'),
      value: String(summary.pendingMaintenances),
    },
    {
      icon: <FileText size={28} />,
      label: t('dashboard.expiringDocuments'),
      value: String(summary.expiringDocuments),
    },
  ]

  const monthlyData = expensesByMonth.map(({ month, total }) => {
    const [year, m] = month.split('-')
    return { month: `${MONTH_ABBR[m] ?? m}/${year.slice(2)}`, total }
  })

  const typeData = expensesByType.map(({ type, total }) => ({
    name: TYPE_LABELS[type] ?? type,
    value: total,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {t('dashboard.expensesByMonth')}
          </h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyData}
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [formatBRL(v), t('dashboard.expenses')]}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {t('dashboard.expensesByType')}
          </h2>
          {typeData.length === 0 ? (
            <p className="text-sm text-gray-400">{t('dashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {typeData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd "apps/web" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Build de produção**

Run: `cd "apps/web" && npm run build`
Expected: Build succeeded sem erros.

- [ ] **Step 4: Validação visual no browser**

Iniciar o servidor e o frontend:
```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:web  # ou cd apps/web && npm run dev
```

Acessar `http://localhost:5173/dashboard` e verificar:
- 5 cards com dados reais (não zeros estranhos)
- BarChart com barras por mês (pode estar vazio se não há despesas registradas)
- PieChart com fatias por tipo (pode estar vazio se não há despesas este mês)
- Sidebar mostra link "Usuários" habilitado para o usuário ADMIN
- Página `/users` lista o usuário admin com dropdown de role funcional

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat(web): connect dashboard to real API with Recharts bar and pie charts"
```

---

## Task 8: Atualizar CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar a seção "Estado Atual"**

Marcar todos os itens da Sprint 5 como concluídos:

```markdown
#### Sprint 5 — Dashboard Real, Usuários e Testes (issues: #6, #38–#40) — COMPLETA
- [x] [#6] Endpoints de indicadores financeiros (backend)
- [x] [#38] Tela de gerenciamento de usuários (ADMIN)
- [x] Conectar Dashboard ao backend real (Recharts)
- [x] [#39] Testes unitários do backend
- [x] [#40] Validação do MVP com dados reais
```

Atualizar a data "Última atualização" para 2026-04-23.

Adicionar no Histórico de Implementação:

```
| 2026-04-23 | Claude | Sprint 5: API de indicadores | dashboard.repository + dashboard.service (TDD, 2 testes) + controller + GET /api/dashboard/indicators |
| 2026-04-23 | Claude | Sprint 5: Gerenciamento de usuários | useUsers hook + UserList page com edição inline de role |
| 2026-04-23 | Claude | Sprint 5: Dashboard real com Recharts | useDashboard hook, BarChart de despesas por mês, PieChart por tipo, 5 cards com dados reais |
```

- [ ] **Step 2: Commit final**

```bash
git add CLAUDE.md
git commit -m "docs: mark Sprint 5 as complete in CLAUDE.md"
```

---

## Checklist de Validação Final

Antes de considerar a Sprint 5 concluída, verificar:

- [ ] `npm run test:api` — todos os testes passando (inclui 2 novos de dashboard)
- [ ] `GET /api/dashboard/indicators` — retorna JSON válido com token de autenticação
- [ ] Dashboard mostra dados reais (não mock `dashboardMocks`)
- [ ] Gráficos aparecem no browser (BarChart e PieChart)
- [ ] Usuário ADMIN vê o link "Usuários" habilitado no Sidebar
- [ ] Usuário MANAGER/OPERATOR não vê o link "Usuários" habilitado
- [ ] Página `/users` lista usuários e permite trocar role via dropdown
- [ ] `tsc --noEmit` passa sem erros em `apps/api` e `apps/web`
- [ ] `npm run build` no frontend passa sem erros
