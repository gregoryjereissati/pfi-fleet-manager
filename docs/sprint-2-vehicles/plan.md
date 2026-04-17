# Sprint 2 — Veículos e Motoristas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar CRUD completo de Veículos e Motoristas (backend REST + frontend React) com vinculação entre entidades, sobre a infraestrutura já existente de auth, RBAC e validação.

**Architecture:** Backend first (Repository → Service TDD → Controller → Routes), depois frontend (api.ts helper → hooks → pages → wiring). Todos os padrões seguem exatamente o que já existe no pré-sprint — não inventar nada novo.

**Tech Stack:** Node.js + Express + Prisma + Zod + Vitest (backend); React + TypeScript + Auth0 + react-router-dom (frontend); `@fleet-manager/shared` para DTOs e enums.

---

## File Map

**Criar (backend):**
- `apps/api/src/repositories/vehicle.repository.ts`
- `apps/api/src/repositories/driver.repository.ts`
- `apps/api/src/services/vehicle.service.ts`
- `apps/api/src/services/driver.service.ts`
- `apps/api/src/services/__tests__/vehicle.service.test.ts`
- `apps/api/src/services/__tests__/driver.service.test.ts`
- `apps/api/src/controllers/vehicle.controller.ts`
- `apps/api/src/controllers/driver.controller.ts`
- `apps/api/src/routes/vehicle.routes.ts`
- `apps/api/src/routes/driver.routes.ts`

**Modificar (backend):**
- `apps/api/src/routes/index.ts` — registrar vehicleRouter e driverRouter

**Criar (frontend):**
- `apps/web/src/lib/api.ts`
- `apps/web/src/hooks/useVehicles.ts`
- `apps/web/src/hooks/useVehicle.ts`
- `apps/web/src/hooks/useDrivers.ts`
- `apps/web/src/hooks/useDriver.ts`
- `apps/web/src/pages/VehicleList.tsx`
- `apps/web/src/pages/VehicleForm.tsx`
- `apps/web/src/pages/VehicleDetail.tsx`
- `apps/web/src/pages/VehicleDrivers.tsx`
- `apps/web/src/pages/DriverList.tsx`
- `apps/web/src/pages/DriverForm.tsx`

**Modificar (frontend):**
- `apps/web/src/App.tsx` — adicionar rotas novas
- `apps/web/src/components/Sidebar.tsx` — habilitar links de veículos e motoristas
- `apps/web/src/locales/pt-BR.json` — chaves de tradução novas
- `apps/web/src/locales/en-US.json` — chaves de tradução novas
- `apps/web/.env` — adicionar VITE_API_URL

---

## Task 1: Vehicle Repository

**Files:**
- Create: `apps/api/src/repositories/vehicle.repository.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// apps/api/src/repositories/vehicle.repository.ts
import { VehicleStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface VehicleFilters {
  plate?: string;
  brand?: string;
  model?: string;
  status?: VehicleStatus;
  yearMin?: number;
  yearMax?: number;
  orderBy?: 'plate' | 'brand' | 'model' | 'year' | 'createdAt';
  order?: 'asc' | 'desc';
}

export const vehicleRepository = {
  findMany(filters: VehicleFilters = {}) {
    const { plate, brand, model, status, yearMin, yearMax, orderBy = 'createdAt', order = 'desc' } = filters;
    const validOrderBy = ['plate', 'brand', 'model', 'year', 'createdAt'];
    const safeOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'createdAt';

    return prisma.vehicle.findMany({
      where: {
        ...(plate && { plate: { contains: plate, mode: 'insensitive' } }),
        ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
        ...(model && { model: { contains: model, mode: 'insensitive' } }),
        ...(status && { status }),
        ...((yearMin || yearMax) && {
          year: {
            ...(yearMin && { gte: yearMin }),
            ...(yearMax && { lte: yearMax }),
          },
        }),
      },
      orderBy: { [safeOrderBy]: order },
    });
  },

  findById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
      include: {
        drivers: true,
        expenses: { orderBy: { date: 'desc' }, take: 5 },
        maintenances: { orderBy: { scheduledDate: 'desc' }, take: 5 },
      },
    });
  },

  findByPlate(plate: string) {
    return prisma.vehicle.findUnique({ where: { plate } });
  },

  create(data: { plate: string; brand: string; model: string; year: number; color: string }) {
    return prisma.vehicle.create({ data });
  },

  update(id: string, data: { plate?: string; brand?: string; model?: string; year?: number; color?: string; status?: VehicleStatus }) {
    return prisma.vehicle.update({ where: { id }, data });
  },

  setInactive(id: string) {
    return prisma.vehicle.update({ where: { id }, data: { status: VehicleStatus.INACTIVE } });
  },

  connectDrivers(vehicleId: string, driverIds: string[]) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { drivers: { connect: driverIds.map((id) => ({ id })) } },
      include: { drivers: true },
    });
  },

  disconnectDriver(vehicleId: string, driverId: string) {
    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: { drivers: { disconnect: { id: driverId } } },
      include: { drivers: true },
    });
  },
};
```

- [ ] **Step 2: Verificar que compila**

```bash
cd apps/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/repositories/vehicle.repository.ts
git commit -m "feat(api): add vehicle repository"
```

---

## Task 2: Vehicle Service (TDD)

**Files:**
- Create: `apps/api/src/services/__tests__/vehicle.service.test.ts`
- Create: `apps/api/src/services/vehicle.service.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// apps/api/src/services/__tests__/vehicle.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vehicleService } from '../vehicle.service';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { VehicleStatus } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByPlate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
    connectDrivers: vi.fn(),
    disconnectDriver: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'v-1',
  plate: 'ABC-1234',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2022,
  color: 'Prata',
  status: VehicleStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  drivers: [],
  expenses: [],
  maintenances: [],
};

describe('vehicleService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listVehicles', () => {
    it('retorna lista de veículos sem filtros', async () => {
      vi.mocked(vehicleRepository.findMany).mockResolvedValue([mockVehicle]);
      const result = await vehicleService.listVehicles({});
      expect(result).toEqual([mockVehicle]);
      expect(vehicleRepository.findMany).toHaveBeenCalledWith({});
    });
  });

  describe('getVehicle', () => {
    it('lança AppError 404 quando veículo não existe', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);
      await expect(vehicleService.getVehicle('inexistente')).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('retorna veículo com relações quando encontrado', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      const result = await vehicleService.getVehicle('v-1');
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('createVehicle', () => {
    it('lança AppError 409 quando placa já existe', async () => {
      vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(mockVehicle);
      await expect(
        vehicleService.createVehicle({ plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2022, color: 'Prata' }),
      ).rejects.toThrow(new AppError(409, 'Plate already in use'));
      expect(vehicleRepository.create).not.toHaveBeenCalled();
    });

    it('cria e retorna o veículo quando placa é nova', async () => {
      vi.mocked(vehicleRepository.findByPlate).mockResolvedValue(null);
      vi.mocked(vehicleRepository.create).mockResolvedValue(mockVehicle);
      const result = await vehicleService.createVehicle({
        plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2022, color: 'Prata',
      });
      expect(result).toEqual(mockVehicle);
      expect(vehicleRepository.create).toHaveBeenCalledOnce();
    });
  });

  describe('updateVehicle', () => {
    it('lança AppError 404 quando veículo não existe', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);
      await expect(vehicleService.updateVehicle('inexistente', { brand: 'Honda' })).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('atualiza e retorna o veículo', async () => {
      const updated = { ...mockVehicle, brand: 'Honda' };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.update).mockResolvedValue(updated);
      const result = await vehicleService.updateVehicle('v-1', { brand: 'Honda' });
      expect(result.brand).toBe('Honda');
    });
  });

  describe('deleteVehicle', () => {
    it('lança AppError 404 quando veículo não existe', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);
      await expect(vehicleService.deleteVehicle('inexistente')).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('desativa o veículo (exclusão lógica)', async () => {
      const inactive = { ...mockVehicle, status: VehicleStatus.INACTIVE };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.setInactive).mockResolvedValue(inactive);
      const result = await vehicleService.deleteVehicle('v-1');
      expect(result.status).toBe(VehicleStatus.INACTIVE);
    });
  });

  describe('linkDrivers', () => {
    it('lança AppError 404 quando veículo não existe', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);
      await expect(vehicleService.linkDrivers('inexistente', ['d-1'])).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('vincula motoristas ao veículo', async () => {
      const withDriver = { ...mockVehicle, drivers: [{ id: 'd-1' }] };
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.connectDrivers).mockResolvedValue(withDriver as any);
      const result = await vehicleService.linkDrivers('v-1', ['d-1']);
      expect(vehicleRepository.connectDrivers).toHaveBeenCalledWith('v-1', ['d-1']);
      expect(result).toEqual(withDriver);
    });
  });

  describe('unlinkDriver', () => {
    it('lança AppError 404 quando veículo não existe', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);
      await expect(vehicleService.unlinkDriver('inexistente', 'd-1')).rejects.toThrow(
        new AppError(404, 'Vehicle not found'),
      );
    });

    it('remove vínculo motorista-veículo', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(vehicleRepository.disconnectDriver).mockResolvedValue(mockVehicle);
      await vehicleService.unlinkDriver('v-1', 'd-1');
      expect(vehicleRepository.disconnectDriver).toHaveBeenCalledWith('v-1', 'd-1');
    });
  });
});
```

- [ ] **Step 2: Rodar os testes — esperado: FAIL (module not found)**

```bash
cd apps/api && npm run test -- --run src/services/__tests__/vehicle.service.test.ts
```

Esperado: erro "Cannot find module '../vehicle.service'".

- [ ] **Step 3: Implementar o service**

```ts
// apps/api/src/services/vehicle.service.ts
import { AppError } from '../middlewares/error-handler';
import { vehicleRepository, VehicleFilters } from '../repositories/vehicle.repository';

export const vehicleService = {
  listVehicles(filters: VehicleFilters) {
    return vehicleRepository.findMany(filters);
  },

  async getVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicle;
  },

  async createVehicle(data: { plate: string; brand: string; model: string; year: number; color: string }) {
    const existing = await vehicleRepository.findByPlate(data.plate);
    if (existing) throw new AppError(409, 'Plate already in use');
    return vehicleRepository.create(data);
  },

  async updateVehicle(id: string, data: { plate?: string; brand?: string; model?: string; year?: number; color?: string; status?: string }) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.update(id, data as any);
  },

  async deleteVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.setInactive(id);
  },

  async linkDrivers(vehicleId: string, driverIds: string[]) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.connectDrivers(vehicleId, driverIds);
  },

  async unlinkDriver(vehicleId: string, driverId: string) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    return vehicleRepository.disconnectDriver(vehicleId, driverId);
  },
};
```

- [ ] **Step 4: Rodar os testes — esperado: PASS**

```bash
cd apps/api && npm run test -- --run src/services/__tests__/vehicle.service.test.ts
```

Esperado: 10 testes passando.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/__tests__/vehicle.service.test.ts apps/api/src/services/vehicle.service.ts
git commit -m "feat(api): add vehicle service with TDD"
```

---

## Task 3: Vehicle Controller + Routes

**Files:**
- Create: `apps/api/src/controllers/vehicle.controller.ts`
- Create: `apps/api/src/routes/vehicle.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar o controller**

```ts
// apps/api/src/controllers/vehicle.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VehicleStatus } from '@fleet-manager/shared';
import { vehicleService } from '../services/vehicle.service';

const createVehicleSchema = z.object({
  plate: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2030),
  color: z.string().min(1),
});

const updateVehicleSchema = z.object({
  plate: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2030).optional(),
  color: z.string().min(1).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

const linkDriversSchema = z.object({
  driverIds: z.array(z.string()).min(1),
});

export const vehicleController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate, brand, model, status, yearMin, yearMax, orderBy, order } = req.query as Record<string, string>;
      const vehicles = await vehicleService.listVehicles({
        plate,
        brand,
        model,
        status: status as VehicleStatus | undefined,
        yearMin: yearMin ? Number(yearMin) : undefined,
        yearMax: yearMax ? Number(yearMax) : undefined,
        orderBy: orderBy as any,
        order: order as 'asc' | 'desc' | undefined,
      });
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.getVehicle(req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.deleteVehicle(req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async linkDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = linkDriversSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
        return;
      }
      const vehicle = await vehicleService.linkDrivers(req.params.id, parsed.data.driverIds);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },

  async unlinkDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.unlinkDriver(req.params.vehicleId, req.params.driverId);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  },
};

export { createVehicleSchema, updateVehicleSchema };
```

- [ ] **Step 2: Criar as rotas**

```ts
// apps/api/src/routes/vehicle.routes.ts
import { Router } from 'express';
import { vehicleController, createVehicleSchema, updateVehicleSchema } from '../controllers/vehicle.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { UserRole } from '@fleet-manager/shared';

export const vehicleRouter = Router();

vehicleRouter.use(authenticate);

vehicleRouter.get('/', vehicleController.list);
vehicleRouter.get('/:id', vehicleController.getById);
vehicleRouter.post('/', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(createVehicleSchema), vehicleController.create);
vehicleRouter.put('/:id', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(updateVehicleSchema), vehicleController.update);
vehicleRouter.delete('/:id', authorize(UserRole.ADMIN, UserRole.MANAGER), vehicleController.delete);

vehicleRouter.post('/:id/drivers', authorize(UserRole.ADMIN, UserRole.MANAGER), vehicleController.linkDrivers);
vehicleRouter.delete('/:vehicleId/drivers/:driverId', authorize(UserRole.ADMIN, UserRole.MANAGER), vehicleController.unlinkDriver);
```

- [ ] **Step 3: Registrar as rotas em index.ts**

Substituir o conteúdo de `apps/api/src/routes/index.ts`:

```ts
import { Router } from 'express';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';

export const router = Router();

router.use('/users', userRouter);
router.use('/vehicles', vehicleRouter);
```

- [ ] **Step 4: Verificar que compila e servidor sobe**

```bash
cd apps/api && npx tsc --noEmit && npm run dev
```

Esperado: "Server running on port 3000" sem erros.

- [ ] **Step 5: Rodar todos os testes da API**

```bash
cd apps/api && npm run test -- --run
```

Esperado: todos os testes passando (14 existentes + 10 novos = 24).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/vehicle.controller.ts apps/api/src/routes/vehicle.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add vehicle controller and routes"
```

---

## Task 4: Driver Repository

**Files:**
- Create: `apps/api/src/repositories/driver.repository.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// apps/api/src/repositories/driver.repository.ts
import { DriverStatus } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export interface DriverFilters {
  name?: string;
  cpf?: string;
  status?: DriverStatus;
}

export const driverRepository = {
  findMany(filters: DriverFilters = {}) {
    const { name, cpf, status } = filters;
    return prisma.driver.findMany({
      where: {
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
        ...(cpf && { cpf: { contains: cpf } }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.driver.findUnique({
      where: { id },
      include: { vehicles: true },
    });
  },

  findByCpf(cpf: string) {
    return prisma.driver.findUnique({ where: { cpf } });
  },

  findByCnh(cnh: string) {
    return prisma.driver.findUnique({ where: { cnh } });
  },

  create(data: { name: string; cpf: string; cnh: string; cnhExpiry: Date; phone?: string }) {
    return prisma.driver.create({ data });
  },

  update(id: string, data: { name?: string; cnh?: string; cnhExpiry?: Date; phone?: string; status?: DriverStatus }) {
    return prisma.driver.update({ where: { id }, data });
  },

  setInactive(id: string) {
    return prisma.driver.update({ where: { id }, data: { status: DriverStatus.INACTIVE } });
  },
};
```

- [ ] **Step 2: Verificar que compila**

```bash
cd apps/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/repositories/driver.repository.ts
git commit -m "feat(api): add driver repository"
```

---

## Task 5: Driver Service (TDD)

**Files:**
- Create: `apps/api/src/services/__tests__/driver.service.test.ts`
- Create: `apps/api/src/services/driver.service.ts`

- [ ] **Step 1: Escrever os testes**

```ts
// apps/api/src/services/__tests__/driver.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { driverService } from '../driver.service';
import { driverRepository } from '../../repositories/driver.repository';
import { DriverStatus } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByCpf: vi.fn(),
    findByCnh: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setInactive: vi.fn(),
  },
}));

const mockDriver = {
  id: 'd-1',
  name: 'João Silva',
  cpf: '12345678901',
  cnh: 'CNH-001',
  cnhExpiry: new Date('2026-12-31'),
  phone: '85999999999',
  status: DriverStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  vehicles: [],
};

describe('driverService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listDrivers', () => {
    it('retorna lista de motoristas sem filtros', async () => {
      vi.mocked(driverRepository.findMany).mockResolvedValue([mockDriver]);
      const result = await driverService.listDrivers({});
      expect(result).toEqual([mockDriver]);
    });
  });

  describe('getDriver', () => {
    it('lança AppError 404 quando motorista não existe', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);
      await expect(driverService.getDriver('inexistente')).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('retorna motorista com veículos vinculados', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      const result = await driverService.getDriver('d-1');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('createDriver', () => {
    it('lança AppError 409 quando CPF já existe', async () => {
      vi.mocked(driverRepository.findByCpf).mockResolvedValue(mockDriver);
      await expect(
        driverService.createDriver({ name: 'João', cpf: '12345678901', cnh: 'CNH-002', cnhExpiry: new Date() }),
      ).rejects.toThrow(new AppError(409, 'CPF already in use'));
      expect(driverRepository.create).not.toHaveBeenCalled();
    });

    it('lança AppError 409 quando CNH já existe', async () => {
      vi.mocked(driverRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(driverRepository.findByCnh).mockResolvedValue(mockDriver);
      await expect(
        driverService.createDriver({ name: 'João', cpf: '99999999999', cnh: 'CNH-001', cnhExpiry: new Date() }),
      ).rejects.toThrow(new AppError(409, 'CNH already in use'));
    });

    it('cria e retorna motorista quando CPF e CNH são únicos', async () => {
      vi.mocked(driverRepository.findByCpf).mockResolvedValue(null);
      vi.mocked(driverRepository.findByCnh).mockResolvedValue(null);
      vi.mocked(driverRepository.create).mockResolvedValue(mockDriver);
      const result = await driverService.createDriver({
        name: 'João', cpf: '12345678901', cnh: 'CNH-001', cnhExpiry: new Date(),
      });
      expect(result).toEqual(mockDriver);
    });
  });

  describe('updateDriver', () => {
    it('lança AppError 404 quando motorista não existe', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);
      await expect(driverService.updateDriver('inexistente', { name: 'Maria' })).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('atualiza e retorna motorista', async () => {
      const updated = { ...mockDriver, name: 'Maria' };
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(driverRepository.update).mockResolvedValue(updated);
      const result = await driverService.updateDriver('d-1', { name: 'Maria' });
      expect(result.name).toBe('Maria');
    });
  });

  describe('deleteDriver', () => {
    it('lança AppError 404 quando motorista não existe', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);
      await expect(driverService.deleteDriver('inexistente')).rejects.toThrow(
        new AppError(404, 'Driver not found'),
      );
    });

    it('desativa motorista (exclusão lógica)', async () => {
      const inactive = { ...mockDriver, status: DriverStatus.INACTIVE };
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(driverRepository.setInactive).mockResolvedValue(inactive);
      const result = await driverService.deleteDriver('d-1');
      expect(result.status).toBe(DriverStatus.INACTIVE);
    });
  });
});
```

- [ ] **Step 2: Rodar os testes — esperado: FAIL**

```bash
cd apps/api && npm run test -- --run src/services/__tests__/driver.service.test.ts
```

Esperado: erro "Cannot find module '../driver.service'".

- [ ] **Step 3: Implementar o service**

```ts
// apps/api/src/services/driver.service.ts
import { AppError } from '../middlewares/error-handler';
import { driverRepository, DriverFilters } from '../repositories/driver.repository';

export const driverService = {
  listDrivers(filters: DriverFilters) {
    return driverRepository.findMany(filters);
  },

  async getDriver(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driver;
  },

  async createDriver(data: { name: string; cpf: string; cnh: string; cnhExpiry: Date; phone?: string }) {
    const existingCpf = await driverRepository.findByCpf(data.cpf);
    if (existingCpf) throw new AppError(409, 'CPF already in use');
    const existingCnh = await driverRepository.findByCnh(data.cnh);
    if (existingCnh) throw new AppError(409, 'CNH already in use');
    return driverRepository.create(data);
  },

  async updateDriver(id: string, data: { name?: string; cnh?: string; cnhExpiry?: Date; phone?: string; status?: string }) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driverRepository.update(id, data as any);
  },

  async deleteDriver(id: string) {
    const driver = await driverRepository.findById(id);
    if (!driver) throw new AppError(404, 'Driver not found');
    return driverRepository.setInactive(id);
  },
};
```

- [ ] **Step 4: Rodar os testes — esperado: PASS**

```bash
cd apps/api && npm run test -- --run src/services/__tests__/driver.service.test.ts
```

Esperado: 8 testes passando.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/__tests__/driver.service.test.ts apps/api/src/services/driver.service.ts
git commit -m "feat(api): add driver service with TDD"
```

---

## Task 6: Driver Controller + Routes

**Files:**
- Create: `apps/api/src/controllers/driver.controller.ts`
- Create: `apps/api/src/routes/driver.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar o controller**

```ts
// apps/api/src/controllers/driver.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DriverStatus } from '@fleet-manager/shared';
import { driverService } from '../services/driver.service';

const createDriverSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().length(11, 'CPF must be 11 digits'),
  cnh: z.string().min(1),
  cnhExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((v) => new Date(v)),
  phone: z.string().optional(),
});

const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  cnh: z.string().min(1).optional(),
  cnhExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((v) => new Date(v)).optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
});

export const driverController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, cpf, status } = req.query as Record<string, string>;
      const drivers = await driverService.listDrivers({
        name,
        cpf,
        status: status as DriverStatus | undefined,
      });
      res.json(drivers);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.getDriver(req.params.id);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.createDriver(req.body);
      res.status(201).json(driver);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.updateDriver(req.params.id, req.body);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await driverService.deleteDriver(req.params.id);
      res.json(driver);
    } catch (err) {
      next(err);
    }
  },
};

export { createDriverSchema, updateDriverSchema };
```

- [ ] **Step 2: Criar as rotas**

```ts
// apps/api/src/routes/driver.routes.ts
import { Router } from 'express';
import { driverController, createDriverSchema, updateDriverSchema } from '../controllers/driver.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { UserRole } from '@fleet-manager/shared';

export const driverRouter = Router();

driverRouter.use(authenticate);

driverRouter.get('/', driverController.list);
driverRouter.get('/:id', driverController.getById);
driverRouter.post('/', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(createDriverSchema), driverController.create);
driverRouter.put('/:id', authorize(UserRole.ADMIN, UserRole.MANAGER), validate(updateDriverSchema), driverController.update);
driverRouter.delete('/:id', authorize(UserRole.ADMIN, UserRole.MANAGER), driverController.delete);
```

- [ ] **Step 3: Registrar em index.ts**

Substituir o conteúdo de `apps/api/src/routes/index.ts`:

```ts
import { Router } from 'express';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';
import { driverRouter } from './driver.routes';

export const router = Router();

router.use('/users', userRouter);
router.use('/vehicles', vehicleRouter);
router.use('/drivers', driverRouter);
```

- [ ] **Step 4: Rodar todos os testes**

```bash
cd apps/api && npm run test -- --run
```

Esperado: 32 testes passando (14 + 10 + 8).

- [ ] **Step 5: Verificar servidor sobe**

```bash
cd apps/api && npm run dev
```

Esperado: "Server running on port 3000" sem erros de TypeScript.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/controllers/driver.controller.ts apps/api/src/routes/driver.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add driver controller and routes"
```

---

## Task 7: Frontend — api.ts helper

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Modify: `apps/web/.env`

- [ ] **Step 1: Adicionar VITE_API_URL no .env**

Adicionar ao final de `apps/web/.env`:

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 2: Criar o helper**

```ts
// apps/web/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL as string

export async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/.env
git commit -m "feat(web): add apiFetch helper and API URL config"
```

---

## Task 8: Vehicle Hooks + VehicleList

**Files:**
- Create: `apps/web/src/hooks/useVehicles.ts`
- Create: `apps/web/src/pages/VehicleList.tsx`

- [ ] **Step 1: Criar hook useVehicles**

```ts
// apps/web/src/hooks/useVehicles.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { VehicleDto } from '@fleet-manager/shared'

export interface VehicleFilters {
  plate?: string
  brand?: string
  model?: string
  status?: string
  yearMin?: string
  yearMax?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}

export function useVehicles(filters: VehicleFilters = {}) {
  const { getAccessTokenSilently } = useAuth0()
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getAccessTokenSilently()
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const data = await apiFetch<VehicleDto[]>(`/vehicles?${params}`, token)
      setVehicles(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently, JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { vehicles, loading, error, reload: load }
}
```

- [ ] **Step 2: Criar página VehicleList**

```tsx
// apps/web/src/pages/VehicleList.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useVehicles, VehicleFilters } from '@/hooks/useVehicles'
import { apiFetch } from '@/lib/api'
import { VehicleStatus } from '@fleet-manager/shared'

export function VehicleList() {
  const { user, getAccessTokenSilently } = useAuth0()
  const role = (user as any)?.['https://fleet-manager.com/role'] as string | undefined
  const canMutate = role === 'ADMIN' || role === 'MANAGER'

  const [filters, setFilters] = useState<VehicleFilters>({})
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { vehicles, loading, error, reload } = useVehicles({
    ...filters,
    plate: search || undefined,
    orderBy: sortField,
    order: sortOrder,
  })

  async function handleDelete(id: string) {
    if (!confirm('Desativar este veículo?')) return
    const token = await getAccessTokenSilently()
    await apiFetch(`/vehicles/${id}`, token, { method: 'DELETE' })
    reload()
  }

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
        {canMutate && (
          <Link
            to="/vehicles/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            + Novo Veículo
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por placa, marca ou modelo..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-48"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
        >
          <option value="">Todos os status</option>
          <option value={VehicleStatus.ACTIVE}>Ativo</option>
          <option value={VehicleStatus.INACTIVE}>Inativo</option>
        </select>
        <input
          type="number"
          placeholder="Ano mín."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24"
          value={filters.yearMin ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, yearMin: e.target.value || undefined }))}
        />
        <input
          type="number"
          placeholder="Ano máx."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24"
          value={filters.yearMax ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, yearMax: e.target.value || undefined }))}
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['plate', 'brand', 'model', 'year'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort(col)}
                  >
                    {{ plate: 'Placa', brand: 'Marca', model: 'Modelo', year: 'Ano' }[col]}
                    {sortField === col && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{v.plate}</td>
                    <td className="px-4 py-3">{v.brand}</td>
                    <td className="px-4 py-3">{v.model}</td>
                    <td className="px-4 py-3">{v.year}</td>
                    <td className="px-4 py-3">{v.color}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          v.status === VehicleStatus.ACTIVE
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {v.status === VehicleStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/vehicles/${v.id}`} className="text-blue-600 hover:underline text-xs">
                          Ver
                        </Link>
                        {canMutate && (
                          <>
                            <Link to={`/vehicles/${v.id}/edit`} className="text-gray-600 hover:underline text-xs">
                              Editar
                            </Link>
                            <Link to={`/vehicles/${v.id}/drivers`} className="text-gray-600 hover:underline text-xs">
                              Motoristas
                            </Link>
                            {v.status === VehicleStatus.ACTIVE && (
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="text-red-500 hover:underline text-xs"
                              >
                                Desativar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useVehicles.ts apps/web/src/pages/VehicleList.tsx
git commit -m "feat(web): add VehicleList page with filters and sorting"
```

---

## Task 9: VehicleForm (Criar + Editar)

**Files:**
- Create: `apps/web/src/pages/VehicleForm.tsx`

- [ ] **Step 1: Criar o formulário**

```tsx
// apps/web/src/pages/VehicleForm.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { VehicleDto } from '@fleet-manager/shared'

export function VehicleForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()

  const [form, setForm] = useState({ plate: '', brand: '', model: '', year: '', color: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const token = await getAccessTokenSilently()
      const vehicle = await apiFetch<VehicleDto>(`/vehicles/${id}`, token)
      setForm({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: String(vehicle.year),
        color: vehicle.color,
      })
    }
    load()
  }, [id, isEdit, getAccessTokenSilently])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await getAccessTokenSilently()
      const body = { ...form, year: Number(form.year) }
      if (isEdit) {
        await apiFetch(`/vehicles/${id}`, token, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await apiFetch('/vehicles', token, { method: 'POST', body: JSON.stringify(body) })
      }
      navigate('/vehicles')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fields: { key: keyof typeof form; label: string; type?: string }[] = [
    { key: 'plate', label: 'Placa' },
    { key: 'brand', label: 'Marca' },
    { key: 'model', label: 'Modelo' },
    { key: 'year', label: 'Ano', type: 'number' },
    { key: 'color', label: 'Cor' },
  ]

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Editar Veículo' : 'Novo Veículo'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type ?? 'text'}
              required
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/vehicles')}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/VehicleForm.tsx
git commit -m "feat(web): add VehicleForm page (create and edit)"
```

---

## Task 10: useVehicle Hook + VehicleDetail

**Files:**
- Create: `apps/web/src/hooks/useVehicle.ts`
- Create: `apps/web/src/pages/VehicleDetail.tsx`

- [ ] **Step 1: Criar hook useVehicle**

```ts
// apps/web/src/hooks/useVehicle.ts
import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { VehicleDto, DriverDto } from '@fleet-manager/shared'

interface VehicleWithRelations extends VehicleDto {
  drivers: DriverDto[]
  expenses: { id: string; type: string; amount: string; date: string }[]
  maintenances: { id: string; type: string; status: string; scheduledDate: string }[]
}

export function useVehicle(id: string) {
  const { getAccessTokenSilently } = useAuth0()
  const [vehicle, setVehicle] = useState<VehicleWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const token = await getAccessTokenSilently()
        const data = await apiFetch<VehicleWithRelations>(`/vehicles/${id}`, token)
        if (!cancelled) setVehicle(data)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, getAccessTokenSilently])

  return { vehicle, loading, error }
}
```

- [ ] **Step 2: Criar página VehicleDetail**

```tsx
// apps/web/src/pages/VehicleDetail.tsx
import { Link, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useVehicle } from '@/hooks/useVehicle'
import { VehicleStatus } from '@fleet-manager/shared'

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth0()
  const role = (user as any)?.['https://fleet-manager.com/role'] as string | undefined
  const canMutate = role === 'ADMIN' || role === 'MANAGER'

  const { vehicle, loading, error } = useVehicle(id!)

  if (loading) return <p className="text-gray-500 text-sm">Carregando...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!vehicle) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.plate}</h1>
          <p className="text-gray-500">{vehicle.brand} {vehicle.model} · {vehicle.year} · {vehicle.color}</p>
        </div>
        <div className="flex gap-2">
          {canMutate && (
            <>
              <Link to={`/vehicles/${id}/edit`} className="px-3 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-gray-50">
                Editar
              </Link>
              <Link to={`/vehicles/${id}/drivers`} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                Motoristas
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === VehicleStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {vehicle.status === VehicleStatus.ACTIVE ? 'Ativo' : 'Inativo'}
      </span>

      {/* Motoristas vinculados */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Motoristas Vinculados ({vehicle.drivers.length})</h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum motorista vinculado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {vehicle.drivers.map((d) => (
              <li key={d.id} className="py-2 text-sm flex items-center justify-between">
                <span>{d.name}</span>
                <span className="text-gray-400">CNH {d.cnh}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Últimas despesas */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimas Despesas</h2>
        {vehicle.expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma despesa registrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="pb-2">Tipo</th><th className="pb-2">Valor</th><th className="pb-2">Data</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {vehicle.expenses.map((e) => (
                <tr key={e.id}>
                  <td className="py-2">{e.type}</td>
                  <td className="py-2">R$ {Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Últimas manutenções */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimas Manutenções</h2>
        {vehicle.maintenances.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma manutenção registrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="pb-2">Tipo</th><th className="pb-2">Status</th><th className="pb-2">Data Agendada</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {vehicle.maintenances.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">{m.type}</td>
                  <td className="py-2">{m.status}</td>
                  <td className="py-2">{new Date(m.scheduledDate).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Link to="/vehicles" className="text-sm text-blue-600 hover:underline">← Voltar para Veículos</Link>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useVehicle.ts apps/web/src/pages/VehicleDetail.tsx
git commit -m "feat(web): add VehicleDetail page"
```

---

## Task 11: Driver Hooks + DriverList + DriverForm

**Files:**
- Create: `apps/web/src/hooks/useDrivers.ts`
- Create: `apps/web/src/hooks/useDriver.ts`
- Create: `apps/web/src/pages/DriverList.tsx`
- Create: `apps/web/src/pages/DriverForm.tsx`

- [ ] **Step 1: Criar hook useDrivers**

```ts
// apps/web/src/hooks/useDrivers.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { DriverDto } from '@fleet-manager/shared'

export interface DriverFilters {
  name?: string
  cpf?: string
  status?: string
}

export function useDrivers(filters: DriverFilters = {}) {
  const { getAccessTokenSilently } = useAuth0()
  const [drivers, setDrivers] = useState<DriverDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getAccessTokenSilently()
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const data = await apiFetch<DriverDto[]>(`/drivers?${params}`, token)
      setDrivers(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently, JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { drivers, loading, error, reload: load }
}
```

- [ ] **Step 2: Criar hook useDriver**

```ts
// apps/web/src/hooks/useDriver.ts
import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { DriverDto, VehicleDto } from '@fleet-manager/shared'

interface DriverWithVehicles extends DriverDto {
  vehicles: VehicleDto[]
}

export function useDriver(id: string) {
  const { getAccessTokenSilently } = useAuth0()
  const [driver, setDriver] = useState<DriverWithVehicles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const token = await getAccessTokenSilently()
        const data = await apiFetch<DriverWithVehicles>(`/drivers/${id}`, token)
        if (!cancelled) setDriver(data)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, getAccessTokenSilently])

  return { driver, loading, error }
}
```

- [ ] **Step 3: Criar DriverList**

```tsx
// apps/web/src/pages/DriverList.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useDrivers } from '@/hooks/useDrivers'
import { apiFetch } from '@/lib/api'
import { DriverStatus } from '@fleet-manager/shared'

export function DriverList() {
  const { user, getAccessTokenSilently } = useAuth0()
  const role = (user as any)?.['https://fleet-manager.com/role'] as string | undefined
  const canMutate = role === 'ADMIN' || role === 'MANAGER'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { drivers, loading, error, reload } = useDrivers({
    name: search || undefined,
    status: statusFilter || undefined,
  })

  async function handleDelete(id: string) {
    if (!confirm('Desativar este motorista?')) return
    const token = await getAccessTokenSilently()
    await apiFetch(`/drivers/${id}`, token, { method: 'DELETE' })
    reload()
  }

  function isCnhExpiring(expiry: string) {
    const diff = new Date(expiry).getTime() - Date.now()
    return diff < 30 * 24 * 60 * 60 * 1000 // 30 dias
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
        {canMutate && (
          <Link to="/drivers/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            + Novo Motorista
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-48"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value={DriverStatus.ACTIVE}>Ativo</option>
          <option value={DriverStatus.INACTIVE}>Inativo</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CPF</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CNH</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vencimento CNH</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum motorista encontrado.</td></tr>
              ) : (
                drivers.map((d) => {
                  const expiring = isCnhExpiring(d.cnhExpiry)
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-gray-500">{d.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                      <td className="px-4 py-3">{d.cnh}</td>
                      <td className="px-4 py-3">
                        <span className={expiring ? 'text-red-600 font-medium' : ''}>
                          {new Date(d.cnhExpiry).toLocaleDateString('pt-BR')}
                          {expiring && ' ⚠️'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === DriverStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.status === DriverStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canMutate && (
                            <>
                              <Link to={`/drivers/${d.id}/edit`} className="text-gray-600 hover:underline text-xs">Editar</Link>
                              {d.status === DriverStatus.ACTIVE && (
                                <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:underline text-xs">Desativar</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Criar DriverForm**

```tsx
// apps/web/src/pages/DriverForm.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { apiFetch } from '@/lib/api'
import type { DriverDto } from '@fleet-manager/shared'

export function DriverForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()

  const [form, setForm] = useState({ name: '', cpf: '', cnh: '', cnhExpiry: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const token = await getAccessTokenSilently()
      const driver = await apiFetch<DriverDto>(`/drivers/${id}`, token)
      setForm({
        name: driver.name,
        cpf: driver.cpf,
        cnh: driver.cnh,
        cnhExpiry: driver.cnhExpiry.split('T')[0],
        phone: driver.phone ?? '',
      })
    }
    load()
  }, [id, isEdit, getAccessTokenSilently])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await getAccessTokenSilently()
      const body = { ...form, phone: form.phone || undefined }
      if (isEdit) {
        const { cpf: _, ...updateBody } = body // CPF não pode ser alterado
        await apiFetch(`/drivers/${id}`, token, { method: 'PUT', body: JSON.stringify(updateBody) })
      } else {
        await apiFetch('/drivers', token, { method: 'POST', body: JSON.stringify(body) })
      }
      navigate('/drivers')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Editar Motorista' : 'Novo Motorista'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        {[
          { key: 'name', label: 'Nome completo' },
          { key: 'cpf', label: 'CPF (somente números)', disabled: isEdit },
          { key: 'cnh', label: 'Número da CNH' },
          { key: 'cnhExpiry', label: 'Vencimento da CNH', type: 'date' },
          { key: 'phone', label: 'Telefone (opcional)', required: false },
        ].map(({ key, label, type, disabled, required = true }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type ?? 'text'}
              required={required}
              disabled={disabled}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        ))}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/drivers')} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useDrivers.ts apps/web/src/hooks/useDriver.ts apps/web/src/pages/DriverList.tsx apps/web/src/pages/DriverForm.tsx
git commit -m "feat(web): add Driver hooks, DriverList, and DriverForm"
```

---

## Task 12: VehicleDrivers (Tela de Vinculação)

**Files:**
- Create: `apps/web/src/pages/VehicleDrivers.tsx`

- [ ] **Step 1: Criar a página**

```tsx
// apps/web/src/pages/VehicleDrivers.tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useVehicle } from '@/hooks/useVehicle'
import { useDrivers } from '@/hooks/useDrivers'
import { apiFetch } from '@/lib/api'
import { DriverStatus } from '@fleet-manager/shared'

export function VehicleDrivers() {
  const { id } = useParams<{ id: string }>()
  const { getAccessTokenSilently } = useAuth0()
  const { vehicle, loading: vLoading, error: vError } = useVehicle(id!)
  const [search, setSearch] = useState('')
  const { drivers: allDrivers } = useDrivers({ name: search || undefined, status: DriverStatus.ACTIVE })
  const [actionLoading, setActionLoading] = useState(false)
  const [, forceUpdate] = useState(0)

  const linkedIds = new Set(vehicle?.drivers.map((d) => d.id) ?? [])
  const available = allDrivers.filter((d) => !linkedIds.has(d.id))

  async function handleLink(driverId: string) {
    setActionLoading(true)
    try {
      const token = await getAccessTokenSilently()
      await apiFetch(`/vehicles/${id}/drivers`, token, {
        method: 'POST',
        body: JSON.stringify({ driverIds: [driverId] }),
      })
      forceUpdate((n) => n + 1)
      window.location.reload() // força reload do hook useVehicle
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnlink(driverId: string) {
    setActionLoading(true)
    try {
      const token = await getAccessTokenSilently()
      await apiFetch(`/vehicles/${id}/drivers/${driverId}`, token, { method: 'DELETE' })
      window.location.reload()
    } finally {
      setActionLoading(false)
    }
  }

  if (vLoading) return <p className="text-gray-500 text-sm">Carregando...</p>
  if (vError) return <p className="text-red-600 text-sm">{vError}</p>
  if (!vehicle) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link to={`/vehicles/${id}`} className="text-sm text-blue-600 hover:underline">← Voltar para {vehicle.plate}</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Motoristas — {vehicle.plate}</h1>
        <p className="text-gray-500 text-sm">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
      </div>

      {/* Motoristas vinculados */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Vinculados ({vehicle.drivers.length})</h2>
        {vehicle.drivers.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum motorista vinculado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {vehicle.drivers.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium">{d.name}</span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUnlink(d.id)}
                  className="text-red-500 hover:underline text-xs disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Adicionar motorista */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Motorista</h2>
        <input
          type="text"
          placeholder="Buscar motorista por nome..."
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm mb-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {available.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum motorista disponível.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {available.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between text-sm">
                <span>{d.name} <span className="text-gray-400">· CNH {d.cnh}</span></span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleLink(d.id)}
                  className="text-blue-600 hover:underline text-xs disabled:opacity-50"
                >
                  Vincular
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/VehicleDrivers.tsx
git commit -m "feat(web): add VehicleDrivers linking page"
```

---

## Task 13: Wiring — Rotas, Sidebar e i18n

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/Sidebar.tsx`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`

- [ ] **Step 1: Atualizar App.tsx com as novas rotas**

Substituir o conteúdo de `apps/web/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { Landing } from '@/pages/Landing'
import { Dashboard } from '@/pages/Dashboard'
import { VehicleList } from '@/pages/VehicleList'
import { VehicleForm } from '@/pages/VehicleForm'
import { VehicleDetail } from '@/pages/VehicleDetail'
import { VehicleDrivers } from '@/pages/VehicleDrivers'
import { DriverList } from '@/pages/DriverList'
import { DriverForm } from '@/pages/DriverForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function App() {
  return (
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
        <Route path="/vehicles" element={<VehicleList />} />
        <Route path="/vehicles/new" element={<VehicleForm />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
        <Route path="/vehicles/:id/drivers" element={<VehicleDrivers />} />
        <Route path="/drivers" element={<DriverList />} />
        <Route path="/drivers/new" element={<DriverForm />} />
        <Route path="/drivers/:id/edit" element={<DriverForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Habilitar links no Sidebar.tsx**

Na constante `navItems` em `apps/web/src/components/Sidebar.tsx`, alterar `enabled: false` para `enabled: true` nas entradas de `/vehicles` e `/drivers`:

```ts
const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, labelKey: 'nav.dashboard',    enabled: true  },
  { to: '/vehicles',     icon: Car,             labelKey: 'nav.vehicles',     enabled: true  }, // era false
  { to: '/drivers',      icon: Users,           labelKey: 'nav.drivers',      enabled: true  }, // era false
  { to: '/expenses',     icon: Receipt,         labelKey: 'nav.expenses',     enabled: false },
  { to: '/maintenances', icon: Wrench,          labelKey: 'nav.maintenances', enabled: false },
  { to: '/documents',    icon: FileText,        labelKey: 'nav.documents',    enabled: false },
  { to: '/users',        icon: UserCog,         labelKey: 'nav.users',        enabled: false },
]
```

- [ ] **Step 3: Verificar tipos TypeScript do frontend**

```bash
cd apps/web && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/components/Sidebar.tsx
git commit -m "feat(web): wire up vehicles and drivers routes and sidebar links"
```

---

## Task 14: Verificação Final e CLAUDE.md

- [ ] **Step 1: Rodar todos os testes da API**

```bash
cd apps/api && npm run test -- --run
```

Esperado: 32 testes passando.

- [ ] **Step 2: Verificar que a API sobe com todos os endpoints**

```bash
cd apps/api && npm run dev
# Em outro terminal:
curl -s http://localhost:3000/health
```

Esperado: `{"status":"ok"}`.

- [ ] **Step 3: Verificar que o frontend compila e o dev server sobe**

```bash
cd apps/web && npm run dev
```

Esperado: "Local: http://localhost:5173/" sem erros.

- [ ] **Step 4: Atualizar CLAUDE.md**

Na seção `### 🔄 Em Andamento`, mover as issues para `✅ Concluído`:

```markdown
#### Sprint 2 — Veículos e Motoristas — COMPLETA
- [x] [#1] API REST de veículos e motoristas (backend)
- [x] [#24] Tela de listagem de veículos com filtros
- [x] [#25] Formulário de cadastro e edição de veículos
- [x] [#26] Tela de detalhes do veículo
- [x] [#27] Tela de listagem de motoristas
- [x] [#28] Formulário de cadastro e edição de motoristas
- [x] [#29] Vinculação motorista ↔ veículo
```

Também adicionar entrada no histórico:

```markdown
| 2026-04-16 | Claude | Sprint 2: Vehicles + Drivers backend (TDD) | vehicle.repository, driver.repository, vehicle.service (10 testes), driver.service (8 testes), controllers, routes |
| 2026-04-16 | Claude | Sprint 2: Vehicles + Drivers frontend | api.ts, hooks, VehicleList, VehicleForm, VehicleDetail, VehicleDrivers, DriverList, DriverForm |
```

- [ ] **Step 5: Commit final**

```bash
git add CLAUDE.md
git commit -m "chore: mark Sprint 2 as complete in CLAUDE.md"
```
