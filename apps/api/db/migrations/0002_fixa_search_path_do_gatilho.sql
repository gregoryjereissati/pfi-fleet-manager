-- =============================================================================
-- 0002 — Fixa o search_path da função de gatilho
-- =============================================================================
-- Uma função sem `search_path` declarado resolve nomes pelo caminho de busca de
-- quem a executa. Se alguém conseguir criar um objeto em um schema que venha
-- antes no caminho, passa a decidir qual `now()` a função chama.
--
-- O risco aqui é pequeno — a função é curta e roda como gatilho — mas a correção
-- não custa nada: o caminho passa a ser fixo e a única função usada é
-- qualificada pelo catálogo.
-- =============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Mantém updated_at na escrita. Aplicado por gatilho em toda tabela que possui '
  'a coluna. search_path fixo: a resolução de nomes não depende de quem executa.';
