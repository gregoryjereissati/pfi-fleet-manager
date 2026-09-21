<div align="center">

# Fleet Manager

**Sistema de Gestão Inteligente de Frotas**

Universidade de Fortaleza — UNIFOR · Ciência da Computação · 2026

</div>

---

## O que é

Aplicação web que centraliza o controle **operacional, financeiro e documental** de uma frota de veículos. Organizações que operam frotas pequenas e médias costumam dividir esse controle entre planilhas isoladas, e perdem a visão consolidada de custo, manutenção e regularidade documental de cada veículo.

O Fleet Manager reúne essas informações em uma base única, organizada em torno do veículo: toda despesa, manutenção e documento é obrigatoriamente vinculada a um. Sobre essa base, o sistema classifica vencimentos, consolida alertas e apura indicadores de custo.

**Em produção:** https://pfi-fleet-manager-api.vercel.app

### Módulos

Autenticação e controle de acesso por perfil · Veículos · Motoristas · Despesas em 6 categorias · Manutenções preventivas e corretivas · Documentos com vencimento e anexo · Central de alertas · Painel de indicadores · Gestão de usuários · Interface em português e inglês.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Frontend | React 18 · Vite · React Router · TailwindCSS · Recharts · i18next |
| Backend | Node.js · Express 4 |
| Acesso ao banco | postgres.js — SQL parametrizado, sem ORM |
| Banco de dados | PostgreSQL (Supabase) |
| Armazenamento de arquivos | Supabase Storage |
| Autenticação | Supabase Auth — tokens ES256 verificados por JWKS (`jose`) |
| Validação | Zod |
| Agendamento | node-cron (local) · Vercel Cron (produção) |
| Testes | Vitest |
| Monorepo | npm workspaces |
| Publicação | Vercel — projeto único, frontend estático e API serverless no mesmo domínio |

Backend em camadas, com dependência unidirecional:

```text
routes → middlewares → controllers → services → repositories → PostgreSQL
```

A camada de serviços não conhece Express, e o SQL vive apenas na de repositórios. É esse isolamento que torna as regras de negócio testáveis sem banco.

---

## Mapa do projeto

```text
fleet-manager/
├── apps/
│   ├── api/                 Backend — a aplicação Express
│   │   ├── db/             Migrations SQL, executor, seed e limpeza
│   │   └── src/             config · routes · middlewares · controllers
│   │                        services · repositories · jobs · lib
│   └── web/                 Frontend React
│       └── src/             pages · components · hooks · lib · locales
├── packages/
│   └── shared/              Enumerações e DTOs compartilhados
├── api/index.ts             Entrada serverless da Vercel
├── scripts/                 Build do pacote shared e geração do documento técnico
├── docs/academico/          Documento Técnico (PDF) — referência acadêmica
├── vercel.json              Build, reescritas e agendamento em produção
└── package.json             Definição dos workspaces
```

> `api/` **não duplica** `apps/api/`. A Vercel expõe cada arquivo em `api/` como função serverless, e `api/index.ts` apenas reexporta o mesmo app Express. Em desenvolvimento quem sobe o servidor é `apps/api/src/server.ts`.

---

## Pré-requisitos

- **Node.js 20+**
- Conta no **Supabase** (camada gratuita é suficiente)

---

## Instalação

```bash
git clone https://github.com/gregoryjereissati/pfi-fleet-manager.git
cd pfi-fleet-manager
npm install
```

`npm install` na raiz instala os três workspaces (`apps/api`, `apps/web`, `packages/shared`).

---

## Configuração

### Variáveis de ambiente

**`apps/api/.env`** — modelo em [`.env.example`](.env.example)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres.<ref>:<SENHA>@<host>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<SENHA>@<host>.pooler.supabase.com:5432/postgres"
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<chave-service-role>
```

> A `SUPABASE_SERVICE_ROLE_KEY` é exigida **em tempo de execução**: é com ela que
> a API assina as URLs dos anexos. Ela também precisa estar cadastrada nas
> variáveis de ambiente do projeto na Vercel — sem isso a publicação sobe e
> falha ao abrir ou enviar um anexo. É uma chave **secreta**: nunca use o
> prefixo `VITE_` nem a coloque no frontend.

**`apps/web/.env`** — modelo em [`apps/web/.env.example`](apps/web/.env.example)

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-publica>
```

As credenciais ficam em *Project Settings → Database* (connection strings) e *Project Settings → API Keys* (URL e chave pública). O Vite só expõe variáveis com o prefixo `VITE_`; outros prefixos são ignorados em silêncio. Nenhum arquivo `.env` é versionado.

### ⚠️ Desativar a confirmação de e-mail no Supabase

No painel do Supabase, em **Authentication → Sign In / Providers → Email**, desative **"Confirm email"**.

Sem isso **o cadastro não se completa**: o projeto não tem serviço de envio de e-mail configurado, então a conta nunca é confirmada e o perfil não chega a ser criado. O risco é mitigado pela aprovação manual do administrador, exigida antes de qualquer acesso.

---

## Banco de dados

As migrations são arquivos SQL em [`apps/api/db/migrations/`](apps/api/db/migrations/),
aplicados por um executor próprio. Não há ORM, não há geração de cliente e não é
preciso Docker nem PostgreSQL local: tudo roda contra o Supabase hospedado.

```bash
npm run db:migrate   # aplica o que estiver pendente
npm run db:status    # mostra o que já foi aplicado, sem alterar nada
npm run db:seed      # popula a base fictícia de desenvolvimento
```

O executor registra cada migration aplicada em `schema_migrations`, com uma soma
de verificação do conteúdo. Alterar um arquivo já aplicado passa a ser um erro:
o banco e o histórico teriam divergido em silêncio. Cada migration roda dentro de
uma transação junto com o próprio registro — ou os dois efeitos existem, ou
nenhum existe. Um arquivo que precise de DDL não transacional declara
`-- migrate: no-transaction` na primeira linha.

### Recriar a base do zero

```bash
npm run db:reset -- --confirmar=<project_ref>   # apaga dados, contas e arquivos
npm run db:migrate                              # recria a estrutura
npm run db:seed                                 # popula
```

O `db:reset` exige que o identificador do projeto seja digitado e confira com o
configurado: um comando destrutivo não deve depender apenas de uma variável de
ambiente que pode estar apontando para o lugar errado. Ele remove **somente** o
que pertence à aplicação — as tabelas e tipos do Fleet Manager, as contas do
Supabase Auth e os arquivos do bucket `documents`. Não apaga o projeto nem toca
em schemas internos do Supabase.

O seed nunca apaga nada: se as empresas fictícias já existirem, ele recusa e
orienta a executar o `db:reset` antes.

### Provisionar uma empresa

Criar empresa é o único ato que não pode depender de aprovação — ainda não
existe quem aprove. Por isso ele fica **fora da aplicação**, ao alcance de quem
já tem acesso ao banco:

```bash
npm run provisionar --workspace=apps/api -- \
  --empresa "Transportes Silva" \
  --codigo TSILVA-01 \
  --admin-nome "Maria Silva" \
  --admin-email maria@transportessilva.com.br \
  --admin-cpf 12345678900 \
  --admin-telefone "(85) 99999-0000"
```

O script cria a empresa e o perfil do primeiro administrador, já ativo e **sem
conta de acesso**. A pessoa se cadastra pela tela normal com o mesmo e-mail e o
código da empresa, e assume o perfil. Os demais membros usam o mesmo código e
ficam pendentes até que esse administrador os aprove.

### Perfis de demonstração

`npm run db:seed` cria **duas empresas**, para que o isolamento entre elas seja
observável, e o super administrador da plataforma. Diferente do provisionamento
acima, o seed **cria também as contas no Supabase Auth** — as pessoas entram
direto, sem passar pela tela de cadastro.

| Empresa | Código de acesso |
|---|---|
| Transportes Litoral Norte | `LITORAL2026` |
| Frota Sertão Central | `SERTAO2026` |

**Transportes Litoral Norte**

| E-mail | Papel | Situação |
|---|---|---|
| `helena.admin@example.com` | ADMIN | ACTIVE |
| `rogerio.gerente@example.com` | MANAGER | ACTIVE |
| `claudia.motorista@example.com` | OPERATOR | ACTIVE |
| `iranildo.motorista@example.com` | OPERATOR | ACTIVE |
| `marcos.pendente@example.com` | OPERATOR | PENDING |
| `vanda.recusada@example.com` | OPERATOR | REJECTED |

**Frota Sertão Central**

| E-mail | Papel | Situação |
|---|---|---|
| `otavio.admin@example.com` | ADMIN | ACTIVE |
| `sandra.gerente@example.com` | MANAGER | ACTIVE |
| `debora.motorista@example.com` | OPERATOR | ACTIVE |
| `aldair.motorista@example.com` | OPERATOR | ACTIVE |
| `juliana.pendente@example.com` | OPERATOR | PENDING |

**Plataforma:** `plataforma.super@example.com` — super administrador, não
pertence a empresa alguma.

Os perfis PENDING e REJECTED existem de propósito: são eles que permitem ver a
recusa de acesso, que acontece **depois** da autenticação — a conta existe, o
token é válido, e ainda assim a API nega.

Cada perfil OPERATOR ativo tem a **ficha de motorista** correspondente:
motorista e usuário são a mesma pessoa, e a ficha guarda só o que é operacional.

### A senha das contas de demonstração

Todas compartilham a mesma senha, que vem de `SEED_PASSWORD`. **Sem essa
variável, o seed gera uma senha aleatória e a mostra uma única vez, ao final da
execução.** Ela não fica gravada em lugar nenhum: o Supabase Auth guarda apenas
o hash.

Para escolher a senha — recomendado, se a base vai ser recriada mais de uma vez:

```bash
SEED_PASSWORD=<senha> npm run db:seed
```

Se a senha se perder, o painel do Supabase não oferece campo para definir outra,
só envio de recuperação por e-mail — que não funciona, porque o projeto não tem
serviço de e-mail. As saídas são a Admin API (`PUT /auth/v1/admin/users/<id>`
com a `service_role`) ou recriar a base com `SEED_PASSWORD` definida.

> Uso restrito a desenvolvimento e demonstração.

---

## Super administrador da plataforma

Existe um perfil **acima** das empresas. Ele não pertence a nenhuma e escolhe,
a cada sessão, em qual vai trabalhar — passando a agir ali com os poderes de
administrador daquela empresa.

Duas decisões sustentam isso:

**Não é um papel.** A condição vive em `users.is_super_admin`, coluna própria, e
não em `user_role`. O papel é dado de entrada em dois pontos — o cadastro grava
o papel pedido, a aprovação grava o efetivo — e um valor a mais no enum tornaria
possível pedir ou conceder a condição por esses caminhos. Uma coluna à parte não
tem caminho ligando entrada do usuário a ela.

**A empresa escolhida viaja no cabeçalho `X-Company-Id`.** Isso parece contrariar
a regra de que o recorte nunca se apoia em dado do cliente, mas a regra continua
valendo: o servidor só considera esse cabeçalho **depois** de confirmar no banco
que o perfil autenticado tem a condição. Para qualquer outro perfil o cabeçalho é
ignorado por completo — e há teste garantindo exatamente isso.

Dentro da empresa escolhida o recorte nasce com `role: ADMIN`. Serviços,
repositórios e testes não sabem que existe um super administrador: para eles é
um administrador comum, e o isolamento por empresa continua o mesmo de sempre.

```bash
npm run provisionar-super-admin --workspace @fleet-manager/api --   --nome "Nome Completo" --email pessoa@exemplo.com   --cpf 12345678900 --telefone "(85) 99999-0000"
```

O script cria também a conta no Supabase Auth, diferente do provisionamento de
empresa: o super administrador não tem código de empresa para apresentar na tela
de cadastro, e abrir uma exceção ali seria abrir caminho justamente onde não se
deve.

Na interface ele vê um seletor de empresa no cabeçalho e uma tela **Empresas**,
onde cria, ativa e desativa. Desativar suspende o acesso de quem pertence à
empresa; não apaga nada e é reversível.

---

## Isolamento e anexos

O isolamento entre empresas é feito pela aplicação: `company_id` participa da
condição de **toda** consulta, montado a partir do perfil reconsultado no banco
— nunca de um identificador vindo do cliente.

As tabelas ficam com *row level security* habilitada e **sem política alguma**.
Isso não implementa o isolamento por empresa; serve para negar acesso a `anon` e
`authenticated`, que é o que a chave pública do frontend alcança. Na prática,
ninguém chega às tabelas por fora da API, via PostgREST. A aplicação conecta com
um papel que contorna a RLS, e por isso continua operando normalmente.

### Anexos: servidos pela API

Os arquivos anexados aos documentos ficam no bucket `documents` do Supabase
Storage, **fora** das tabelas — e por isso fora do recorte que a aplicação
aplica às linhas.

A primeira correção recortou o bucket **por empresa**: o caminho do arquivo
passou a começar pelo identificador da empresa (`<companyId>/<entityId>/<uuid>.<ext>`),
o bucket virou privado, e as políticas passaram a chamar
`public.pode_acessar_documentos()`, da migration `0005`. Isso fechou o buraco
maior — antes qualquer usuário autenticado alcançava o anexo de qualquer
empresa —, mas não a regra inteira.

A regra da aplicação é mais estreita que "mesma empresa":

- **ADMIN e MANAGER** enxergam todos os documentos da empresa.
- **OPERATOR** enxerga os próprios documentos pessoais e os dos veículos a que
  está vinculado **agora** — não a CNH de um colega da mesma empresa.

Um motorista podia contornar a API e pedir o arquivo direto ao Storage: a
política deixava passar, porque o colega é da mesma empresa. Reproduzir a regra
inteira em RLS exigiria reescrevê-la em SQL, em duplicata com o serviço que já
a aplica — e duas cópias divergem.

A saída foi a contrária: **tirar o Storage do alcance do navegador.**

| | Como é agora |
|---|---|
| Leitura | `GET /documents/:id/arquivo` devolve `{ url }`, assinada, válida por 60s |
| Envio | `POST /documents/arquivo/url-de-envio` devolve `{ url, caminho }`; o cliente faz `PUT` na URL |
| Políticas do bucket | nenhuma — RLS habilitada nega tudo a `anon` e `authenticated` |
| Quem toca o Storage | só a API, com a `service_role` |

A leitura reaproveita `documentService.getDocument`, que **já** aplica o recorte:
o que está fora do alcance de quem pede devolve 404 e nunca chega a ser
assinado. A regra não é reescrita em lugar nenhum — é por reaproveitá-la que o
arquivo obedece à mesma condição que a linha.

No envio, a empresa do caminho vem do **recorte de acesso**, nunca do corpo da
requisição, e a entidade dona passa pela mesma verificação que a criação do
documento faz. As extensões aceitas (`jpg`, `jpeg`, `png`, `webp`, `pdf`)
deixaram de depender da política de INSERT e são conferidas pela API.

`documents.file_url` guarda o **caminho**, não uma URL. A API não usa o
`@supabase/supabase-js`: fala com o Storage por `fetch`, como os scripts de
manutenção da base.

As políticas foram apagadas **pelo painel** (Storage > Policies), não por
migration: `storage.objects` pertence ao papel `supabase_storage_admin`, e o
`postgres` não pode criar nem apagar política sobre ela. O histórico completo
dessas políticas — as que existiram e por que saíram — está em
[`supabase-fleet/storage-setup.sql`](supabase-fleet/storage-setup.sql).

A migration `0006` removeu `public.pode_acessar_documentos()`, que existia
apenas para aquelas políticas. Ela saiu depois delas, e não junto: apagá-la
antes derrubaria as políticas que ainda a chamavam.

**Trocar o anexo recolhe o anterior.** Gravar um anexo novo em um documento que
já tinha um, ou remover o documento, apaga o arquivo antigo do bucket. A
remoção acontece depois da transação e não derruba a operação se falhar: o
documento já foi gravado, e um arquivo órfão não justifica devolver erro a
quem salvou.

### O alcance do super administrador

Enquanto as políticas existiam, o super administrador alcançava, pelo Storage,
os arquivos de qualquer empresa — mais largo do que o recorte da sessão dele,
porque o Storage não tinha como saber qual empresa ele havia escolhido. Isso
era um conceito da API, transmitido em cabeçalho.

Com os anexos servidos pela API, essa diferença desapareceu: ele passa pelo
mesmo `getDocument` que todo mundo, já recortado pela empresa em que está
operando.

---

## Execução

```bash
npm run dev:api    # API em http://localhost:3000
npm run dev:web    # Interface em http://localhost:5173
```

Verificação rápida: `curl http://localhost:3000/health`

---

## Validação

```bash
npm run test:api                    # 220 testes
cd apps/api && npx tsc --noEmit     # sem erros
cd apps/web && npx tsc --noEmit     # sem erros
cd apps/web && npm run build        # gera o pacote de produção
npm run lint                        # sem erros
```

Tudo deve passar limpo — **não há erro nem aviso pré-existente**. Se algum
aparecer, é regressão.

### Demais comandos

| Comando | Ação |
|---|---|
| `npm run build:api` | Compila a API |
| `npm run build:shared` | Compila o pacote compartilhado (CJS e ESM) |
| `npm run format` | Formata o código |

---

## Perfis de acesso

Os três papéis existem **dentro de uma empresa**. O ADMIN é o administrador da
empresa cliente: ele controla a própria empresa e não alcança outra. Não existe
administrador de todas as empresas.

| Recurso | ADMIN | MANAGER | OPERATOR (motorista) |
|---|:---:|:---:|:---:|
| Consultar veículos e motoristas | empresa | empresa | só os vinculados a si |
| Consultar lançamentos e painel | empresa | empresa | **só os próprios** |
| Registrar despesas e manutenções | empresa | empresa | só em veículo vinculado |
| Corrigir e cancelar lançamento | qualquer | qualquer | **só os próprios** |
| Cadastrar e editar veículos, motoristas e documentos | ✅ | ✅ | ❌ |
| Atribuir e encerrar vínculos com veículos | ✅ | ✅ | ❌ |
| Excluir lançamento em definitivo | ✅ | ✅ | ❌ |
| Excluir veículo ou motorista em definitivo | ✅ | ❌ | ❌ |
| Aprovar, recusar e bloquear acessos | ✅ | ❌ | ❌ |
| Listar usuários da empresa | ✅ | ✅ | ❌ |

Dois pontos que a tabela não mostra e o código garante:

- **o recorte é do servidor.** A empresa vem sempre do perfil consultado no
  banco a cada requisição; um identificador de empresa enviado pelo cliente
  nunca decide acesso;
- **um identificador de fora do recorte responde como inexistente**, para que a
  resposta não revele que o registro existe.

O comportamento efetivo é o definido nas rotas em `apps/api/src/routes/` e nos
serviços em `apps/api/src/services/`.

---

## Documentação

O **Documento Técnico** em [`docs/academico/Documento Tecnico - Fleet Manager.pdf`](docs/academico/Documento%20Tecnico%20-%20Fleet%20Manager.pdf) é a referência acadêmica do projeto: fundamentação, arquitetura, modelo de dados e requisitos.

> Ele descreve o sistema no momento em que foi escrito. Onde divergir do código, **o código é a referência do comportamento atual** — a divergência não autoriza, por si só, alterar a aplicação.

Para quem for trabalhar no repositório: [`CLAUDE.md`](CLAUDE.md) e [`AGENTS.md`](AGENTS.md).

Os scripts em `scripts/` regeneram o documento técnico (`gerar-diagramas.py` → `gerar-documento.py` → `gerar-pdf.py`).
