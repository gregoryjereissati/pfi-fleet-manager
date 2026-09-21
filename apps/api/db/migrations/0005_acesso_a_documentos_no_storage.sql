-- =============================================================================
-- 0005 — Função de autorização dos anexos no Storage
-- =============================================================================
-- Os arquivos anexados aos documentos vivem no bucket `documents` do Supabase
-- Storage, fora das tabelas da aplicação. O isolamento por empresa que vale
-- para as linhas **não** alcançava os arquivos: as políticas do bucket
-- verificavam apenas que o pedido vinha de alguém autenticado, sem olhar de
-- qual empresa. Qualquer usuário do sistema podia listar, baixar, sobrescrever
-- e apagar anexo de qualquer empresa.
--
-- A correção é recortar o acesso pelo primeiro segmento do caminho do arquivo,
-- que passa a ser o identificador da empresa.
--
-- Por que uma função, e não a consulta direta na política
-- ------------------------------------------------------
-- Uma política de `storage.objects` é avaliada como o papel `authenticated`. A
-- tabela `public.users` tem RLS habilitada e nenhuma política, de modo que
-- esse papel não enxerga linha alguma nela. Uma subconsulta direta voltaria
-- sempre vazia e a política negaria tudo, inclusive o acesso legítimo.
--
-- `security definer` faz a função executar com os privilégios de quem a criou,
-- atravessando a RLS de forma controlada: ela não devolve dados, apenas
-- responde sim ou não sobre o pedido em questão. O `search_path` fixo impede
-- que a resolução de nomes dependa de quem chama.
-- =============================================================================

create or replace function public.pode_acessar_documentos(prefixo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      -- Situação conta: perfil pendente, recusado ou bloqueado perde o acesso
      -- aos arquivos junto com o resto, sem depender de limpeza manual.
      and u.status = 'ACTIVE'
      and (
        u.company_id::text = prefixo
        -- O super administrador opera em qualquer empresa. Aqui o alcance dele
        -- não se limita à empresa que escolheu na sessão: o Storage não tem
        -- como saber dessa escolha, que é um conceito da API. Não amplia o que
        -- ele já pode ver — entrando na empresa, ele veria os mesmos arquivos —
        -- mas é mais largo do que o recorte da sessão. Fechar essa diferença
        -- exige servir os arquivos pela API, com URL assinada.
        or u.is_super_admin
      )
  )
$$;

comment on function public.pode_acessar_documentos(text) is
  'Responde se quem está autenticado pode alcançar arquivos sob o prefixo '
  'informado, que é o identificador da empresa dona. Usada pelas políticas do '
  'bucket "documents". Não devolve dados: apenas sim ou não.';

-- A função é chamada pelas políticas do Storage, avaliadas como `authenticated`.
-- Nenhum outro papel precisa dela.
revoke all on function public.pode_acessar_documentos(text) from public;
grant execute on function public.pode_acessar_documentos(text) to authenticated;
