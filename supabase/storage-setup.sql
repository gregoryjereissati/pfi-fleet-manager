-- ---------------------------------------------------------------------------
-- Fleet Manager — Configuração do Supabase Storage
-- ---------------------------------------------------------------------------
-- Recria o bucket de arquivos de documentos e as políticas de acesso
-- necessárias para o upload realizado pelo frontend.
--
-- Como executar: painel do Supabase > SQL Editor > New query > colar > Run.
--
-- Contexto: o Fleet Manager usa o Supabase Auth. O navegador envia os arquivos
-- ao Storage com a sessão do usuário autenticado, portanto na role
-- `authenticated`. Sem a política de INSERT abaixo, o upload falha com
-- "new row violates row-level security policy".
-- ---------------------------------------------------------------------------

-- 1. Bucket público de documentos -------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- 2. Row Level Security ------------------------------------------------------
alter table storage.objects enable row level security;

-- 3. Upload de arquivos por usuários autenticados ---------------------------
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

-- 4. Substituição e remoção de arquivos pelo usuário autenticado ------------
drop policy if exists "Allow authenticated document updates" on storage.objects;

create policy "Allow authenticated document updates"
on storage.objects
for update
to authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

drop policy if exists "Allow authenticated document deletes" on storage.objects;

create policy "Allow authenticated document deletes"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documents');

-- 5. Leitura dos arquivos ----------------------------------------------------
-- Necessária para que getPublicUrl() funcione na listagem e no preview.
-- O bucket é público: quem possuir a URL acessa o arquivo sem autenticação.
drop policy if exists "Allow public document reads" on storage.objects;

create policy "Allow public document reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'documents');
