-- =============================================================================
-- 0001 — Estrutura inicial do Fleet Manager
-- =============================================================================
-- Consolida o modelo de empresas, usuários, motoristas, vínculos com período,
-- autoria dos lançamentos e histórico de alterações.
--
-- Convenções adotadas nesta reconstrução, diferentes do esquema gerado
-- anteriormente pelo Prisma:
--
--   * Identificadores em snake_case minúsculo, sem aspas. A conversão para
--     camelCase acontece na borda do driver, não no SQL.
--   * Chaves primárias `uuid` com `gen_random_uuid()`, geradas pelo banco.
--     Antes eram `cuid()` gerados no cliente pelo Prisma.
--   * `updated_at` mantido por gatilho, não pela camada de aplicação.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
-- Os rótulos são idênticos aos do modelo anterior: a API os expõe diretamente
-- e o frontend os consome. Renomeá-los quebraria o contrato das respostas.

create type user_role as enum ('ADMIN', 'MANAGER', 'OPERATOR');
create type user_status as enum ('PENDING', 'ACTIVE', 'BLOCKED', 'REJECTED');
create type company_status as enum ('ACTIVE', 'INACTIVE');
create type vehicle_status as enum ('ACTIVE', 'INACTIVE');
create type driver_status as enum ('ACTIVE', 'INACTIVE');
create type expense_type as enum ('FUEL', 'MAINTENANCE', 'FINE', 'IPVA', 'INSURANCE', 'OTHER');
create type maintenance_type as enum ('PREVENTIVE', 'CORRECTIVE');
create type maintenance_status as enum ('SCHEDULED', 'DONE', 'OVERDUE', 'CANCELLED');
create type entry_status as enum ('ACTIVE', 'CANCELLED');
create type document_type as enum ('CRLV', 'IPVA', 'SEGURO', 'CNH', 'LICENCA', 'OUTRO');
create type audit_entity as enum ('EXPENSE', 'MAINTENANCE', 'DOCUMENT', 'VEHICLE', 'DRIVER', 'USER', 'ASSIGNMENT');
create type audit_action as enum ('CREATE', 'UPDATE', 'CANCEL', 'UNCANCEL', 'DELETE', 'LINK', 'UNLINK');

comment on type entry_status is
  'Situação de um lançamento. CANCELLED anula o efeito do lançamento sem apagar '
  'o registro: ele permanece na lista, marcado, e sai de todos os totais.';

-- -----------------------------------------------------------------------------
-- Gatilho de atualização de timestamp
-- -----------------------------------------------------------------------------
-- Sem Prisma, `updated_at` deixa de ser responsabilidade do cliente. Mantê-lo
-- no banco garante que nenhum caminho de escrita — inclusive SQL manual e o
-- seed — consiga esquecer de atualizá-lo.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Mantém updated_at na escrita. Aplicado por gatilho em toda tabela que possui a coluna.';

-- -----------------------------------------------------------------------------
-- company
-- -----------------------------------------------------------------------------

create table companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  cnpj       text unique,
  join_code  text not null unique,
  status     company_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table companies is
  'Empresa cliente. É a fronteira de isolamento do sistema: nenhuma consulta '
  'atravessa esta relação.';
comment on column companies.join_code is
  'Código opaco apresentado pelo candidato no cadastro para identificar a empresa '
  'em que deseja acesso. Não concede permissão alguma: apenas direciona a '
  'solicitação ao administrador correto.';

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

create table users (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references companies (id),
  name             text not null,
  email            text not null unique,
  cpf              text not null unique,
  phone            text not null,
  auth_user_id     uuid unique,
  role             user_role not null default 'OPERATOR',
  requested_role   user_role not null default 'OPERATOR',
  status           user_status not null default 'PENDING',
  address_street   text not null,
  address_number   text not null,
  address_district text not null,
  address_city     text not null,
  address_state    text not null,
  address_zip      text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column users.company_id is
  'Nulo apenas em perfis que não puderam ser atribuídos a uma empresa. '
  'A autenticação recusa o acesso nesse caso.';
comment on column users.auth_user_id is
  'Identificador do usuário no Supabase Auth (auth.users.id). Nulo enquanto o '
  'perfil ainda não foi vinculado a uma conta de acesso. Sem chave estrangeira '
  'declarada: o schema auth é gerenciado pelo Supabase e não deve ser acoplado.';
comment on column users.role is
  'Papel efetivo. Só passa a valer quando status é ACTIVE.';
comment on column users.requested_role is
  'Papel solicitado no cadastro. Guardado à parte para que uma solicitação nunca '
  'se converta sozinha em permissão efetiva.';

create index users_company_id_status_idx on users (company_id, status);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------

create table vehicles (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  plate      text not null,
  brand      text not null,
  model      text not null,
  year       integer not null,
  color      text not null,
  status     vehicle_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicles_company_id_plate_key unique (company_id, plate)
);

create index vehicles_company_id_status_idx on vehicles (company_id, status);

create trigger vehicles_set_updated_at
  before update on vehicles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- drivers
-- -----------------------------------------------------------------------------

create table drivers (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  user_id    uuid unique references users (id),
  name       text,
  cpf        text,
  cnh        text,
  cnh_expiry date,
  phone      text,
  status     driver_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint drivers_company_id_cpf_key unique (company_id, cpf),
  constraint drivers_company_id_cnh_key unique (company_id, cnh),

  -- A identidade da pessoa pertence ao usuário vinculado. Enquanto houve
  -- cadastros independentes, a ficha guardava nome e CPF próprios; com
  -- `user_id` preenchido, duplicá-los abriria caminho para divergência.
  constraint drivers_identidade_nao_duplicada check (
    user_id is null or (name is null and cpf is null)
  ),
  -- Ficha sem usuário vinculado precisa identificar a pessoa de alguma forma.
  constraint drivers_identidade_presente check (
    user_id is not null or name is not null
  )
);

comment on table drivers is
  'Ficha operacional do motorista. Quando user_id está preenchido, a identidade '
  'da pessoa — nome e CPF — pertence ao usuário e não é duplicada aqui.';
comment on column drivers.cnh_expiry is
  'Data civil, sem hora: o vencimento da habilitação não tem horário nem depende '
  'do fuso de quem consulta.';

create index drivers_company_id_status_idx on drivers (company_id, status);

create trigger drivers_set_updated_at
  before update on drivers
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- vehicle_driver_assignments
-- -----------------------------------------------------------------------------

create table vehicle_driver_assignments (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id),
  vehicle_id      uuid not null references vehicles (id) on delete cascade,
  driver_id       uuid not null references drivers (id) on delete cascade,
  start_date      timestamptz not null,
  end_date        timestamptz,
  start_estimated boolean not null default false,

  -- Chave que existe apenas enquanto o vínculo está vigente. Encerrar o vínculo
  -- a anula. Como o Postgres trata nulos como distintos em índice único, a
  -- restrição abaixo impede dois vínculos vigentes para o mesmo par — inclusive
  -- sob concorrência — sem restringir o histórico, em que o mesmo par pode
  -- repetir-se à vontade.
  --
  -- Coluna gerada: no modelo anterior a aplicação era responsável por mantê-la
  -- coerente com end_date. Derivá-la no banco elimina a possibilidade de um
  -- caminho de escrita esquecer de anulá-la ao encerrar o vínculo.
  active_link_key text generated always as (
    case when end_date is null then vehicle_id::text || ':' || driver_id::text end
  ) stored,

  created_by_id   uuid,
  ended_by_id     uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint vehicle_driver_assignments_company_id_active_link_key_key
    unique (company_id, active_link_key),
  constraint vehicle_driver_assignments_periodo_coerente check (
    end_date is null or end_date >= start_date
  )
);

comment on table vehicle_driver_assignments is
  'Vínculo entre motorista e veículo, com período. O vínculo vigora da atribuição '
  'até ser encerrado explicitamente; não há vencimento automático. Desvincular '
  'grava end_date — nunca apaga a linha, de modo que o histórico permaneça '
  'consultável.';
comment on column vehicle_driver_assignments.start_estimated is
  'Verdadeiro nos vínculos cuja data de início é uma estimativa. A interface a '
  'apresenta como tal até alguém confirmá-la.';

create index vehicle_driver_assignments_company_vehicle_end_idx
  on vehicle_driver_assignments (company_id, vehicle_id, end_date);
create index vehicle_driver_assignments_company_driver_end_idx
  on vehicle_driver_assignments (company_id, driver_id, end_date);

create trigger vehicle_driver_assignments_set_updated_at
  before update on vehicle_driver_assignments
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------

create table expenses (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id),
  vehicle_id      uuid not null references vehicles (id) on delete cascade,
  type            expense_type not null,
  amount          numeric(10, 2) not null,
  date            timestamptz not null,
  description     text,
  status          entry_status not null default 'ACTIVE',
  created_by_id   uuid,
  updated_by_id   uuid,
  cancelled_at    timestamptz,
  cancelled_by_id uuid,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint expenses_amount_positivo check (amount > 0),
  -- Cancelamento é um estado composto: a situação e a marcação temporal andam
  -- juntas, para que nenhum total seja calculado sobre um registro meio-cancelado.
  constraint expenses_cancelamento_coerente check (
    (status = 'CANCELLED') = (cancelled_at is not null)
  )
);

comment on column expenses.created_by_id is
  'Autor do lançamento. Identificador simples, sem chave estrangeira declarada '
  'para users: remover um usuário não deve alterar nem apagar os lançamentos '
  'dele. O nome legível vem do histórico, que o grava por cópia. Nulo nos '
  'lançamentos sem autoria registrada — a interface apresenta "autor não '
  'registrado" e nunca atribui a ninguém.';
comment on column expenses.amount is
  'Valor monetário. numeric, nunca ponto flutuante. O driver o entrega como '
  'string para que a precisão não se perca no JavaScript.';

create index expenses_company_id_date_idx on expenses (company_id, date);
create index expenses_company_id_status_date_idx on expenses (company_id, status, date);
create index expenses_company_id_vehicle_id_date_idx on expenses (company_id, vehicle_id, date);
create index expenses_company_id_created_by_id_date_idx on expenses (company_id, created_by_id, date);
create index expenses_company_id_type_idx on expenses (company_id, type);

create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- maintenances
-- -----------------------------------------------------------------------------

create table maintenances (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id),
  vehicle_id      uuid not null references vehicles (id) on delete cascade,
  type            maintenance_type not null,
  status          maintenance_status not null default 'SCHEDULED',
  description     text not null,
  scheduled_date  timestamptz not null,
  completed_date  timestamptz,
  created_by_id   uuid,
  updated_by_id   uuid,
  cancelled_at    timestamptz,
  cancelled_by_id uuid,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint maintenances_cancelamento_coerente check (
    (status = 'CANCELLED') = (cancelled_at is not null)
  ),
  -- Implicação, não equivalência: uma manutenção concluída tem data de
  -- conclusão, mas cancelar uma manutenção já concluída muda a situação sem
  -- apagar a data — o histórico do que foi feito permanece.
  constraint maintenances_conclusao_coerente check (
    status <> 'DONE' or completed_date is not null
  )
);

create index maintenances_company_id_scheduled_date_idx
  on maintenances (company_id, scheduled_date);
create index maintenances_company_id_status_scheduled_date_idx
  on maintenances (company_id, status, scheduled_date);
create index maintenances_company_id_vehicle_id_scheduled_date_idx
  on maintenances (company_id, vehicle_id, scheduled_date);
create index maintenances_company_id_created_by_id_scheduled_date_idx
  on maintenances (company_id, created_by_id, scheduled_date);

create trigger maintenances_set_updated_at
  before update on maintenances
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------

create table documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id),
  vehicle_id    uuid references vehicles (id) on delete cascade,
  driver_id     uuid references drivers (id) on delete cascade,
  type          document_type not null,
  expiry_date   date not null,
  file_url      text,
  alert_sent    boolean not null default false,
  created_by_id uuid,
  updated_by_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Um documento pertence a um veículo ou a um motorista, nunca a ambos nem a
  -- nenhum: sem isso, um documento órfão escaparia de toda listagem.
  constraint documents_titular_unico check (
    (vehicle_id is not null) <> (driver_id is not null)
  )
);

comment on column documents.expiry_date is
  'Data civil, sem hora. O vencimento não depende do fuso de quem consulta — '
  'tratá-lo como timestamp faria um documento vencer em dias diferentes conforme '
  'o horário do servidor.';

create index documents_company_id_expiry_date_idx on documents (company_id, expiry_date);
create index documents_company_id_vehicle_id_idx on documents (company_id, vehicle_id);
create index documents_company_id_driver_id_idx on documents (company_id, driver_id);

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- change_logs
-- -----------------------------------------------------------------------------

create table change_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id),
  entity_type audit_entity not null,
  entity_id   uuid not null,
  action      audit_action not null,
  changes     jsonb,
  reason      text,
  actor_id    uuid,
  actor_name  text not null,
  created_at  timestamptz not null default now()
);

comment on table change_logs is
  'Histórico de alterações. Acumula — nunca substitui.';
comment on column change_logs.actor_name is
  'Nome no momento da ação, gravado por cópia, para que o histórico continue '
  'legível mesmo que o usuário seja removido depois.';
comment on column change_logs.changes is
  'Campos alterados, no formato { campo: { de, para } }. As chaves são nomes de '
  'campo da aplicação e são gravadas exatamente como recebidas.';

create index change_logs_company_entity_created_idx
  on change_logs (company_id, entity_type, entity_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Todas as tabelas ficam com RLS habilitada e sem política alguma. O efeito é
-- negar acesso a qualquer papel que não seja o dono — em particular `anon` e
-- `authenticated`, que é o que a chave pública do frontend alcança.
--
-- O isolamento entre empresas é responsabilidade da aplicação, que filtra por
-- company_id em toda consulta a partir do perfil reconsultado no banco. A RLS
-- aqui não implementa esse isolamento: ela garante que ninguém alcance as
-- tabelas por fora da API, via PostgREST.

alter table companies enable row level security;
alter table users enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table vehicle_driver_assignments enable row level security;
alter table expenses enable row level security;
alter table maintenances enable row level security;
alter table documents enable row level security;
alter table change_logs enable row level security;
