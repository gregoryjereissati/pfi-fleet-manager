-- ===========================================================================
-- Fleet Manager — Criação completa do banco de dados
-- ===========================================================================
-- Este script recria toda a estrutura relacional do sistema em um banco
-- PostgreSQL vazio. É equivalente à aplicação de todas as migrations do
-- Prisma versionadas em apps/api/prisma/migrations/.
--
-- QUANDO USAR ESTE SCRIPT
--   Quando você preferir criar o schema pelo SQL Editor do Supabase, sem
--   configurar a connection string na máquina local.
--
-- ALTERNATIVA RECOMENDADA
--   Com DATABASE_URL e DIRECT_URL configuradas em apps/api/.env:
--       cd apps/api && npx prisma migrate deploy
--   O resultado é idêntico e o controle de migrations fica automático.
--
-- COMO EXECUTAR
--   1. Painel do Supabase > SQL Editor > New query
--   2. Colar este arquivo inteiro e executar
--   3. Executar em seguida supabase/storage-setup.sql (anexo de arquivos)
--   4. Popular os dados: cd apps/api && npx prisma db seed
--
-- IMPORTANTE
--   Este script cria apenas a ESTRUTURA (tabelas, enums, chaves e índices).
--   Os dados de demonstração são inseridos pelo seed, que precisa da
--   connection string porque gera os hashes de senha com bcrypt.
-- ===========================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FUEL', 'MAINTENANCE', 'FINE', 'IPVA', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'DONE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CRLV', 'IPVA', 'SEGURO', 'CNH', 'LICENCA', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "addressStreet" TEXT NOT NULL,
    "addressNumber" TEXT NOT NULL,
    "addressDistrict" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressState" TEXT NOT NULL,
    "addressZip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "cnhExpiry" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "type" "DocumentType" NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VehicleDrivers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VehicleDrivers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cpf_key" ON "Driver"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cnh_key" ON "Driver"("cnh");

-- CreateIndex
CREATE INDEX "_VehicleDrivers_B_index" ON "_VehicleDrivers"("B");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VehicleDrivers" ADD CONSTRAINT "_VehicleDrivers_A_fkey" FOREIGN KEY ("A") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VehicleDrivers" ADD CONSTRAINT "_VehicleDrivers_B_fkey" FOREIGN KEY ("B") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Registro das migrations do Prisma
-- ===========================================================================
-- Marca as migrations como já aplicadas, para que um futuro
-- `prisma migrate deploy` reconheça o banco como atualizado em vez de
-- tentar recriar as tabelas. Os checksums correspondem aos arquivos
-- versionados em apps/api/prisma/migrations/.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations"
    (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
VALUES
    (gen_random_uuid()::text, 'ef0375da26f0e00834602bc89b76cdb5a2162229c66c678bf1e462247da142be', now(), '20260415182317_init',                        now(), 1),
    (gen_random_uuid()::text, '6d3651c42b9d62701be1d7427e9feb52e64bad991fb1a54147a59b3a879d8379', now(), '20260417223832_add_document_type_enum',      now(), 1),
    (gen_random_uuid()::text, '2623c2d7d4d8b10d286546d80fa64849e7b4b6a1c6e8be74813e2c135cb4860b', now(), '20260429003345_add_user_status',             now(), 1),
    (gen_random_uuid()::text, '94cc5f182752233fb90344f3e814e0f44cb58a2f544d9dd6f60f9b179cdca962', now(), '20260506000000_remove_auth0_add_custom_auth', now(), 1),
    (gen_random_uuid()::text, '2e37ae300fef3353511a5d46556ec4042b657de1aae8b3883cbf5d28044c1055', now(), '20260526172511_add_file_url_to_document',    now(), 1)
ON CONFLICT (id) DO NOTHING;
