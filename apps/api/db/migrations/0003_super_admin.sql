-- =============================================================================
-- 0003 — Super administrador da plataforma
-- =============================================================================
-- Introduz um perfil que existe **acima** das empresas: ele não pertence a
-- nenhuma e pode operar dentro de qualquer uma, escolhendo qual a cada sessão.
--
-- Por que uma coluna própria, e não um valor novo em `user_role`
-- -------------------------------------------------------------
-- O papel é dado de entrada em dois pontos: o cadastro grava `requested_role`
-- a partir do que o candidato pede, e a aprovação grava `role` a partir do que
-- o administrador escolhe. Ambos são validados contra o enum. Acrescentar
-- SUPER_ADMIN ali tornaria possível pedir — ou conceder — a condição de super
-- administrador por esses caminhos, o que seria escalação de privilégio.
--
-- Uma coluna à parte não tem caminho ligando a entrada do usuário a ela. A
-- proteção passa a ser estrutural, e não uma guarda que alguém precisa lembrar
-- de manter nas duas validações.
--
-- `user_role` permanece significando "papel **dentro de** uma empresa", que é
-- o que ele sempre quis dizer.
-- =============================================================================

alter table users
  add column is_super_admin boolean not null default false;

comment on column users.is_super_admin is
  'Perfil da plataforma: não pertence a empresa alguma e pode operar dentro de '
  'qualquer uma, escolhendo qual a cada sessão. Não é um papel: papel descreve '
  'a posição da pessoa dentro de uma empresa. Só é concedida por script, com '
  'acesso ao banco — não existe caminho que leve entrada do usuário até aqui.';

-- Pertencer a uma empresa e estar acima de todas são condições mutuamente
-- exclusivas. Sem isto, um super administrador com empresa teria dois recortes
-- possíveis e o sistema teria de escolher um deles em tempo de execução.
alter table users
  add constraint users_super_admin_sem_empresa check (
    (is_super_admin and company_id is null)
    or (not is_super_admin)
  );

-- O caso inverso — perfil comum sem empresa — continua **permitido** no banco,
-- de propósito: o modelo prevê perfis que não puderam ser atribuídos, e a
-- autenticação já os recusa com NO_COMPANY. Transformar isso em restrição
-- impediria o registro de existir, e é justamente a existência dele que torna
-- a situação visível e corrigível pelo administrador.

-- Índice parcial: são pouquíssimas linhas, e a listagem de super
-- administradores não deve varrer a tabela inteira de usuários.
create index users_super_admin_idx on users (is_super_admin) where is_super_admin;
