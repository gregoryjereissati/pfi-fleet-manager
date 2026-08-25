# Sprint 4 — Documentos e Alertas: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de documentos obrigatórios da frota com controle de vencimento, job de alertas automáticos via node-cron e notificações visuais no frontend (badge no Sidebar, ícone de sino no Header, Central de Alertas).

**Architecture:** Status de vencimento (`OK`/`EXPIRING_SOON`/`EXPIRED`) computado em tempo real no repository a partir de `expiryDate`, sem campo extra no banco. O cron job marca `alertSent=true` uma vez por documento quando ele entra na janela de 30 dias. O frontend consulta `GET /documents/alerts/count` a cada 5 minutos para manter o badge atualizado.

**Tech Stack:** Node.js + Express + Prisma + TypeScript + Vitest (backend); React + Vite + TypeScript + react-i18next (frontend); node-cron (job de alertas).

---

## Mapa de Arquivos

### Criar
- `apps/api/src/repositories/document.repository.ts`
- `apps/api/src/services/document.service.ts`
- `apps/api/src/services/__tests__/document.service.test.ts`
- `apps/api/src/controllers/document.controller.ts`
- `apps/api/src/routes/document.routes.ts`
- `apps/api/src/jobs/alertCron.ts`
- `apps/web/src/hooks/useDocuments.ts`
- `apps/web/src/hooks/useAlertCount.ts`
- `apps/web/src/pages/DocumentList.tsx`
- `apps/web/src/pages/DocumentForm.tsx`
- `apps/web/src/pages/AlertCenter.tsx`

### Modificar
- `packages/shared/src/enums/index.ts` — adicionar `DocumentType`
- `packages/shared/src/dtos/document.dto.ts` — adicionar `DocumentStatus`, atualizar DTOs
- `apps/api/prisma/schema.prisma` — converter `type String` → `type DocumentType` (enum)
- `apps/api/src/routes/index.ts` — registrar `documentRouter`
- `apps/api/src/app.ts` — importar cron job
- `apps/web/src/App.tsx` — adicionar rotas `/documents`, `/documents/new`, `/documents/:id/edit`, `/alerts`
- `apps/web/src/components/Sidebar.tsx` — habilitar Documentos com badge, adicionar Alertas
- `apps/web/src/components/Header.tsx` — adicionar ícone de sino com badge
- `apps/web/src/locales/pt-BR.json` — chaves de documentos e alertas
- `apps/web/src/locales/en-US.json` — chaves de documentos e alertas

---

## Task 1: Shared — DocumentType enum e DocumentStatus type

**Files:**
- Modify: `packages/shared/src/enums/index.ts`
- Modify: `packages/shared/src/dtos/document.dto.ts`

- [ ] **Step 1: Adicionar `DocumentType` ao arquivo de enums**

Abrir `packages/shared/src/enums/index.ts` e adicionar ao final:

```typescript
export enum DocumentType {
  CRLV = 'CRLV',
  IPVA = 'IPVA',
  SEGURO = 'SEGURO',
  CNH = 'CNH',
  LICENCA = 'LICENCA',
  OUTRO = 'OUTRO',
}
```

- [ ] **Step 2: Atualizar `document.dto.ts` com `DocumentStatus` e tipos corretos**

Substituir o conteúdo completo de `packages/shared/src/dtos/document.dto.ts`:

```typescript
import { DocumentType } from '../enums';

export type DocumentStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentDto {
  id: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  type: DocumentType;
  expiryDate: string;
  alertSent: boolean;
  status: DocumentStatus;
  createdAt: string;
}

export interface CreateDocumentDto {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: string;
}

export interface UpdateDocumentDto {
  type?: DocumentType;
  expiryDate?: string;
}
```

- [ ] **Step 3: Verificar que `packages/shared/src/dtos/index.ts` exporta DocumentDto**

Abrir `packages/shared/src/dtos/index.ts` e confirmar que a linha abaixo existe (adicionar se não existir):

```typescript
export * from './document.dto';
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/enums/index.ts packages/shared/src/dtos/document.dto.ts packages/shared/src/dtos/index.ts
git commit -m "feat(shared): add DocumentType enum and DocumentStatus type"
```

---

## Task 2: Prisma — Converter type do Document para enum e migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar enum DocumentType e atualizar model Document no schema**

Abrir `apps/api/prisma/schema.prisma`. Adicionar o enum após `MaintenanceStatus`:

```prisma
enum DocumentType {
  CRLV
  IPVA
  SEGURO
  CNH
  LICENCA
  OUTRO
}
```

Alterar o campo `type` no model `Document` de `String` para `DocumentType`:

```prisma
model Document {
  id         String       @id @default(cuid())
  vehicleId  String?
  vehicle    Vehicle?     @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  driverId   String?
  driver     Driver?      @relation(fields: [driverId], references: [id], onDelete: Cascade)
  type       DocumentType
  expiryDate DateTime
  alertSent  Boolean      @default(false)
  createdAt  DateTime     @default(now())
}
```

- [ ] **Step 2: Rodar a migration**

```bash
cd apps/api && npx prisma migrate dev --name add-document-type-enum
```

Saída esperada: `Your database is now in sync with your schema.`

> **Nota:** se houver erro de cast por dados existentes com tipo `String`, rode `npx prisma migrate reset` (apaga e recria o banco com seed) e depois re-execute.

- [ ] **Step 3: Gerar o client Prisma atualizado**

```bash
npx prisma generate
```

- [ ] **Step 4: Verificar TypeScript da API**

```bash
cd apps/api && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(api): add DocumentType enum to prisma schema and migrate"
```

---

## Task 3: Document Repository

**Files:**
- Create: `apps/api/src/repositories/document.repository.ts`

- [ ] **Step 1: Criar o arquivo do repository**

Criar `apps/api/src/repositories/document.repository.ts`:

```typescript
import { DocumentType } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export type DocumentStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentFilters {
  vehicleId?: string;
  driverId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  orderBy?: 'expiryDate' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateDocumentData {
  vehicleId?: string;
  driverId?: string;
  type: DocumentType;
  expiryDate: Date;
}

export interface UpdateDocumentData {
  type?: DocumentType;
  expiryDate?: Date;
}

const documentInclude = {
  vehicle: { select: { id: true, plate: true } },
  driver: { select: { id: true, name: true } },
} as const;

function getThresholds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 30);
  return { today, threshold };
}

function computeStatus(expiryDate: Date): DocumentStatus {
  const { today, threshold } = getThresholds();
  if (expiryDate < today) return 'EXPIRED';
  if (expiryDate <= threshold) return 'EXPIRING_SOON';
  return 'OK';
}

function withStatus<T extends { expiryDate: Date }>(doc: T) {
  return { ...doc, status: computeStatus(doc.expiryDate) };
}

function statusToWhere(status: DocumentStatus) {
  const { today, threshold } = getThresholds();
  if (status === 'EXPIRED') return { expiryDate: { lt: today } };
  if (status === 'EXPIRING_SOON') return { expiryDate: { gte: today, lte: threshold } };
  return { expiryDate: { gt: threshold } };
}

const validOrderBy = new Set(['expiryDate', 'createdAt']);

export const documentRepository = {
  async findMany(filters: DocumentFilters = {}) {
    const {
      vehicleId,
      driverId,
      type,
      status,
      orderBy = 'expiryDate',
      order = 'asc',
    } = filters;

    const safeOrderBy = validOrderBy.has(orderBy) ? orderBy : 'expiryDate';

    const docs = await prisma.document.findMany({
      where: {
        ...(vehicleId && { vehicleId }),
        ...(driverId && { driverId }),
        ...(type && { type }),
        ...(status && statusToWhere(status)),
      },
      include: documentInclude,
      orderBy: { [safeOrderBy]: order },
    });

    return docs.map(withStatus);
  },

  async findById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: documentInclude,
    });
    return doc ? withStatus(doc) : null;
  },

  async create(data: CreateDocumentData) {
    const doc = await prisma.document.create({
      data,
      include: documentInclude,
    });
    return withStatus(doc);
  },

  async update(id: string, data: UpdateDocumentData) {
    const doc = await prisma.document.update({
      where: { id },
      data,
      include: documentInclude,
    });
    return withStatus(doc);
  },

  async delete(id: string) {
    const doc = await prisma.document.delete({
      where: { id },
      include: documentInclude,
    });
    return withStatus(doc);
  },

  countAlertsActive() {
    const { threshold } = getThresholds();
    return prisma.document.count({
      where: { expiryDate: { lte: threshold } },
    });
  },

  findNeedingAlert(days: number) {
    const threshold = new Date();
    threshold.setHours(0, 0, 0, 0);
    threshold.setDate(threshold.getDate() + days);
    return prisma.document.findMany({
      where: {
        alertSent: false,
        expiryDate: { lte: threshold },
      },
      select: { id: true },
    });
  },

  markAlertSent(ids: string[]) {
    return prisma.document.updateMany({
      where: { id: { in: ids } },
      data: { alertSent: true },
    });
  },
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/repositories/document.repository.ts
git commit -m "feat(api): add document repository with computed status"
```

---

## Task 4: Document Service (TDD)

**Files:**
- Create: `apps/api/src/services/__tests__/document.service.test.ts`
- Create: `apps/api/src/services/document.service.ts`

- [ ] **Step 1: Escrever os testes falhando**

Criar `apps/api/src/services/__tests__/document.service.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentType, DriverStatus, VehicleStatus } from '@fleet-manager/shared';
import { documentService } from '../document.service';
import { documentRepository } from '../../repositories/document.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { driverRepository } from '../../repositories/driver.repository';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/document.repository', () => ({
  documentRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countAlertsActive: vi.fn(),
  },
}));

vi.mock('../../repositories/vehicle.repository', () => ({
  vehicleRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
  },
}));

const mockVehicle = {
  id: 'vehicle-1',
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

const mockDriver = {
  id: 'driver-1',
  name: 'João Silva',
  cpf: '12345678901',
  cnh: 'CNH123',
  cnhExpiry: new Date('2027-01-01'),
  phone: null,
  status: DriverStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  vehicles: [],
};

const mockDocument = {
  id: 'doc-1',
  vehicleId: 'vehicle-1',
  vehicle: { id: 'vehicle-1', plate: 'ABC-1234' },
  driverId: null,
  driver: null,
  type: DocumentType.CRLV,
  expiryDate: new Date('2027-01-01'),
  alertSent: false,
  createdAt: new Date(),
  status: 'OK' as const,
};

describe('documentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('returns the document list from repository', async () => {
      vi.mocked(documentRepository.findMany).mockResolvedValue([mockDocument]);

      const result = await documentService.listDocuments({ vehicleId: 'vehicle-1' });

      expect(result).toEqual([mockDocument]);
      expect(documentRepository.findMany).toHaveBeenCalledWith({ vehicleId: 'vehicle-1' });
    });

    it('returns documents filtered by status EXPIRING_SOON', async () => {
      vi.mocked(documentRepository.findMany).mockResolvedValue([
        { ...mockDocument, status: 'EXPIRING_SOON' as const },
      ]);

      const result = await documentService.listDocuments({ status: 'EXPIRING_SOON' });

      expect(result[0].status).toBe('EXPIRING_SOON');
      expect(documentRepository.findMany).toHaveBeenCalledWith({ status: 'EXPIRING_SOON' });
    });
  });

  describe('getDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(documentService.getDocument('missing')).rejects.toThrow(
        new AppError(404, 'Document not found'),
      );
    });

    it('returns the document when found', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);

      const result = await documentService.getDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(documentRepository.findById).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('createDocument', () => {
    it('throws AppError 400 when neither vehicleId nor driverId is provided', async () => {
      await expect(
        documentService.createDocument({
          type: DocumentType.CRLV,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(400, 'vehicleId or driverId is required'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('throws AppError 404 when vehicle does not exist', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.createDocument({
          vehicleId: 'vehicle-1',
          type: DocumentType.CRLV,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(404, 'Vehicle not found'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('throws AppError 404 when driver does not exist', async () => {
      vi.mocked(driverRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.createDocument({
          driverId: 'driver-1',
          type: DocumentType.CNH,
          expiryDate: new Date('2027-01-01'),
        }),
      ).rejects.toThrow(new AppError(404, 'Driver not found'));

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it('creates and returns the document when vehicle exists', async () => {
      vi.mocked(vehicleRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(documentRepository.create).mockResolvedValue(mockDocument);

      const result = await documentService.createDocument({
        vehicleId: 'vehicle-1',
        type: DocumentType.CRLV,
        expiryDate: new Date('2027-01-01'),
      });

      expect(result).toEqual(mockDocument);
      expect(documentRepository.create).toHaveBeenCalledWith({
        vehicleId: 'vehicle-1',
        type: DocumentType.CRLV,
        expiryDate: new Date('2027-01-01'),
      });
    });

    it('creates and returns the document when driver exists', async () => {
      const driverDoc = {
        ...mockDocument,
        vehicleId: null,
        vehicle: null,
        driverId: 'driver-1',
        driver: { id: 'driver-1', name: 'João Silva' },
        type: DocumentType.CNH,
      };
      vi.mocked(driverRepository.findById).mockResolvedValue(mockDriver);
      vi.mocked(documentRepository.create).mockResolvedValue(driverDoc);

      const result = await documentService.createDocument({
        driverId: 'driver-1',
        type: DocumentType.CNH,
        expiryDate: new Date('2027-01-01'),
      });

      expect(result).toEqual(driverDoc);
    });
  });

  describe('updateDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(
        documentService.updateDocument('missing', { type: DocumentType.IPVA }),
      ).rejects.toThrow(new AppError(404, 'Document not found'));
    });

    it('updates and returns the document', async () => {
      const updated = { ...mockDocument, type: DocumentType.IPVA };
      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);
      vi.mocked(documentRepository.update).mockResolvedValue(updated);

      const result = await documentService.updateDocument('doc-1', { type: DocumentType.IPVA });

      expect(result).toEqual(updated);
      expect(documentRepository.update).toHaveBeenCalledWith('doc-1', { type: DocumentType.IPVA });
    });
  });

  describe('deleteDocument', () => {
    it('throws AppError 404 when document does not exist', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(null);

      await expect(documentService.deleteDocument('missing')).rejects.toThrow(
        new AppError(404, 'Document not found'),
      );
    });

    it('deletes the document', async () => {
      vi.mocked(documentRepository.findById).mockResolvedValue(mockDocument);
      vi.mocked(documentRepository.delete).mockResolvedValue(mockDocument);

      const result = await documentService.deleteDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(documentRepository.delete).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('getAlertsCount', () => {
    it('returns count from repository', async () => {
      vi.mocked(documentRepository.countAlertsActive).mockResolvedValue(5);

      const result = await documentService.getAlertsCount();

      expect(result).toBe(5);
      expect(documentRepository.countAlertsActive).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd apps/api && npx vitest run src/services/__tests__/document.service.test.ts
```

Saída esperada: FAIL — `Cannot find module '../document.service'`

- [ ] **Step 3: Implementar o service**

Criar `apps/api/src/services/document.service.ts`:

```typescript
import { AppError } from '../middlewares/error-handler';
import {
  documentRepository,
  type DocumentFilters,
  type CreateDocumentData,
  type UpdateDocumentData,
} from '../repositories/document.repository';
import { vehicleRepository } from '../repositories/vehicle.repository';
import { driverRepository } from '../repositories/driver.repository';

export const documentService = {
  async listDocuments(filters: DocumentFilters) {
    return documentRepository.findMany(filters);
  },

  async getDocument(id: string) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new AppError(404, 'Document not found');
    return doc;
  },

  async createDocument(data: CreateDocumentData) {
    if (!data.vehicleId && !data.driverId) {
      throw new AppError(400, 'vehicleId or driverId is required');
    }
    if (data.vehicleId) {
      const vehicle = await vehicleRepository.findById(data.vehicleId);
      if (!vehicle) throw new AppError(404, 'Vehicle not found');
    }
    if (data.driverId) {
      const driver = await driverRepository.findById(data.driverId);
      if (!driver) throw new AppError(404, 'Driver not found');
    }
    return documentRepository.create(data);
  },

  async updateDocument(id: string, data: UpdateDocumentData) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new AppError(404, 'Document not found');
    return documentRepository.update(id, data);
  },

  async deleteDocument(id: string) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new AppError(404, 'Document not found');
    return documentRepository.delete(id);
  },

  async getAlertsCount() {
    return documentRepository.countAlertsActive();
  },
};
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/api && npx vitest run src/services/__tests__/document.service.test.ts
```

Saída esperada: `10 passed`

- [ ] **Step 5: Rodar todos os testes da API**

```bash
cd apps/api && npm test
```

Saída esperada: todos os testes passando (anterior + 10 novos).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/document.service.ts apps/api/src/services/__tests__/document.service.test.ts
git commit -m "feat(api): add document service with TDD (10 tests)"
```

---

## Task 5: Document Controller

**Files:**
- Create: `apps/api/src/controllers/document.controller.ts`

- [ ] **Step 1: Criar o controller**

Criar `apps/api/src/controllers/document.controller.ts`:

```typescript
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DocumentType } from '@fleet-manager/shared';
import { documentService } from '../services/document.service';

const documentQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  status: z.enum(['OK', 'EXPIRING_SOON', 'EXPIRED']).optional(),
  orderBy: z.enum(['expiryDate', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const documentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = documentQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query params' });
        return;
      }
      const docs = await documentService.listDocuments(parsed.data);
      res.json(docs);
    } catch (err) {
      next(err);
    }
  },

  async alertsCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await documentService.getAlertsCount();
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.getDocument(req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.createDocument(req.body);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.deleteDocument(req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/document.controller.ts
git commit -m "feat(api): add document controller"
```

---

## Task 6: Document Routes + Registro

**Files:**
- Create: `apps/api/src/routes/document.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar o arquivo de rotas**

Criar `apps/api/src/routes/document.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { DocumentType, UserRole } from '@fleet-manager/shared';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const createDocumentSchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(DocumentType),
  expiryDate: z.coerce.date(),
});

const updateDocumentSchema = z
  .object({
    type: z.nativeEnum(DocumentType).optional(),
    expiryDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get(
  '/alerts/count',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.alertsCount,
);

documentRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.list,
);

documentRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  documentController.getById,
);

documentRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(createDocumentSchema),
  documentController.create,
);

documentRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateDocumentSchema),
  documentController.update,
);

documentRouter.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  documentController.delete,
);
```

> **Importante:** A rota `/alerts/count` deve ser registrada **antes** de `/:id` para não ser capturada como parâmetro dinâmico.

- [ ] **Step 2: Registrar o router no index.ts**

Abrir `apps/api/src/routes/index.ts` e adicionar:

```typescript
import { Router } from 'express';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';
import { driverRouter } from './driver.routes';
import { expenseRouter } from './expense.routes';
import { maintenanceRouter } from './maintenance.routes';
import { documentRouter } from './document.routes';

export const router = Router();

router.use('/users', userRouter);
router.use('/vehicles', vehicleRouter);
router.use('/drivers', driverRouter);
router.use('/expenses', expenseRouter);
router.use('/maintenances', maintenanceRouter);
router.use('/documents', documentRouter);
```

- [ ] **Step 3: Verificar TypeScript e testes**

```bash
cd apps/api && npx tsc --noEmit && npm test
```

Saída esperada: nenhum erro de TS, todos os testes passando.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/document.routes.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add document routes and register in router"
```

---

## Task 7: Cron Job de Alertas

**Files:**
- Create: `apps/api/src/jobs/alertCron.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Instalar node-cron e tipos**

```bash
cd apps/api && npm install node-cron && npm install -D @types/node-cron
```

Saída esperada: `added N packages`.

- [ ] **Step 2: Criar a pasta `jobs` e o arquivo do cron**

Criar `apps/api/src/jobs/alertCron.ts`:

```typescript
import cron from 'node-cron';
import { documentRepository } from '../repositories/document.repository';

cron.schedule('0 0 * * *', async () => {
  try {
    const docs = await documentRepository.findNeedingAlert(30);
    if (docs.length === 0) return;
    await documentRepository.markAlertSent(docs.map((d) => d.id));
    console.log(`[alertCron] ${docs.length} document(s) marked as alert sent`);
  } catch (err) {
    console.error('[alertCron] Error:', err);
  }
});
```

- [ ] **Step 3: Registrar o cron no app.ts**

Abrir `apps/api/src/app.ts` e adicionar o import do cron após os outros imports:

```typescript
import express from 'express';
import { router } from './routes';
import { errorHandler } from './middlewares/error-handler';
import './jobs/alertCron';

export const app = express();
// ... resto do arquivo inalterado
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/api && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/jobs/alertCron.ts apps/api/src/app.ts apps/api/package.json package-lock.json
git commit -m "feat(api): add alert cron job with node-cron (daily at midnight)"
```

---

## Task 8: i18n — Chaves pt-BR e en-US

**Files:**
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`

- [ ] **Step 1: Adicionar chaves ao `pt-BR.json`**

Abrir `apps/web/src/locales/pt-BR.json` e adicionar antes do `}` final:

```json
  "nav.alerts": "Alertas",
  "documents.title": "Documentos",
  "documents.subtitle": "Controle de vencimentos de CRLV, seguros, CNH e outros.",
  "documents.new": "Novo Documento",
  "documents.edit": "Editar Documento",
  "documents.formSubtitle": "Preencha os dados do documento.",
  "documents.empty": "Nenhum documento encontrado.",
  "documents.deleteConfirm": "Excluir este documento?",
  "documents.selectVehicle": "Selecione um veiculo",
  "documents.selectDriver": "Selecione um motorista",
  "documents.filters.allTypes": "Todos os tipos",
  "documents.filters.allStatuses": "Todos os status",
  "documents.entity.vehicle": "Veiculo",
  "documents.entity.driver": "Motorista",
  "documents.columns.entity": "Entidade",
  "documents.columns.type": "Tipo",
  "documents.columns.expiryDate": "Vencimento",
  "documents.columns.status": "Status",
  "documents.validation.entity": "Selecione um veiculo ou motorista.",
  "documents.validation.type": "Selecione o tipo do documento.",
  "documents.validation.expiryDate": "Informe a data de vencimento.",
  "documents.types.CRLV": "CRLV",
  "documents.types.IPVA": "IPVA",
  "documents.types.SEGURO": "Seguro",
  "documents.types.CNH": "CNH",
  "documents.types.LICENCA": "Licenca de Operacao",
  "documents.types.OUTRO": "Outro",
  "documents.statuses.OK": "Em dia",
  "documents.statuses.EXPIRING_SOON": "Vencendo em breve",
  "documents.statuses.EXPIRED": "Vencido",
  "alerts.title": "Central de Alertas",
  "alerts.subtitle": "Documentos vencidos ou vencendo nos proximos 30 dias.",
  "alerts.expired": "Vencidos",
  "alerts.expiringSoon": "Vencendo em breve",
  "alerts.empty": "Nenhum alerta ativo. Todos os documentos estao em dia.",
  "alerts.daysOverdue_one": "{{count}} dia vencido",
  "alerts.daysOverdue_other": "{{count}} dias vencidos",
  "alerts.daysRemaining_one": "Vence em {{count}} dia",
  "alerts.daysRemaining_other": "Vence em {{count}} dias",
  "alerts.viewAll": "Ver todos os documentos"
```

- [ ] **Step 2: Adicionar chaves ao `en-US.json`**

Abrir `apps/web/src/locales/en-US.json` e adicionar antes do `}` final:

```json
  "nav.alerts": "Alerts",
  "documents.title": "Documents",
  "documents.subtitle": "Track expiration of CRLV, insurance, CNH and others.",
  "documents.new": "New Document",
  "documents.edit": "Edit Document",
  "documents.formSubtitle": "Fill in the document details.",
  "documents.empty": "No documents found.",
  "documents.deleteConfirm": "Delete this document?",
  "documents.selectVehicle": "Select a vehicle",
  "documents.selectDriver": "Select a driver",
  "documents.filters.allTypes": "All types",
  "documents.filters.allStatuses": "All statuses",
  "documents.entity.vehicle": "Vehicle",
  "documents.entity.driver": "Driver",
  "documents.columns.entity": "Entity",
  "documents.columns.type": "Type",
  "documents.columns.expiryDate": "Expiry date",
  "documents.columns.status": "Status",
  "documents.validation.entity": "Select a vehicle or driver.",
  "documents.validation.type": "Select the document type.",
  "documents.validation.expiryDate": "Enter the expiry date.",
  "documents.types.CRLV": "CRLV",
  "documents.types.IPVA": "Vehicle tax",
  "documents.types.SEGURO": "Insurance",
  "documents.types.CNH": "Driver license",
  "documents.types.LICENCA": "Operating license",
  "documents.types.OUTRO": "Other",
  "documents.statuses.OK": "Up to date",
  "documents.statuses.EXPIRING_SOON": "Expiring soon",
  "documents.statuses.EXPIRED": "Expired",
  "alerts.title": "Alert Center",
  "alerts.subtitle": "Documents expired or expiring within the next 30 days.",
  "alerts.expired": "Expired",
  "alerts.expiringSoon": "Expiring soon",
  "alerts.empty": "No active alerts. All documents are up to date.",
  "alerts.daysOverdue_one": "{{count}} day overdue",
  "alerts.daysOverdue_other": "{{count}} days overdue",
  "alerts.daysRemaining_one": "Expires in {{count}} day",
  "alerts.daysRemaining_other": "Expires in {{count}} days",
  "alerts.viewAll": "View all documents"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/locales/pt-BR.json apps/web/src/locales/en-US.json
git commit -m "feat(web): add i18n keys for documents and alerts"
```

---

## Task 9: Frontend Hooks — useDocuments e useAlertCount

**Files:**
- Create: `apps/web/src/hooks/useDocuments.ts`
- Create: `apps/web/src/hooks/useAlertCount.ts`

- [ ] **Step 1: Criar `useDocuments.ts`**

Criar `apps/web/src/hooks/useDocuments.ts`:

```typescript
import { useEffect, useState } from 'react'
import { DocumentType } from '@fleet-manager/shared'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import type { DocumentStatus } from '@fleet-manager/shared'

export interface DocumentItem {
  id: string
  vehicleId: string | null
  vehicle: { id: string; plate: string } | null
  driverId: string | null
  driver: { id: string; name: string } | null
  type: DocumentType
  expiryDate: string
  alertSent: boolean
  status: DocumentStatus
  createdAt: string
}

export interface DocumentFilters {
  vehicleId?: string
  driverId?: string
  type?: DocumentType | ''
  status?: DocumentStatus | ''
  orderBy?: 'expiryDate' | 'createdAt'
  order?: 'asc' | 'desc'
}

export function useDocuments(filters: DocumentFilters = {}) {
  const getToken = useToken()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const queryFilters = JSON.parse(filterKey) as DocumentFilters
        const params = new URLSearchParams()

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })

        const queryString = params.toString()
        const data = await apiFetch<DocumentItem[]>(
          `/documents${queryString ? `?${queryString}` : ''}`,
          token,
        )

        if (!cancelled) setDocuments(data)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filterKey, getToken, reloadToken])

  return {
    documents,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1),
  }
}
```

- [ ] **Step 2: Criar `useAlertCount.ts`**

Criar `apps/web/src/hooks/useAlertCount.ts`:

```typescript
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToken } from '@/hooks/useToken'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export function useAlertCount() {
  const getToken = useToken()
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      try {
        const token = await getToken()
        const data = await apiFetch<{ count: number }>('/documents/alerts/count', token)
        if (!cancelled) setCount(data.count)
      } catch {
        // silently fail — badge simply won't update
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [getToken])

  return { count, loading }
}
```

- [ ] **Step 3: Verificar TypeScript do frontend**

```bash
cd apps/web && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useDocuments.ts apps/web/src/hooks/useAlertCount.ts
git commit -m "feat(web): add useDocuments and useAlertCount hooks"
```

---

## Task 10: DocumentList page + rota + Sidebar

**Files:**
- Create: `apps/web/src/pages/DocumentList.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Criar `DocumentList.tsx`**

Criar `apps/web/src/pages/DocumentList.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DocumentType } from '@fleet-manager/shared'
import { useDocuments } from '@/hooks/useDocuments'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'
import { canManageFleet } from '@/lib/roles'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { DocumentStatus } from '@fleet-manager/shared'

function getStatusClasses(status: DocumentStatus) {
  if (status === 'EXPIRED') return 'bg-red-100 text-red-700'
  if (status === 'EXPIRING_SOON') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

export function DocumentList() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const getToken = useToken()
  const { vehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const { drivers } = useDrivers()
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [type, setType] = useState<DocumentType | ''>('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')

  const canDelete = canManageFleet(user)

  const { documents, loading, error, reload } = useDocuments({
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
    type,
    status,
  })

  async function handleDelete(id: string) {
    if (!window.confirm(t('documents.deleteConfirm'))) return

    try {
      const token = await getToken()
      await apiFetch(`/documents/${id}`, token, { method: 'DELETE' })
      reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('documents.title')}</h1>
          <p className="text-sm text-gray-500">{t('documents.subtitle')}</p>
        </div>
        <Link
          to="/documents/new"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('documents.new')}
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <select
          value={vehicleId}
          onChange={(e) => { setVehicleId(e.target.value); setDriverId('') }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('documents.entity.vehicle')}: todos</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} • {v.brand} {v.model}
            </option>
          ))}
        </select>
        <select
          value={driverId}
          onChange={(e) => { setDriverId(e.target.value); setVehicleId('') }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('documents.entity.driver')}: todos</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType | '')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('documents.filters.allTypes')}</option>
          {Object.values(DocumentType).map((dt) => (
            <option key={dt} value={dt}>{t(`documents.types.${dt}`)}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DocumentStatus | '')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('documents.filters.allStatuses')}</option>
          {(['OK', 'EXPIRING_SOON', 'EXPIRED'] as DocumentStatus[]).map((s) => (
            <option key={s} value={s}>{t(`documents.statuses.${s}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">{t('documents.columns.entity')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.expiryDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('documents.columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      {t('documents.empty')}
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {doc.vehicle ? (
                          <>
                            {doc.vehicle.plate}
                            <div className="text-xs text-gray-500">{t('documents.entity.vehicle')}</div>
                          </>
                        ) : doc.driver ? (
                          <>
                            {doc.driver.name}
                            <div className="text-xs text-gray-500">{t('documents.entity.driver')}</div>
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{t(`documents.types.${doc.type}`)}</td>
                      <td className="px-4 py-3">
                        {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(doc.status)}`}>
                          {t(`documents.statuses.${doc.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/documents/${doc.id}/edit`}
                            className="text-blue-600 hover:underline"
                          >
                            {t('actions.edit')}
                          </Link>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-600 hover:underline"
                            >
                              {t('actions.remove')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Adicionar rotas de documento no `App.tsx`**

Abrir `apps/web/src/App.tsx`. Adicionar os imports:

```typescript
import { DocumentList } from '@/pages/DocumentList'
import { DocumentForm } from '@/pages/DocumentForm'
import { AlertCenter } from '@/pages/AlertCenter'
```

Adicionar as rotas dentro do bloco protegido (após `/maintenances/new`):

```tsx
<Route path="/documents" element={<DocumentList />} />
<Route path="/documents/new" element={<DocumentForm />} />
<Route path="/documents/:id/edit" element={<DocumentForm />} />
<Route path="/alerts" element={<AlertCenter />} />
```

- [ ] **Step 3: Habilitar "Documentos" e adicionar "Alertas" no Sidebar**

Abrir `apps/web/src/components/Sidebar.tsx`.

Adicionar import de `Bell` e `useAlertCount`:

```typescript
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
import { useAlertCount } from '@/hooks/useAlertCount'
```

Adicionar `const { count: alertCount } = useAlertCount()` dentro da função `Sidebar()`, antes do `return`.

Substituir o array `navItems` por:

```typescript
const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, labelKey: 'nav.dashboard',    enabled: true  },
  { to: '/vehicles',     icon: Car,             labelKey: 'nav.vehicles',     enabled: true  },
  { to: '/drivers',      icon: Users,           labelKey: 'nav.drivers',      enabled: true  },
  { to: '/expenses',     icon: Receipt,         labelKey: 'nav.expenses',     enabled: true  },
  { to: '/maintenances', icon: Wrench,          labelKey: 'nav.maintenances', enabled: true  },
  { to: '/documents',    icon: FileText,        labelKey: 'nav.documents',    enabled: true  },
  { to: '/alerts',       icon: Bell,            labelKey: 'nav.alerts',       enabled: true  },
  { to: '/users',        icon: UserCog,         labelKey: 'nav.users',        enabled: false },
]
```

No JSX do NavLink habilitado, adicionar o badge após `{t(labelKey)}`:

```tsx
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
  <span className="flex-1">{t(labelKey)}</span>
  {(to === '/documents' || to === '/alerts') && alertCount > 0 && (
    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white min-w-[1.25rem]">
      {alertCount}
    </span>
  )}
</NavLink>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/DocumentList.tsx apps/web/src/App.tsx apps/web/src/components/Sidebar.tsx
git commit -m "feat(web): add DocumentList page, routes, and sidebar badge"
```

---

## Task 11: DocumentForm page

**Files:**
- Create: `apps/web/src/pages/DocumentForm.tsx`

- [ ] **Step 1: Criar `DocumentForm.tsx`**

Criar `apps/web/src/pages/DocumentForm.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentType } from '@fleet-manager/shared'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useToken } from '@/hooks/useToken'
import { apiFetch } from '@/lib/api'
import type { DocumentItem } from '@/hooks/useDocuments'

type EntityType = 'vehicle' | 'driver'

interface DocumentFormState {
  entityType: EntityType
  vehicleId: string
  driverId: string
  type: DocumentType
  expiryDate: string
}

const initialForm: DocumentFormState = {
  entityType: 'vehicle',
  vehicleId: '',
  driverId: '',
  type: DocumentType.CRLV,
  expiryDate: '',
}

export function DocumentForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const getToken = useToken()
  const isEditing = Boolean(id)

  const { vehicles, loading: loadingVehicles } = useVehicles({ orderBy: 'plate', order: 'asc' })
  const { drivers, loading: loadingDrivers } = useDrivers()

  const [form, setForm] = useState<DocumentFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) return

    async function loadDocument() {
      try {
        const token = await getToken()
        const doc = await apiFetch<DocumentItem>(`/documents/${id}`, token)
        setForm({
          entityType: doc.vehicleId ? 'vehicle' : 'driver',
          vehicleId: doc.vehicleId ?? '',
          driverId: doc.driverId ?? '',
          type: doc.type,
          expiryDate: doc.expiryDate.split('T')[0],
        })
      } catch (err) {
        setError((err as Error).message)
      }
    }

    loadDocument()
  }, [id, isEditing, getToken])

  function updateField<Key extends keyof DocumentFormState>(
    key: Key,
    value: DocumentFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const entityId = form.entityType === 'vehicle' ? form.vehicleId : form.driverId
    if (!entityId) {
      setError(t('documents.validation.entity'))
      return
    }

    if (!form.expiryDate) {
      setError(t('documents.validation.expiryDate'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const token = await getToken()
      const body =
        form.entityType === 'vehicle'
          ? { vehicleId: form.vehicleId, type: form.type, expiryDate: form.expiryDate }
          : { driverId: form.driverId, type: form.type, expiryDate: form.expiryDate }

      if (isEditing) {
        await apiFetch(`/documents/${id}`, token, {
          method: 'PUT',
          body: JSON.stringify({ type: form.type, expiryDate: form.expiryDate }),
        })
      } else {
        await apiFetch('/documents', token, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      navigate('/documents')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? t('documents.edit') : t('documents.new')}
        </h1>
        <p className="text-sm text-gray-500">{t('documents.formSubtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {!isEditing && (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('documents.columns.entity')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="vehicle"
                      checked={form.entityType === 'vehicle'}
                      onChange={() => updateField('entityType', 'vehicle')}
                    />
                    {t('documents.entity.vehicle')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="driver"
                      checked={form.entityType === 'driver'}
                      onChange={() => updateField('entityType', 'driver')}
                    />
                    {t('documents.entity.driver')}
                  </label>
                </div>
              </div>

              {form.entityType === 'vehicle' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('documents.entity.vehicle')}
                  </label>
                  <select
                    disabled={loadingVehicles}
                    value={form.vehicleId}
                    onChange={(e) => updateField('vehicleId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('documents.selectVehicle')}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} • {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('documents.entity.driver')}
                  </label>
                  <select
                    disabled={loadingDrivers}
                    value={form.driverId}
                    onChange={(e) => updateField('driverId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('documents.selectDriver')}</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('documents.columns.type')}
            </label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value as DocumentType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(DocumentType).map((dt) => (
                <option key={dt} value={dt}>
                  {t(`documents.types.${dt}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('documents.columns.expiryDate')}
            </label>
            <input
              required
              type="date"
              value={form.expiryDate}
              onChange={(e) => updateField('expiryDate', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/DocumentForm.tsx
git commit -m "feat(web): add DocumentForm page (create and edit)"
```

---

## Task 12: AlertCenter + Header bell + pageTitleMatchers

**Files:**
- Create: `apps/web/src/pages/AlertCenter.tsx`
- Modify: `apps/web/src/components/Header.tsx`

- [ ] **Step 1: Criar `AlertCenter.tsx`**

Criar `apps/web/src/pages/AlertCenter.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocuments } from '@/hooks/useDocuments'
import type { DocumentStatus } from '@fleet-manager/shared'
import type { DocumentItem } from '@/hooks/useDocuments'

function getDaysLabel(expiryDate: string, status: DocumentStatus, t: (key: string, opts?: object) => string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (status === 'EXPIRED') {
    return t('alerts.daysOverdue_other', { count: Math.abs(diffDays) })
  }
  return t('alerts.daysRemaining_other', { count: diffDays })
}

function DocumentAlertRow({ doc, t }: { doc: DocumentItem; t: (key: string, opts?: object) => string }) {
  const isExpired = doc.status === 'EXPIRED'
  const entityLabel = doc.vehicle ? doc.vehicle.plate : (doc.driver?.name ?? '-')

  return (
    <div className={`flex items-center justify-between rounded-md border px-4 py-3 ${
      isExpired ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
    }`}>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {entityLabel} — {t(`documents.types.${doc.type}`)}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(doc.expiryDate).toLocaleDateString('pt-BR')} •{' '}
          {getDaysLabel(doc.expiryDate, doc.status, t)}
        </p>
      </div>
      <Link
        to="/documents"
        className="text-xs text-blue-600 hover:underline"
      >
        {t('alerts.viewAll')}
      </Link>
    </div>
  )
}

export function AlertCenter() {
  const { t } = useTranslation()

  const { documents: expiredDocs, loading: loadingExpired } = useDocuments({ status: 'EXPIRED' })
  const { documents: expiringSoonDocs, loading: loadingExpiring } = useDocuments({ status: 'EXPIRING_SOON' })

  const loading = loadingExpired || loadingExpiring
  const hasAlerts = expiredDocs.length > 0 || expiringSoonDocs.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('alerts.title')}</h1>
        <p className="text-sm text-gray-500">{t('alerts.subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : !hasAlerts ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-green-700">{t('alerts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {expiredDocs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                {t('alerts.expired')} ({expiredDocs.length})
              </h2>
              {expiredDocs.map((doc) => (
                <DocumentAlertRow key={doc.id} doc={doc} t={t} />
              ))}
            </section>
          )}
          {expiringSoonDocs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                {t('alerts.expiringSoon')} ({expiringSoonDocs.length})
              </h2>
              {expiringSoonDocs.map((doc) => (
                <DocumentAlertRow key={doc.id} doc={doc} t={t} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar `Header.tsx` — adicionar ícone de sino e pageTitleMatchers**

Substituir o conteúdo completo de `apps/web/src/components/Header.tsx`:

```typescript
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAlertCount } from '@/hooks/useAlertCount'

const pageTitleMatchers: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/dashboard$/, key: 'dashboard.title' },
  { pattern: /^\/vehicles(?:\/.*)?$/, key: 'vehicles.title' },
  { pattern: /^\/drivers(?:\/.*)?$/, key: 'drivers.title' },
  { pattern: /^\/expenses(?:\/.*)?$/, key: 'expenses.title' },
  { pattern: /^\/maintenances(?:\/.*)?$/, key: 'maintenances.title' },
  { pattern: /^\/documents(?:\/.*)?$/, key: 'documents.title' },
  { pattern: /^\/alerts$/, key: 'alerts.title' },
]

export function Header() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { count } = useAlertCount()

  const toggleLanguage = () => {
    const next = i18n.language === 'pt-BR' ? 'en-US' : 'pt-BR'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const titleKey =
    pageTitleMatchers.find(({ pattern }) => pattern.test(pathname))?.key ?? 'app.name'

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h2 className="text-sm font-semibold text-gray-800">{t(titleKey)}</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/alerts')}
          className="relative text-gray-500 hover:text-gray-800 transition-colors"
          aria-label={t('alerts.title')}
        >
          <Bell size={18} />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white min-w-[1rem]">
              {count}
            </span>
          )}
        </button>
        <button
          onClick={toggleLanguage}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1 transition-colors"
        >
          {t('lang.switch')}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Verificar TypeScript do frontend**

```bash
cd apps/web && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 4: Verificar todos os testes da API**

```bash
cd apps/api && npm test
```

Saída esperada: todos os testes passando (agora inclui os 10 de documents).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/AlertCenter.tsx apps/web/src/components/Header.tsx
git commit -m "feat(web): add AlertCenter page and Header bell notification"
```

---

## Task 13: Atualizar CLAUDE.md e verificação final

- [ ] **Step 1: Rodar verificação completa**

```bash
cd "c:/Users/User/OneDrive/Documentos/PFI - FLEET MANAGER" && npm run test:api
```

Saída esperada: todos os testes passando.

```bash
cd apps/web && npx tsc --noEmit
```

Saída esperada: nenhum erro.

```bash
cd apps/api && npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Step 2: Atualizar CLAUDE.md**

No `CLAUDE.md`, na seção `### 🔄 Em Andamento`, remover a sprint 4 se estiver listada.

Na seção `#### Sprint 4 — Documentos e Alertas`, marcar todos os checkboxes:

```markdown
#### Sprint 4 — Documentos e Alertas (issues: #20, #5, #34–#37) — COMPLETA
- [x] [#20] API de documentos obrigatórios (backend)
- [x] [#5] Job de alertas de vencimento com node-cron (backend)
- [x] [#34] Tela de listagem de documentos com status de vencimento
- [x] [#35] Formulário de cadastro de documentos
- [x] [#36] Central de alertas de vencimento
- [x] [#37] Notificações visuais de alertas no sidebar/header
```

Atualizar a data de "Última atualização":

```
> **Última atualização:** 2026-04-17 (Sprint 4 — COMPLETA: documentos, alertas, cron job, badge no sidebar e sino no header)
```

Adicionar ao histórico:

```markdown
| 2026-04-17 | Claude/Codex | Sprint 4: API de documentos | `document.repository` com status computado, `document.service` (TDD com 10 testes), controller e rotas `/documents` + `/documents/alerts/count`. Migration `DocumentType` enum. |
| 2026-04-17 | Claude/Codex | Sprint 4: Cron job de alertas | `alertCron.ts` com node-cron, executa diariamente à meia-noite, marca `alertSent=true` para docs vencendo em 30 dias. |
| 2026-04-17 | Claude/Codex | Sprint 4: Frontend documentos e alertas | `DocumentList`, `DocumentForm`, `AlertCenter`, `useDocuments`, `useAlertCount`. Badge no Sidebar, sino no Header, i18n pt-BR/en-US atualizado. |
```

- [ ] **Step 3: Commit final**

```bash
git add CLAUDE.md
git commit -m "docs: mark Sprint 4 as complete in CLAUDE.md"
```

---

## Checklist de Verificação Final

Antes de considerar o Sprint 4 completo, confirmar:

- [ ] `npm run test:api` — todos os testes passando (68+ testes)
- [ ] `cd apps/api && npx tsc --noEmit` — sem erros
- [ ] `cd apps/web && npx tsc --noEmit` — sem erros
- [ ] Servidor sobe: `npm run dev:api` responde em `localhost:3000/health`
- [ ] `GET /api/documents` retorna `[]` com status 200
- [ ] `GET /api/documents/alerts/count` retorna `{ count: 0 }` com status 200
- [ ] Frontend carrega `/documents` sem erro
- [ ] Frontend carrega `/documents/new` e permite criar documento
- [ ] Frontend carrega `/alerts` sem erro
- [ ] Badge no Sidebar aparece em `/documents` e `/alerts` quando count > 0
- [ ] Sino no Header navega para `/alerts` ao clicar
