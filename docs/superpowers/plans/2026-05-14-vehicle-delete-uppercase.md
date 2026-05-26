# Vehicle Delete + Uppercase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar exclusão permanente de veículos (cascade) e normalizar texto para maiúsculas em placa, marca, modelo e cor.

**Architecture:** Novo endpoint `DELETE /vehicles/:id/permanent` para hard delete via `prisma.vehicle.delete()` (cascade já configurado no schema). Frontend exibe ambos os botões "Desativar" e "Excluir". Normalização de uppercase no submit do VehicleForm e ao digitar.

**Tech Stack:** Node.js/Express/Prisma (backend), React/TypeScript/react-i18next (frontend), Vitest (testes)

**Status 2026-05-14:** Implementacao e verificacoes concluidas, incluindo reativacao de veiculos inativos e modal proprio para confirmacoes da listagem. Steps de commit ficaram pendentes porque a worktree ja tinha alteracoes preexistentes fora do escopo.

---

## File Map

| Arquivo | O que muda |
|---|---|
| `apps/api/src/repositories/vehicle.repository.ts` | Adiciona método `hardDelete(id)` |
| `apps/api/src/services/vehicle.service.ts` | Adiciona método `hardDeleteVehicle(id)` |
| `apps/api/src/controllers/vehicle.controller.ts` | Adiciona método `permanentDelete` |
| `apps/api/src/routes/vehicle.routes.ts` | Adiciona rota `DELETE /:id/permanent` |
| `apps/api/src/services/__tests__/vehicle.service.test.ts` | Adiciona teste para `hardDeleteVehicle` |
| `apps/web/src/locales/pt-BR.json` | Adiciona chaves `actions.delete` e `vehicles.deleteConfirm` |
| `apps/web/src/locales/en-US.json` | Adiciona chaves `actions.delete` e `vehicles.deleteConfirm` |
| `apps/web/src/pages/VehicleList.tsx` | Adiciona `handlePermanentDelete`, mostra ambos os botões |
| `apps/web/src/pages/VehicleForm.tsx` | Normaliza uppercase no `updateField` e no payload do submit |

---

### Task 1: Backend — hardDelete no repository

**Files:**
- Modify: `apps/api/src/repositories/vehicle.repository.ts`

- [x] **Step 1: Adicionar o método `hardDelete` ao repository**

Abrir `apps/api/src/repositories/vehicle.repository.ts` e adicionar logo após o método `setInactive`:

```typescript
  hardDelete(id: string) {
    return prisma.vehicle.delete({ where: { id } });
  },
```

O schema já tem `onDelete: Cascade` em Expense, Maintenance e Document — o Prisma vai deletar todos os registros vinculados automaticamente. A relação many-to-many com Driver usa tabela implícita `_VehicleDrivers` e também é limpa pelo Prisma.

- [x] **Step 2: Verificar tipo sem compilar**

```powershell
cd apps/api && npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/repositories/vehicle.repository.ts
git commit -m "feat(api): add hardDelete method to vehicle repository"
```

---

### Task 2: Backend — hardDeleteVehicle no service

**Files:**
- Modify: `apps/api/src/services/vehicle.service.ts`

- [x] **Step 1: Adicionar o método `hardDeleteVehicle` ao service**

Abrir `apps/api/src/services/vehicle.service.ts` e adicionar após o método `deleteVehicle`:

```typescript
  async hardDeleteVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.hardDelete(id);
  },
```

- [x] **Step 2: Verificar tipo**

```powershell
cd apps/api && npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/vehicle.service.ts
git commit -m "feat(api): add hardDeleteVehicle to vehicle service"
```

---

### Task 3: Backend — controller + rota

**Files:**
- Modify: `apps/api/src/controllers/vehicle.controller.ts`
- Modify: `apps/api/src/routes/vehicle.routes.ts`

- [x] **Step 1: Adicionar método `permanentDelete` ao controller**

Em `apps/api/src/controllers/vehicle.controller.ts`, adicionar após o método `delete`:

```typescript
  async permanentDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await vehicleService.hardDeleteVehicle(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
```

- [x] **Step 2: Adicionar rota `DELETE /:id/permanent`**

Em `apps/api/src/routes/vehicle.routes.ts`, adicionar após a rota `vehicleRouter.delete('/:id', ...)`:

```typescript
vehicleRouter.delete(
  '/:id/permanent',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  vehicleController.permanentDelete,
);
```

**Atenção:** esta rota deve ser registrada ANTES da rota `/:vehicleId/drivers/:driverId` para não haver conflito de matching.

- [x] **Step 3: Verificar tipo**

```powershell
cd apps/api && npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/controllers/vehicle.controller.ts apps/api/src/routes/vehicle.routes.ts
git commit -m "feat(api): add DELETE /vehicles/:id/permanent endpoint"
```

---

### Task 4: Backend — teste para hardDeleteVehicle

**Files:**
- Modify: `apps/api/src/services/__tests__/vehicle.service.test.ts`

- [x] **Step 1: Ler o arquivo de testes existente para entender o padrão de mocks**

Abrir `apps/api/src/services/__tests__/vehicle.service.test.ts` e verificar como `vehicleRepository` é mockado (vi.mock + vi.mocked).

- [x] **Step 2: Adicionar o teste de hardDeleteVehicle**

Localizar o bloco `describe` de `deleteVehicle` (ou o fim do arquivo de testes) e adicionar:

```typescript
describe('hardDeleteVehicle', () => {
  it('should permanently delete a vehicle and return it', async () => {
    const vehicle = { id: '1', plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2022, color: 'Prata', status: VehicleStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), expenses: [], maintenances: [], documents: [], drivers: [] };
    vi.mocked(vehicleRepository.findById).mockResolvedValue(vehicle as any);
    vi.mocked(vehicleRepository.hardDelete).mockResolvedValue(vehicle as any);

    const result = await vehicleService.hardDeleteVehicle('1');

    expect(vehicleRepository.findById).toHaveBeenCalledWith('1');
    expect(vehicleRepository.hardDelete).toHaveBeenCalledWith('1');
    expect(result).toEqual(vehicle);
  });

  it('should throw 404 if vehicle not found', async () => {
    vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

    await expect(vehicleService.hardDeleteVehicle('999')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
```

- [x] **Step 3: Rodar o teste para verificar que passa**

```powershell
cd apps/api && npm run test -- --reporter=verbose
```

Esperado: todos os testes passando, incluindo os dois novos de `hardDeleteVehicle`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/__tests__/vehicle.service.test.ts
git commit -m "test(api): add hardDeleteVehicle tests"
```

---

### Task 5: Frontend — chaves i18n

**Files:**
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`

- [x] **Step 1: Adicionar chaves em pt-BR.json**

No arquivo `apps/web/src/locales/pt-BR.json`, adicionar junto às outras chaves de `actions` e `vehicles`:

```json
"actions.delete": "Excluir",
"actions.reactivate": "Reativar",
```

```json
"vehicles.deleteConfirm": "Excluir este veiculo permanentemente? Esta acao remove o veiculo e todos os dados vinculados (despesas, manutencoes, documentos) e nao pode ser desfeita.",
"vehicles.reactivateConfirm": "Reativar este veiculo?",
```

- [x] **Step 2: Adicionar chaves em en-US.json**

No arquivo `apps/web/src/locales/en-US.json`, adicionar as mesmas chaves:

```json
"actions.delete": "Delete",
"actions.reactivate": "Reactivate",
```

```json
"vehicles.deleteConfirm": "Permanently delete this vehicle? This removes the vehicle and all linked data (expenses, maintenances, documents) and cannot be undone.",
"vehicles.reactivateConfirm": "Reactivate this vehicle?",
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/locales/pt-BR.json apps/web/src/locales/en-US.json
git commit -m "feat(web): add i18n keys for vehicle delete and reactivate"
```

---

### Task 6: Frontend — VehicleList com dois botões de ação

**Files:**
- Modify: `apps/web/src/pages/VehicleList.tsx`

- [x] **Step 1: Adicionar as funções `handlePermanentDelete` e `handleReactivate`**

Em `apps/web/src/pages/VehicleList.tsx`, adicionar após a função `handleDeactivate` (linha ~51):

```typescript
  async function handlePermanentDelete(id: string) {
    if (!window.confirm(t('vehicles.deleteConfirm'))) return

    try {
      const token = await getToken()
      await apiFetch(`/vehicles/${id}/permanent`, token, { method: 'DELETE' })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  async function handleReactivate(id: string) {
    if (!window.confirm(t('vehicles.reactivateConfirm'))) return

    try {
      const token = await getToken()
      await apiFetch(`/vehicles/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: VehicleStatus.ACTIVE }),
      })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }
```

Nota: `handleReactivate` reutiliza o endpoint `PUT /vehicles/:id` existente enviando `{ status: 'ACTIVE' }` — sem necessidade de novo endpoint no backend.

- [x] **Step 2: Atualizar o bloco de ações na tabela**

Localizar o bloco de ações e substituir pelo seguinte. Veículos **ativos** mostram "Desativar" (laranja). Veículos **inativos** mostram "Reativar" (verde). Ambos os status mostram "Excluir" (vermelho):

```tsx
{canMutate && (
  <>
    <Link
      to={`/vehicles/${vehicle.id}/edit`}
      className="text-gray-700 hover:underline"
    >
      {t('actions.edit')}
    </Link>
    <Link
      to={`/vehicles/${vehicle.id}/drivers`}
      className="text-gray-700 hover:underline"
    >
      {t('vehicles.manageDrivers')}
    </Link>
    {vehicle.status === VehicleStatus.ACTIVE ? (
      <button
        onClick={() => handleDeactivate(vehicle.id)}
        className="text-orange-600 hover:underline"
      >
        {t('actions.deactivate')}
      </button>
    ) : (
      <button
        onClick={() => handleReactivate(vehicle.id)}
        className="text-green-600 hover:underline"
      >
        {t('actions.reactivate')}
      </button>
    )}
    <button
      onClick={() => handlePermanentDelete(vehicle.id)}
      className="text-red-600 hover:underline"
    >
      {t('actions.delete')}
    </button>
  </>
)}
```

- [x] **Step 3: Verificar tipo**

```powershell
cd apps/web && npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/VehicleList.tsx
git commit -m "feat(web): add reactivate and permanent delete buttons to vehicle list"
```

---

### Task 7: Frontend — uppercase no VehicleForm

**Files:**
- Modify: `apps/web/src/pages/VehicleForm.tsx`

- [x] **Step 1: Atualizar `updateField` para normalizar uppercase nos campos de texto**

Em `apps/web/src/pages/VehicleForm.tsx`, substituir a função `updateField` (linha ~72):

```typescript
  function updateField<Key extends keyof VehicleFormState>(key: Key, value: VehicleFormState[Key]) {
    const textFields: (keyof VehicleFormState)[] = ['plate', 'brand', 'model', 'color']
    const normalized = textFields.includes(key) ? (value as string).toUpperCase() : value
    setForm((current) => ({ ...current, [key]: normalized as VehicleFormState[Key] }))
  }
```

Isso faz o campo exibir em maiúsculas enquanto o usuário digita, e os dados são armazenados em maiúsculas.

- [x] **Step 2: Normalizar uppercase no payload do handleSubmit**

No `handleSubmit`, o payload já usa `form.plate.trim()` etc. Como `updateField` já normaliza, basta garantir que a chamada `.toUpperCase()` também cubra o caso de edição (carregamento de veículo existente já em minúsculas no banco). Atualizar o `setForm` dentro do `useEffect` de carregamento para também normalizar:

```typescript
setForm({
  plate: vehicle.plate.toUpperCase(),
  brand: vehicle.brand.toUpperCase(),
  model: vehicle.model.toUpperCase(),
  year: String(vehicle.year),
  color: vehicle.color.toUpperCase(),
})
```

- [x] **Step 3: Verificar tipo**

```powershell
cd apps/web && npx tsc --noEmit
```

Esperado: nenhum erro.

- [x] **Step 4: Verificar build**

```powershell
cd apps/web && npm run build
```

Esperado: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/VehicleForm.tsx
git commit -m "feat(web): normalize vehicle text fields to uppercase"
```

---

### Task 8: Verificação final (tasks anteriores)

- [x] **Step 1: Rodar todos os testes da API**

```powershell
cd apps/api && npm run test
```

Esperado: todos passando.

- [x] **Step 2: Verificar servidor da API sobe**

```powershell
cd apps/api && npm run dev
```

Esperado: `Server running on port 3000` sem erros.

Observado em 2026-05-14: `npm run dev` encontrou `EADDRINUSE` porque a API ja estava rodando na porta 3000; `GET /health` respondeu `{"status":"ok"}`.

- [x] **Step 3: Verificar frontend compila e serve**

```powershell
cd apps/web && npm run dev
```

Esperado: servidor Vite sobe sem erros.

---

### Task 9: Frontend — componente ConfirmDialog

**Files:**
- Create: `apps/web/src/components/ConfirmDialog.tsx`

Substituir os `window.confirm()` nativos por um modal próprio da aplicação, renderizado via React portal. O componente recebe title, message, labels dos botões e callbacks de confirmação/cancelamento. A variante `danger` deixa o botão de confirmar vermelho (para exclusões), `warning` laranja (para desativações) e `default` azul (para reativações).

- [x] **Step 1: Criar o componente `ConfirmDialog`**

Criar o arquivo `apps/web/src/components/ConfirmDialog.tsx`:

```tsx
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
        ? 'bg-orange-500 hover:bg-orange-600 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

- [x] **Step 2: Verificar tipo**

```powershell
cd apps/web && npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ConfirmDialog.tsx
git commit -m "feat(web): add reusable ConfirmDialog component"
```

---

### Task 10: Frontend — substituir window.confirm no VehicleList

**Files:**
- Modify: `apps/web/src/pages/VehicleList.tsx`

- [x] **Step 1: Adicionar import e estado do dialog**

No topo de `apps/web/src/pages/VehicleList.tsx`, adicionar o import:

```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog'
```

Dentro do componente `VehicleList`, após as declarações de estado existentes, adicionar:

```tsx
const [dialog, setDialog] = useState<{
  title: string
  message: string
  confirmLabel: string
  variant: 'danger' | 'warning' | 'default'
  onConfirm: () => void
} | null>(null)

function closeDialog() {
  setDialog(null)
}
```

- [x] **Step 2: Substituir handleDeactivate para abrir o dialog**

Substituir a função `handleDeactivate` atual:

```tsx
function handleDeactivate(id: string) {
  setDialog({
    title: t('actions.deactivate'),
    message: t('vehicles.deactivateConfirm'),
    confirmLabel: t('actions.deactivate'),
    variant: 'warning',
    onConfirm: async () => {
      closeDialog()
      try {
        const token = await getToken()
        await apiFetch(`/vehicles/${id}`, token, { method: 'DELETE' })
        reload()
      } catch (err) {
        window.alert((err as Error).message)
      }
    },
  })
}
```

- [x] **Step 3: Substituir handleReactivate para abrir o dialog**

Substituir a função `handleReactivate` atual:

```tsx
function handleReactivate(id: string) {
  setDialog({
    title: t('actions.reactivate'),
    message: t('vehicles.reactivateConfirm'),
    confirmLabel: t('actions.reactivate'),
    variant: 'default',
    onConfirm: async () => {
      closeDialog()
      try {
        const token = await getToken()
        await apiFetch(`/vehicles/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({ status: VehicleStatus.ACTIVE }),
        })
        reload()
      } catch (err) {
        window.alert((err as Error).message)
      }
    },
  })
}
```

- [x] **Step 4: Substituir handlePermanentDelete para abrir o dialog**

Substituir a função `handlePermanentDelete` atual:

```tsx
function handlePermanentDelete(id: string) {
  setDialog({
    title: t('actions.delete'),
    message: t('vehicles.deleteConfirm'),
    confirmLabel: t('actions.delete'),
    variant: 'danger',
    onConfirm: async () => {
      closeDialog()
      try {
        const token = await getToken()
        await apiFetch(`/vehicles/${id}/permanent`, token, { method: 'DELETE' })
        reload()
      } catch (err) {
        window.alert((err as Error).message)
      }
    },
  })
}
```

- [x] **Step 5: Renderizar o ConfirmDialog no return do componente**

No `return` do componente `VehicleList`, adicionar o `ConfirmDialog` logo antes do fechamento da `div` mais externa (após a tabela):

```tsx
      {dialog && (
        <ConfirmDialog
          isOpen
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={t('actions.cancel')}
          variant={dialog.variant}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
```

- [x] **Step 6: Verificar tipo**

```powershell
cd apps/web && npx tsc --noEmit
```

Esperado: nenhum erro.

- [x] **Step 7: Verificar build**

```powershell
cd apps/web && npm run build
```

Esperado: build sem erros.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/VehicleList.tsx
git commit -m "feat(web): replace window.confirm with ConfirmDialog in vehicle list"
```
