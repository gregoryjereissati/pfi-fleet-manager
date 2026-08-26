-- ---------------------------------------------------------------------------
-- Fleet Manager — Configuração do Supabase Storage
-- ---------------------------------------------------------------------------
-- Cria o bucket de arquivos de documentos e as políticas de acesso
-- necessárias para o upload realizado pelo frontend.
--
-- Como executar: painel do Supabase > SQL Editor > New query > colar > Run.
--
-- Contexto: o Fleet Manager usa o Supabase Auth. O navegador envia os arquivos
-- ao Storage com a sessão do usuário autenticado, portanto na role
-- `authenticated`. Sem a política de INSERT abaixo, o upload falha com
-- "new row violates row-level security policy".
--
-- SOBRE A PROPRIEDADE DA TABELA storage.objects
--   A tabela storage.objects pertence ao papel `supabase_storage_admin`, e não
--   ao `postgres` usado pelo SQL Editor. Como o PostgreSQL exige ser dono da
--   tabela para criar políticas, o bloco de políticas abaixo assume esse papel
--   com SET ROLE antes de executá-las.
--
--   Também por isso NÃO há um "alter table storage.objects enable row level
--   security" neste script: além de exigir propriedade, o RLS já vem
--   habilitado nessa tabela por padrão no Supabase.
--
--   Caso o SET ROLE falhe no seu projeto, use a alternativa pelo painel,
--   descrita ao final deste arquivo.
-- ---------------------------------------------------------------------------

-- 1. Bucket público de documentos -------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- 2. Políticas de acesso -----------------------------------------------------
set role supabase_storage_admin;

-- 2.1. Upload de arquivos por usuários autenticados
-- Restringe as extensões aceitas, já que não há validação server-side.
drop policy if exists "Allow anon document uploads" on storage.objects;
drop policy if exists "Allow authenticated document uploads" on storage.objects;

create policy "Allow authenticated document uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

-- 2.2. Substituição de arquivos
drop policy if exists "Allow authenticated document updates" on storage.objects;

create policy "Allow authenticated document updates"
on storage.objects
for update
to authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

-- 2.3. Remoção de arquivos
drop policy if exists "Allow authenticated document deletes" on storage.objects;

create policy "Allow authenticated document deletes"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documents');

-- 2.4. Leitura pelos usuários autenticados
-- O bucket é público, portanto a leitura por URL direta independe de política.
-- Esta política atende às consultas de listagem feitas pelo cliente.
drop policy if exists "Allow public document reads" on storage.objects;

create policy "Allow public document reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'documents');

reset role;

-- ---------------------------------------------------------------------------
-- ALTERNATIVA — criar as políticas pelo painel
-- ---------------------------------------------------------------------------
-- Caso o comando SET ROLE acima seja rejeitado, execute apenas a seção 1
-- (criação do bucket) e configure as políticas pela interface:
--
--   Storage > Policies > selecionar o bucket `documents` > New policy
--
-- Criar quatro políticas sobre o bucket `documents`:
--
--   | Operação | Papéis permitidos        |
--   |----------|--------------------------|
--   | INSERT   | authenticated            |
--   | UPDATE   | authenticated            |
--   | DELETE   | authenticated            |
--   | SELECT   | anon, authenticated      |
--
-- A restrição de extensões (jpg, jpeg, png, webp, pdf) aplicada na política de
-- INSERT é a única validação de tipo de arquivo existente, já que o upload não
-- passa pela API. Se as políticas forem criadas pelo painel sem essa
-- verificação, o sistema continua funcionando, porém sem essa restrição.
-- ---------------------------------------------------------------------------
