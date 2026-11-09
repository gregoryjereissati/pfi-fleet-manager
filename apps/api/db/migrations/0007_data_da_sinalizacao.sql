-- =============================================================================
-- 0007 — Data em que a rotina diária sinalizou o documento
-- =============================================================================
-- A rotina diária marca os documentos que entram na janela de aviso de 30
-- dias (`alert_sent`). A marca era só um booleano, e nenhuma tela a mostrava:
-- o efeito da rotina ficava invisível para quem usa o sistema.
--
-- `alert_sent_at` registra quando a sinalização aconteceu, e a central de
-- alertas passa a exibi-la. Documentos sinalizados antes desta migration ficam
-- com a data nula: o momento em que isso ocorreu não foi registrado, e
-- inventar uma data seria pior do que admitir que ela não existe.
--
-- A renovação de um documento (nova data de vencimento) passa a limpar as duas
-- colunas, para que a rotina volte a sinalizá-lo quando o novo prazo se
-- aproximar. Essa limpeza é da aplicação; aqui só a coluna nasce.
-- =============================================================================

alter table documents add column alert_sent_at timestamptz;

comment on column documents.alert_sent_at is
  'Quando a rotina diária sinalizou o documento. Nula se não sinalizado ou se sinalizado antes da 0007.';
