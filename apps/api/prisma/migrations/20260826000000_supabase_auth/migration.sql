-- Migração para o Supabase Auth
--
-- As credenciais passam a ser gerenciadas pelo Supabase Auth (auth.users).
-- A tabela User deixa de armazenar senha e passa a referenciar a conta de
-- acesso pelo identificador emitido pelo Supabase.

-- AlterTable: vincula o perfil à conta do Supabase Auth
ALTER TABLE "User" ADD COLUMN "authUserId" TEXT;

-- AlterTable: a senha deixa de ser responsabilidade da aplicação
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
