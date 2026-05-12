# Sprint 2 — Veículos e Motoristas

**Data:** 2026-05-06  
**Status:** concluído e mantido como resumo de referência

---

## Escopo Entregue

- CRUD de veículos no backend.
- CRUD de motoristas no backend.
- Vinculação motorista ↔ veículo.
- Telas de listagem, formulário, detalhe e vínculo no frontend.

---

## Backend

### Rotas principais

- `GET /vehicles`
- `GET /vehicles/:id`
- `POST /vehicles`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`
- `POST /vehicles/:id/drivers`
- `DELETE /vehicles/:vehicleId/drivers/:driverId`
- `GET /drivers`
- `GET /drivers/:id`
- `POST /drivers`
- `PUT /drivers/:id`
- `DELETE /drivers/:id`

### Regras

- Leitura liberada a usuários autenticados.
- Mutações restritas a `ADMIN` e `MANAGER`.
- Validação com Zod nas rotas.
- Regras de negócio em services com testes unitários.

---

## Frontend

### Páginas

- `VehicleList`
- `VehicleForm`
- `VehicleDetail`
- `VehicleDrivers`
- `DriverList`
- `DriverForm`

### Convenções

- Chamadas autenticadas usam `apiFetch`.
- O token vem de `useToken`.
- O role de interface vem de `useCurrentUser` ou do usuário atual carregado no app.
- As rotas ficam protegidas por `ProtectedRoute`.

---

## Verificação

```bash
cd apps/api && npx tsc --noEmit
npm run test:api

cd apps/web && npx tsc --noEmit
npm run build
```

