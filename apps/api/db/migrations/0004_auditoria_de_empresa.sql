-- =============================================================================
-- 0004 — Auditoria de ações sobre a empresa
-- =============================================================================
-- Criar uma empresa, ativá-la e desativá-la são atos do super administrador da
-- plataforma. Sem esta entidade no histórico, seriam as únicas ações do sistema
-- sem rastro — justamente as de maior alcance, porque decidem quem tem acesso
-- a quê antes de qualquer permissão dentro da empresa existir.
--
-- `ALTER TYPE ... ADD VALUE` roda dentro de transação no PostgreSQL 12 ou
-- superior; o valor novo só não pode ser **usado** na mesma transação, o que
-- não acontece aqui.
-- =============================================================================

alter type audit_entity add value 'COMPANY';
