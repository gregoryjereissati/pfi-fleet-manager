-- ---------------------------------------------------------------------------
-- Fleet Manager — Configuração do Supabase Storage
-- ---------------------------------------------------------------------------
-- Este script recria o bucket de arquivos de documentos e as políticas de
-- acesso necessárias para o upload feito pelo frontend.
--
-- Como executar: painel do Supabase > SQL Editor > New query > colar > Run.
--
-- Contexto: o Fleet Manager usa autenticação própria (JWT assinado pela API),
-- e não o Supabase Auth. Por isso o navegador envia os arquivos ao Storage
-- usando a role `anon`. Sem a política de INSERT abaixo, o upload falha com
-- "new row violates row-level security policy".
-- ---------------------------------------------------------------------------

-- 1. Bucket público de documentos -------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- 2. Row Level Security ------------------------------------------------------
alter table storage.objects enable row level security;

-- 3. Upload de arquivos pelo frontend ---------------------------------------
-- Restringe as extensões aceitas, já que não há validação server-side.
drop policy if exists "Allow anon document uploads" on storage.objects;

create policy "Allow anon document uploads"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'documents'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

-- 4. Leitura pública dos arquivos -------------------------------------------
-- Necessária para que getPublicUrl() funcione na listagem e no preview.
drop policy if exists "Allow public document reads" on storage.objects;

create policy "Allow public document reads"
on storage.objects
for select
to anon
using (bucket_id = 'documents');
