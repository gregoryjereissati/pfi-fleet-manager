-- AlterTable: remove auth0Id, add custom auth fields
ALTER TABLE "User"
DROP COLUMN "auth0Id",
ADD COLUMN "cpf" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressStreet" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressDistrict" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressCity" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressState" TEXT NOT NULL DEFAULT '',
ADD COLUMN "addressZip" TEXT NOT NULL DEFAULT '';

-- AlterTable: change status default to PENDING
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
