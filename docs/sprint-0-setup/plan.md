# Fleet Manager — Pré-Sprint: Monorepo, Banco, Backend Core e Autenticação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar o monorepo completo com npm workspaces, PostgreSQL via Docker, schema Prisma com todas as entidades, servidor Express com TypeScript e middlewares de autenticação Auth0/JWT + RBAC.

**Architecture:** Monorepo npm workspaces com `apps/api` (Express + Layered Architecture), `apps/web` (reservado para Sprint 1) e `packages/shared` (tipos TypeScript compartilhados). Autenticação via JWT do Auth0 validado com `jose`. Validação de corpo de requisições com Zod. Testes unitários com Vitest.

**Tech Stack:** Node.js 20, TypeScript 5.7, Express 4, Prisma 6, PostgreSQL 16 (Docker), Auth0, jose 5, Zod 3, Vitest 2, tsx

**Repo:** https://github.com/gregoryjereissati/pfi-fleet-manager

---

## Mapa de Arquivos

```
fleet-manager/
├── package.json                          ← root workspaces
├── tsconfig.base.json                    ← TypeScript base config
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── .env.example
├── docker-compose.yml
│
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── enums/index.ts            ← UserRole, ExpenseType, etc.
│           ├── dtos/
│           │   ├── user.dto.ts
│           │   ├── vehicle.dto.ts
│           │   ├── driver.dto.ts
│           │   ├── expense.dto.ts
│           │   ├── maintenance.dto.ts
│           │   ├── document.dto.ts
│           │   └── index.ts
│           └── index.ts
│
└── apps/
    └── api/
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── prisma/
        │   ├── schema.prisma
        │   └── seed.ts
        └── src/
            ├── server.ts                 ← entrypoint
            ├── app.ts                    ← Express app + rotas
            ├── config/
            │   ├── env.ts                ← variáveis de ambiente validadas com Zod
            │   └── database.ts           ← singleton PrismaClient
            ├── types/
            │   └── express.d.ts          ← augment Request com req.user
            ├── middlewares/
            │   ├── authenticate.ts       ← valida JWT Auth0
            │   ├── authorize.ts          ← verifica role (RBAC)
            │   ├── validate.ts           ← valida body com Zod
            │   ├── error-handler.ts      ← AppError + handler global
            │   └── __tests__/
            │       ├── authenticate.test.ts
            │       ├── authorize.test.ts
            │       └── validate.test.ts
            ├── repositories/
            │   └── user.repository.ts
            ├── services/
            │   ├── user.service.ts
            │   └── __tests__/
            │       └── user.service.test.ts
            ├── controllers/
            │   └── user.controller.ts
            └── routes/
                ├── user.routes.ts
                └── index.ts
```

---

## Task 1: Inicializar Git e Monorepo Root

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `.eslintrc.js`
- Create: `apps/api/package.json`
- Create: `packages/shared/package.json`

- [ ] **Step 1: Inicializar git e conectar ao repositório remoto**

```bash
cd "C:\Users\User\OneDrive\Documentos\PFI - FLEET MANAGER"
git init
git remote add origin https://github.com/gregoryjereissati/pfi-fleet-manager.git
```

- [ ] **Step 2: Criar estrutura de diretórios**

```bash
mkdir -p apps/api apps/web packages/shared
```

- [ ] **Step 3: Criar `package.json` raiz**

```json
{
  "name": "fleet-manager",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:api": "npm run dev --workspace=apps/api",
    "build:api": "npm run build --workspace=apps/api",
    "test": "npm run test --workspaces --if-present",
    "test:api": "npm run test --workspace=apps/api",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Criar `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Criar `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.env
.DS_Store
coverage/
.superpowers/
```

- [ ] **Step 6: Criar `.prettierrc`**

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 7: Criar `.eslintrc.js`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
```

- [ ] **Step 8: Criar `packages/shared/package.json`**

```json
{
  "name": "@fleet-manager/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 9: Criar `apps/api/package.json`**

```json
{
  "name": "@fleet-manager/api",
  "version": "1.0.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@fleet-manager/shared": "*",
    "@prisma/client": "^6.0.0",
    "dotenv": "^16.4.0",
    "express": "^4.21.0",
    "jose": "^5.9.0",
    "node-cron": "^3.0.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "@types/node-cron": "^3.0.11",
    "@types/supertest": "^6.0.2",
    "@vitest/coverage-v8": "^2.0.0",
    "prisma": "^6.0.0",
    "supertest": "^7.0.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.19.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 10: Criar `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 11: Instalar dependências**

```bash
npm install
```

Esperado: sem erros, `node_modules` criado na raiz e em cada workspace.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.base.json .gitignore .prettierrc .eslintrc.js \
  apps/api/package.json apps/api/tsconfig.json packages/shared/package.json
git commit -m "chore: initialize monorepo with npm workspaces"
```

---

## Task 2: packages/shared — Enums

**Files:**
- Create: `packages/shared/src/enums/index.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Criar `packages/shared/src/enums/index.ts`**

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ExpenseType {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  FINE = 'FINE',
  IPVA = 'IPVA',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  DONE = 'DONE',
  OVERDUE = 'OVERDUE',
}
```

- [ ] **Step 2: Criar `packages/shared/src/index.ts` (stub — será expandido na Task 3)**

```typescript
export * from './enums';
```

- [ ] **Step 3: Verificar que TypeScript compila sem erros**

```bash
cd packages/shared && npx tsc --noEmit --strict src/index.ts
```

Esperado: nenhuma saída (sem erros).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/
git commit -m "feat(shared): add domain enums"
```

---

## Task 3: packages/shared — DTOs

**Files:**
- Create: `packages/shared/src/dtos/user.dto.ts`
- Create: `packages/shared/src/dtos/vehicle.dto.ts`
- Create: `packages/shared/src/dtos/driver.dto.ts`
- Create: `packages/shared/src/dtos/expense.dto.ts`
- Create: `packages/shared/src/dtos/maintenance.dto.ts`
- Create: `packages/shared/src/dtos/document.dto.ts`
- Create: `packages/shared/src/dtos/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Criar `packages/shared/src/dtos/user.dto.ts`**

```typescript
import { UserRole } from '../enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRoleDto {
  role: UserRole;
}
```

- [ ] **Step 2: Criar `packages/shared/src/dtos/vehicle.dto.ts`**

```typescript
import { VehicleStatus } from '../enums';

export interface VehicleDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleDto {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
}

export interface UpdateVehicleDto {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: VehicleStatus;
}
```

- [ ] **Step 3: Criar `packages/shared/src/dtos/driver.dto.ts`**

```typescript
import { DriverStatus } from '../enums';

export interface DriverDto {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  cnhExpiry: string;
  phone?: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverDto {
  name: string;
  cpf: string;
  cnh: string;
  cnhExpiry: string;
  phone?: string;
}

export interface UpdateDriverDto {
  name?: string;
  cnh?: string;
  cnhExpiry?: string;
  phone?: string;
  status?: DriverStatus;
}
```

- [ ] **Step 4: Criar `packages/shared/src/dtos/expense.dto.ts`**

```typescript
import { ExpenseType } from '../enums';

export interface ExpenseDto {
  id: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

export interface CreateExpenseDto {
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateExpenseDto {
  type?: ExpenseType;
  amount?: number;
  date?: string;
  description?: string;
}
```

- [ ] **Step 5: Criar `packages/shared/src/dtos/maintenance.dto.ts`**

```typescript
import { MaintenanceType, MaintenanceStatus } from '../enums';

export interface MaintenanceDto {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  createdAt: string;
}

export interface CreateMaintenanceDto {
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
}

export interface UpdateMaintenanceDto {
  status?: MaintenanceStatus;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
}
```

- [ ] **Step 6: Criar `packages/shared/src/dtos/document.dto.ts`**

```typescript
export interface DocumentDto {
  id: string;
  vehicleId?: string;
  driverId?: string;
  type: string;
  expiryDate: string;
  alertSent: boolean;
  createdAt: string;
}

export interface CreateDocumentDto {
  vehicleId?: string;
  driverId?: string;
  type: string;
  expiryDate: string;
}

export interface UpdateDocumentDto {
  type?: string;
  expiryDate?: string;
}
```

- [ ] **Step 7: Criar `packages/shared/src/dtos/index.ts`**

```typescript
export * from './user.dto';
export * from './vehicle.dto';
export * from './driver.dto';
export * from './expense.dto';
export * from './maintenance.dto';
export * from './document.dto';
```

- [ ] **Step 8: Atualizar `packages/shared/src/index.ts`**

```typescript
export * from './enums';
export * from './dtos';
```

- [ ] **Step 9: Verificar compilação**

```bash
cd packages/shared && npx tsc --noEmit --strict src/index.ts
```

Esperado: nenhum erro.

- [ ] **Step 10: Commit**

```bash
git add packages/shared/src/dtos/ packages/shared/src/index.ts
git commit -m "feat(shared): add DTOs for all entities"
```

---

## Task 4: Docker Compose + Variáveis de Ambiente

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env` (não comitar — já no .gitignore)

- [ ] **Step 1: Criar `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: fleet-manager-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: fleet_manager
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Criar `.env.example` na raiz (documentação — commitado)**

```
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fleet_manager"
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.fleet-manager.com
```

- [ ] **Step 3: Criar `apps/api/.env` com os valores reais de desenvolvimento (não commitado)**

O `dotenv/config` em `apps/api` carrega o `.env` do diretório `apps/api/`, não da raiz. Por isso o `.env` real fica em `apps/api/.env`.

```bash
cp .env.example apps/api/.env
```

Abrir `apps/api/.env` e preencher `AUTH0_DOMAIN` e `AUTH0_AUDIENCE` com os valores reais do tenant Auth0 do projeto. O `DATABASE_URL` já está correto para o Docker local.

- [ ] **Step 4: Subir banco de dados**

```bash
docker compose up -d
```

Esperado:
```
✔ Container fleet-manager-db  Started
```

- [ ] **Step 5: Verificar conexão**

```bash
docker exec fleet-manager-db psql -U postgres -c "\l"
```

Esperado: listagem de bancos incluindo `fleet_manager`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose for local PostgreSQL and env example"
```

---

## Task 5: Prisma Schema

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Inicializar Prisma em `apps/api`**

```bash
cd apps/api && npx prisma init --datasource-provider postgresql
```

Isso cria `prisma/schema.prisma` e `apps/api/.env` com um `DATABASE_URL` placeholder. O `apps/api/.env` que criamos na Task 4 já tem o valor correto — o `prisma init` vai sobrescrever esse arquivo. Após o comando, confirmar que `apps/api/.env` ainda tem os valores corretos (PORT, AUTH0_DOMAIN, etc). Se tiver sido sobrescrito, copiar novamente:

```bash
cp ../../.env.example apps/api/.env
# editar apps/api/.env com valores reais
```

- [ ] **Step 2: Substituir conteúdo de `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MANAGER
  OPERATOR
}

enum VehicleStatus {
  ACTIVE
  INACTIVE
}

enum DriverStatus {
  ACTIVE
  INACTIVE
}

enum ExpenseType {
  FUEL
  MAINTENANCE
  FINE
  IPVA
  INSURANCE
  OTHER
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
}

enum MaintenanceStatus {
  SCHEDULED
  DONE
  OVERDUE
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      UserRole @default(OPERATOR)
  auth0Id   String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Vehicle {
  id           String        @id @default(cuid())
  plate        String        @unique
  brand        String
  model        String
  year         Int
  color        String
  status       VehicleStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  expenses     Expense[]
  maintenances Maintenance[]
  documents    Document[]
  drivers      Driver[]      @relation("VehicleDrivers")
}

model Driver {
  id        String       @id @default(cuid())
  name      String
  cpf       String       @unique
  cnh       String       @unique
  cnhExpiry DateTime
  phone     String?
  status    DriverStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  vehicles  Vehicle[]    @relation("VehicleDrivers")
  documents Document[]
}

model Expense {
  id          String      @id @default(cuid())
  vehicleId   String
  vehicle     Vehicle     @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  type        ExpenseType
  amount      Decimal     @db.Decimal(10, 2)
  date        DateTime
  description String?
  createdAt   DateTime    @default(now())
}

model Maintenance {
  id            String            @id @default(cuid())
  vehicleId     String
  vehicle       Vehicle           @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  type          MaintenanceType
  status        MaintenanceStatus @default(SCHEDULED)
  description   String
  scheduledDate DateTime
  completedDate DateTime?
  createdAt     DateTime          @default(now())
}

model Document {
  id         String   @id @default(cuid())
  vehicleId  String?
  vehicle    Vehicle? @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  driverId   String?
  driver     Driver?  @relation(fields: [driverId], references: [id], onDelete: Cascade)
  type       String
  expiryDate DateTime
  alertSent  Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api): add Prisma schema with all entities"
```

---

## Task 6: Prisma Migration e Seed

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Rodar a primeira migration**

```bash
cd apps/api && npx prisma migrate dev --name init
```

Esperado:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your schema.
```

- [ ] **Step 2: Gerar Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 3: Criar `apps/api/prisma/seed.ts`**

```typescript
import { PrismaClient, UserRole, VehicleStatus, DriverStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet-manager.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@fleet-manager.com',
      role: UserRole.ADMIN,
      auth0Id: 'auth0|seed-admin-000',
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'ABC-1234' },
    update: {},
    create: {
      plate: 'ABC-1234',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      color: 'Prata',
      status: VehicleStatus.ACTIVE,
    },
  });

  const driver = await prisma.driver.upsert({
    where: { cpf: '123.456.789-00' },
    update: {},
    create: {
      name: 'João Silva',
      cpf: '123.456.789-00',
      cnh: '12345678901',
      cnhExpiry: new Date('2027-12-31'),
      phone: '(85) 99999-0001',
      status: DriverStatus.ACTIVE,
    },
  });

  console.log('Seed concluído:', { admin, vehicle, driver });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Rodar o seed**

```bash
npx prisma db seed
```

Esperado:
```
Seed concluído: { admin: {...}, vehicle: {...}, driver: {...} }
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(api): add migration init and seed data"
```

---

## Task 7: Express App, Config e Error Handler

**Files:**
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/database.ts`
- Create: `apps/api/src/types/express.d.ts`
- Create: `apps/api/src/middlewares/error-handler.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`

- [ ] **Step 1: Criar `apps/api/src/config/env.ts`**

```typescript
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string(),
  AUTH0_DOMAIN: z.string(),
  AUTH0_AUDIENCE: z.string(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Variáveis de ambiente inválidas:', result.error.format());
  process.exit(1);
}

export const env = result.data;
```

- [ ] **Step 2: Criar `apps/api/src/config/database.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Criar `apps/api/src/types/express.d.ts`**

```typescript
import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
```

- [ ] **Step 4: Criar `apps/api/src/middlewares/error-handler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
```

- [ ] **Step 5: Criar `apps/api/src/app.ts`**

```typescript
import express from 'express';
import { router } from './routes';
import { errorHandler } from './middlewares/error-handler';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use(errorHandler);
```

- [ ] **Step 6: Criar `apps/api/src/routes/index.ts` (stub — expandido em Tasks seguintes)**

```typescript
import { Router } from 'express';

export const router = Router();
```

- [ ] **Step 7: Criar `apps/api/src/server.ts`**

```typescript
import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});
```

- [ ] **Step 8: Verificar que o servidor sobe**

```bash
cd apps/api && npm run dev
```

Esperado: `🚀 Server running on http://localhost:3000`

Testar em outro terminal:
```bash
curl http://localhost:3000/health
```
Esperado: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add Express server, config, and error handler"
```

---

## Task 8: Vitest Setup + Middleware de Autenticação (TDD)

**Files:**
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/middlewares/__tests__/authenticate.test.ts`
- Create: `apps/api/src/middlewares/authenticate.ts`

- [ ] **Step 1: Criar `apps/api/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@fleet-manager/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
```

- [ ] **Step 2: Escrever o teste para `authenticate`**

Criar `apps/api/src/middlewares/__tests__/authenticate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

vi.mock('../../config/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    AUTH0_DOMAIN: 'test.auth0.com',
    AUTH0_AUDIENCE: 'https://api.test.com',
  },
}));

import { jwtVerify } from 'jose';
import { prisma } from '../../config/database';
import { authenticate } from '../authenticate';

const mockUser = {
  id: 'user-1',
  auth0Id: 'auth0|123',
  name: 'Test User',
  email: 'test@test.com',
  role: 'ADMIN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authenticate', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('retorna 401 quando header Authorization está ausente', async () => {
    const req = makeReq();
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando token é inválido', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid'));
    const req = makeReq('Bearer bad-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('retorna 401 quando usuário não está cadastrado', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|unknown' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not registered' });
  });

  it('chama next e define req.user quando token é válido', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|123' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const req = makeReq('Bearer valid-token') as Request & { user?: typeof mockUser };
    const res = makeRes();
    const nextFn = vi.fn();

    await authenticate(req, res, nextFn);

    expect(req.user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que FALHA (arquivo não existe)**

```bash
cd apps/api && npm test
```

Esperado: `Error: Cannot find module '../authenticate'`

- [ ] **Step 4: Implementar `apps/api/src/middlewares/authenticate.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { prisma } from '../config/database';

const JWKS = createRemoteJWKSet(
  new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`),
);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: env.AUTH0_AUDIENCE,
      issuer: `https://${env.AUTH0_DOMAIN}/`,
    });

    if (!payload.sub) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { auth0Id: payload.sub } });

    if (!user) {
      res.status(401).json({ error: 'User not registered' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 5: Rodar os testes e confirmar que PASSAM**

```bash
cd apps/api && npm test
```

Esperado: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/vitest.config.ts apps/api/src/middlewares/
git commit -m "feat(api): add authenticate middleware with Auth0/JWT (TDD)"
```

---

## Task 9: Middleware de Autorização RBAC (TDD)

**Files:**
- Create: `apps/api/src/middlewares/__tests__/authorize.test.ts`
- Create: `apps/api/src/middlewares/authorize.ts`

- [ ] **Step 1: Escrever o teste**

Criar `apps/api/src/middlewares/__tests__/authorize.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize } from '../authorize';
import { UserRole } from '@fleet-manager/shared';

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authorize', () => {
  it('retorna 401 quando req.user não está definido', () => {
    const req = { user: undefined } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 quando role do usuário não está na lista permitida', () => {
    const req = { user: { role: UserRole.OPERATOR } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next quando role do usuário está permitido', () => {
    const req = { user: { role: UserRole.MANAGER } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN, UserRole.MANAGER)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('chama next quando somente um role é exigido e o usuário o possui', () => {
    const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar e confirmar FALHA**

```bash
cd apps/api && npm test
```

Esperado: `Error: Cannot find module '../authorize'`

- [ ] **Step 3: Implementar `apps/api/src/middlewares/authorize.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@fleet-manager/shared';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
```

- [ ] **Step 4: Rodar e confirmar que PASSAM**

```bash
cd apps/api && npm test
```

Esperado: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middlewares/authorize.ts apps/api/src/middlewares/__tests__/authorize.test.ts
git commit -m "feat(api): add authorize middleware for RBAC (TDD)"
```

---

## Task 10: Middleware de Validação com Zod (TDD)

**Files:**
- Create: `apps/api/src/middlewares/__tests__/validate.test.ts`
- Create: `apps/api/src/middlewares/validate.ts`

- [ ] **Step 1: Escrever o teste**

Criar `apps/api/src/middlewares/__tests__/validate.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../validate';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  year: z.number().int().min(1900).max(2100),
});

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('validate', () => {
  it('retorna 400 com detalhes quando body é inválido', () => {
    const req = { body: { name: '', year: 1800 } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error', details: expect.any(Object) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next e sobrescreve req.body com dados parseados quando válido', () => {
    const req = { body: { name: 'Toyota', year: 2022 } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'Toyota', year: 2022 });
  });

  it('remove campos extras do body (strip)', () => {
    const req = { body: { name: 'Toyota', year: 2022, extra: 'campo' } } as Request;
    const res = makeRes();
    const next = vi.fn();

    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Toyota', year: 2022 });
    expect(req.body.extra).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar FALHA**

```bash
cd apps/api && npm test
```

Esperado: `Error: Cannot find module '../validate'`

- [ ] **Step 3: Implementar `apps/api/src/middlewares/validate.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
```

- [ ] **Step 4: Rodar e confirmar que PASSAM**

```bash
cd apps/api && npm test
```

Esperado: `11 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middlewares/validate.ts apps/api/src/middlewares/__tests__/validate.test.ts
git commit -m "feat(api): add validate middleware with Zod (TDD)"
```

---

## Task 11: Users — Repository e Service (TDD)

**Files:**
- Create: `apps/api/src/repositories/user.repository.ts`
- Create: `apps/api/src/services/user.service.ts`
- Create: `apps/api/src/services/__tests__/user.service.test.ts`

- [ ] **Step 1: Criar `apps/api/src/repositories/user.repository.ts`**

```typescript
import { UserRole } from '@fleet-manager/shared';
import { prisma } from '../config/database';

export const userRepository = {
  findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByAuth0Id(auth0Id: string) {
    return prisma.user.findUnique({ where: { auth0Id } });
  },

  updateRole(id: string, role: UserRole) {
    return prisma.user.update({ where: { id }, data: { role } });
  },
};
```

- [ ] **Step 2: Escrever o teste para `userService`**

Criar `apps/api/src/services/__tests__/user.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../../middlewares/error-handler';

vi.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    updateRole: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  auth0Id: 'auth0|1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('userService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listUsers', () => {
    it('retorna a lista de usuários', async () => {
      vi.mocked(userRepository.findAll).mockResolvedValue([mockUser]);

      const result = await userService.listUsers();

      expect(result).toEqual([mockUser]);
      expect(userRepository.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('updateRole', () => {
    it('lança AppError 404 quando usuário não existe', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.updateRole('inexistente', UserRole.MANAGER)).rejects.toThrow(
        new AppError(404, 'User not found'),
      );
      expect(userRepository.updateRole).not.toHaveBeenCalled();
    });

    it('atualiza e retorna o usuário com o novo role', async () => {
      const updated = { ...mockUser, role: UserRole.MANAGER };
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.updateRole).mockResolvedValue(updated);

      const result = await userService.updateRole('user-1', UserRole.MANAGER);

      expect(result).toEqual(updated);
      expect(userRepository.updateRole).toHaveBeenCalledWith('user-1', UserRole.MANAGER);
    });
  });
});
```

- [ ] **Step 3: Rodar e confirmar FALHA**

```bash
cd apps/api && npm test
```

Esperado: `Error: Cannot find module '../user.service'`

- [ ] **Step 4: Implementar `apps/api/src/services/user.service.ts`**

```typescript
import { UserRole } from '@fleet-manager/shared';
import { AppError } from '../middlewares/error-handler';
import { userRepository } from '../repositories/user.repository';

export const userService = {
  async listUsers() {
    return userRepository.findAll();
  },

  async updateRole(id: string, role: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'User not found');
    return userRepository.updateRole(id, role);
  },
};
```

- [ ] **Step 5: Rodar e confirmar que PASSAM**

```bash
cd apps/api && npm test
```

Esperado: `14 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/repositories/ apps/api/src/services/
git commit -m "feat(api): add user repository and service (TDD)"
```

---

## Task 12: Users — Controller, Routes e Smoke Test

**Files:**
- Create: `apps/api/src/controllers/user.controller.ts`
- Create: `apps/api/src/routes/user.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar `apps/api/src/controllers/user.controller.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@fleet-manager/shared';
import { userService } from '../services/user.service';

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const userController = {
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }
      const user = await userService.updateRole(req.params.id, parsed.data.role);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 2: Criar `apps/api/src/routes/user.routes.ts`**

```typescript
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { UserRole } from '@fleet-manager/shared';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/', authorize(UserRole.ADMIN), userController.listUsers);
userRouter.patch('/:id/role', authorize(UserRole.ADMIN), userController.updateRole);
```

- [ ] **Step 3: Atualizar `apps/api/src/routes/index.ts`**

```typescript
import { Router } from 'express';
import { userRouter } from './user.routes';

export const router = Router();

router.use('/users', userRouter);
```

- [ ] **Step 4: Rodar todos os testes para garantir nada quebrou**

```bash
cd apps/api && npm test
```

Esperado: `14 passed`

- [ ] **Step 5: Subir servidor e testar endpoint `/health`**

```bash
cd apps/api && npm run dev
```

Em outro terminal:
```bash
curl http://localhost:3000/health
```

Esperado: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 6: Commit final do Pré-Sprint**

```bash
git add apps/api/src/controllers/ apps/api/src/routes/
git commit -m "feat(api): add users controller and routes — pre-sprint complete"
```

---

## Checklist de Conclusão do Pré-Sprint

Antes de iniciar a Sprint 1, verificar:

- [ ] `docker compose up -d` sobe PostgreSQL sem erros
- [ ] `npm run dev:api` sobe servidor em `localhost:3000`
- [ ] `curl localhost:3000/health` retorna `{"status":"ok"}`
- [ ] `npm run test:api` passa todos os 14 testes
- [ ] `npx prisma studio` (em `apps/api`) abre e mostra as tabelas com dados do seed
- [ ] Variáveis `AUTH0_DOMAIN` e `AUTH0_AUDIENCE` estão preenchidas no `.env`

---

## Próximos Planos

Após concluir este plano, um novo plano será escrito para cada sprint:

| Plano | Conteúdo |
|---|---|
| `2026-04-14-sprint-1.md` | Auth0 frontend, i18n, Dashboard (estrutura) |
| `sprint-2.md` | CRUD Veículos e Motoristas (backend + frontend) |
| `sprint-3.md` | Despesas e Manutenções (backend + frontend) |
| `sprint-4.md` | Documentos e Alertas (backend + frontend) |
| `sprint-5.md` | Dashboard real, Usuários ADMIN, Testes |
| `sprint-6.md` | Deploy Vercel + AWS ECS + AWS RDS |
