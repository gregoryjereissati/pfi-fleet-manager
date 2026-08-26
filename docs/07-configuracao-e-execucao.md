# Configuração e Execução

**Projeto:** Fleet Manager — Sistema de Gestão Inteligente de Frotas

Este documento descreve como preparar o ambiente e executar o sistema a partir de uma cópia limpa do repositório.

---

## 1. Pré-requisitos

| Requisito | Versão | Observação |
|---|---|---|
| Node.js | 20 ou superior | Inclui o npm, usado para gerenciar os workspaces |
| Conta no Supabase | — | Camada gratuita é suficiente |
| Git | — | Para clonar o repositório |

Não é necessário instalar PostgreSQL localmente: o banco é hospedado no Supabase. Existe, alternativamente, um `docker-compose.yml` na raiz que sobe um PostgreSQL local, caso se prefira essa abordagem.

---

## 2. Instalação

```bash
git clone https://github.com/gregoryjereissati/pfi-fleet-manager.git
cd pfi-fleet-manager
npm install
```

O comando `npm install` executado na raiz instala as dependências dos três workspaces (`apps/api`, `apps/web` e `packages/shared`).

---

## 3. Preparação do projeto no Supabase

### 3.1. Criar o projeto

1. Acessar [supabase.com](https://supabase.com) e criar um novo projeto.
2. Escolher a região **South America (São Paulo)** para reduzir a latência.
3. Definir e **guardar a senha do banco de dados** — ela é exibida apenas no momento da criação e será necessária na etapa seguinte.

### 3.2. Obter as credenciais

| Credencial | Onde encontrar |
|---|---|
| Connection string (pooler e direta) | *Project Settings* → *Database* → *Connection string* |
| URL do projeto e chave pública | *Project Settings* → *API Keys* |

### 3.3. Configurar o Supabase Auth

O login é realizado pelo **Supabase Auth**, que exige um ajuste no painel:

1. Acessar **Authentication** → **Sign In / Providers** → **Email**
2. Confirmar que o provedor **Email** está habilitado
3. **Desativar a opção "Confirm email"**

> **Por que desativar.** Com a confirmação ativa, o Supabase envia um e-mail de verificação e só libera a sessão após o clique no link. Como a notificação por e-mail está fora do escopo do projeto, não há serviço de envio configurado, e o cadastro não se completaria.
>
> A consequência é declarada de forma explícita: a posse do endereço de e-mail não é verificada no momento do cadastro. O controle de acesso efetivo permanece na **aprovação manual pelo administrador**, exigida antes de qualquer acesso ao sistema.

---

## 4. Variáveis de ambiente

### 4.1. Backend — `apps/api/.env`

Criar o arquivo a partir do modelo `.env.example` da raiz:

```env
PORT=3000
NODE_ENV=development

# Conexão via pooler — usada pela aplicação em tempo de execução
DATABASE_URL="postgresql://postgres.<project-ref>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexão direta — usada pelas migrations do Prisma
DIRECT_URL="postgresql://postgres.<project-ref>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

# URL do projeto Supabase, sem barra ao final.
# Usada para localizar o JWKS e validar os tokens do Supabase Auth.
SUPABASE_URL=https://<project-ref>.supabase.co
```

> **A API não usa nenhuma chave secreta do Supabase.** Os tokens são assinados com chave assimétrica (ES256) e verificados com a chave pública publicada pelo próprio projeto.

> **Por que duas URLs.** O Prisma exige conexão direta para aplicar migrations, pois o pooler em modo de transação não suporta comandos DDL. Em tempo de execução, o pooler é preferível por limitar o número de conexões simultâneas.

### 4.2. Frontend — `apps/web/.env`

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-publica-do-projeto>
```

> **Atenção ao prefixo.** O Vite só expõe ao navegador as variáveis prefixadas com `VITE_`. Nomes com outros prefixos (como `NEXT_PUBLIC_`, do Next.js) são ignorados silenciosamente, e a aplicação falha em tempo de execução sem mensagem clara.

> **Sobre a chave pública.** Trata-se de chave de uso público, embutida por natureza no pacote JavaScript entregue ao navegador. Ela não concede acesso administrativo. As permissões efetivas são determinadas pelas políticas de RLS do Storage.

---

## 5. Criação do banco de dados

Há dois caminhos equivalentes. O primeiro é o recomendado.

### 5.1. Pelo Prisma (recomendado)

Com o arquivo `apps/api/.env` configurado:

```bash
cd apps/api

# Cria todas as tabelas, enumerações e relacionamentos
npx prisma migrate deploy

# Gera o cliente Prisma tipado
npx prisma generate

# Popula o banco com dados de demonstração
npx prisma db seed
```

Ao final, o povoamento informa as quantidades inseridas: 3 usuários, 8 veículos, 6 motoristas, 27 despesas, 14 manutenções e 25 documentos.

### 5.2. Pelo SQL Editor do Supabase

Alternativa para quem prefere não configurar a connection string apenas para criar o schema:

1. Painel do Supabase → **SQL Editor** → **New query**
2. Colar o conteúdo de [`supabase/schema-completo.sql`](../supabase/schema-completo.sql) e executar

O script cria os 8 tipos enumerados, as 7 tabelas, as 6 chaves estrangeiras e os índices de unicidade, registra as migrations como aplicadas — de modo que um `prisma migrate deploy` posterior reconheça o banco como atualizado — e, ao final, bloqueia o acesso externo às tabelas.

> **Aviso do SQL Editor.** Ao executar, o Supabase pode exibir a mensagem *"This query creates tables without enabling Row Level Security"*. Qualquer opção pode ser escolhida: a seção final do script habilita o RLS e revoga os privilégios dos papéis públicos de forma explícita. A justificativa está em [05-banco-de-dados.md](05-banco-de-dados.md#4-controle-de-acesso-ao-banco).

> **O povoamento continua exigindo a connection string.** O seed é executado pela aplicação (`npx prisma db seed`), e não pelo SQL Editor. Da mesma forma, o backend só conecta ao banco com `DATABASE_URL` configurada — a senha do PostgreSQL é necessária na máquina que executa o sistema, ainda que o schema tenha sido criado pelo painel.

### Perfis de demonstração

A rotina de povoamento cria três perfis já aprovados (`ACTIVE`), **sem conta de acesso vinculada**:

| Perfil | E-mail | Papel |
|---|---|---|
| Administrador | `admin@fleet-manager.com` | ADMIN |
| Gestor | `gerente@fleet-manager.com` | MANAGER |
| Operador | `operador@fleet-manager.com` | OPERATOR |

Para acessar o sistema com qualquer um deles, **cadastre esse mesmo e-mail pela tela de cadastro da aplicação**, escolhendo a senha desejada. A API detecta o perfil existente sem vínculo e o associa à conta recém-criada, preservando o papel e a situação `ACTIVE` — o acesso fica imediatamente liberado, sem necessidade de aprovação.

> Mecanismo destinado a ambiente de desenvolvimento e demonstração acadêmica.

---

## 6. Configuração do Storage

O anexo de arquivos aos documentos requer um bucket e as respectivas políticas de acesso.

No painel do Supabase, abrir **SQL Editor** → **New query**, colar o conteúdo de [`supabase/storage-setup.sql`](../supabase/storage-setup.sql) e executar.

O script cria o bucket `documents` como público e aplica duas políticas: uma permitindo o envio de arquivos com extensão `jpg`, `jpeg`, `png`, `webp` ou `pdf`, e outra permitindo a leitura pública dos arquivos do bucket.

---

## 7. Execução

Em dois terminais separados, a partir da raiz do repositório:

```bash
# Terminal 1 — API
npm run dev:api
# Servidor disponível em http://localhost:3000

# Terminal 2 — Frontend
npm run dev:web
# Interface disponível em http://localhost:5173
```

Verificação rápida de que a API está no ar:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

---

## 8. Scripts disponíveis

### Raiz do repositório

| Comando | Ação |
|---|---|
| `npm run dev:api` | Inicia a API em modo de desenvolvimento |
| `npm run dev:web` | Inicia o frontend em modo de desenvolvimento |
| `npm run build:api` | Compila a API |
| `npm run test` | Executa os testes de todos os workspaces |
| `npm run test:api` | Executa os testes da API |
| `npm run lint` | Executa a análise estática |
| `npm run format` | Formata o código com Prettier |

### `apps/api`

| Comando | Ação |
|---|---|
| `npm run dev` | Inicia com recarga automática |
| `npm run build` | Compila para `dist/` |
| `npm run start` | Executa a versão compilada |
| `npm run test` | Executa os testes |
| `npm run test:coverage` | Executa os testes com relatório de cobertura |
| `npm run db:migrate` | Cria e aplica uma migration |
| `npm run db:seed` | Popula o banco |
| `npm run db:studio` | Abre o navegador de dados do Prisma |
| `npm run db:generate` | Regenera o cliente Prisma |

### `apps/web`

| Comando | Ação |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o pacote de produção |
| `npm run preview` | Serve localmente o pacote gerado |

---

## 9. Verificação do ambiente

```bash
npm run test:api                          # 99 testes devem ser aprovados
cd apps/api && npx tsc --noEmit           # sem erros
cd apps/web && npx tsc --noEmit           # sem erros
cd apps/web && npm run build              # build concluído
```

---

## 10. Solução de problemas frequentes

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Variáveis de ambiente inválidas` na inicialização da API | `DATABASE_URL`, `DIRECT_URL` ou `SUPABASE_URL` ausente ou malformada | Revisar `apps/api/.env` |
| Cadastro não conclui e pede confirmação de e-mail | Opção "Confirm email" ativa no Supabase | Desativar conforme a seção 3.3 |
| `401 Invalid or expired token` em todas as rotas | `SUPABASE_URL` da API aponta para outro projeto | Conferir se a API e o frontend usam o mesmo projeto |
| `404 PROFILE_NOT_FOUND` após o login | Conta criada no Supabase sem perfil na aplicação | Concluir o cadastro; o frontend redireciona automaticamente |
| `tenant or user not found` | Projeto Supabase inexistente, ou credenciais de outro projeto | Conferir a connection string no painel |
| `Can't reach database server` | Projeto Supabase pausado por inatividade | Reativar o projeto no painel |
| Migrations falham, mas a aplicação conecta | `DIRECT_URL` ausente ou apontando para a porta do pooler | Usar a porta 5432 na `DIRECT_URL` |
| `A API retornou HTML em vez de JSON` | Backend fora do ar, ou `VITE_API_URL` incorreta | Iniciar a API e conferir a variável |
| Erro de CORS no navegador | Origem não permitida | Em desenvolvimento, apenas `localhost` é aceito |
| `new row violates row-level security policy` no upload | Políticas do Storage não aplicadas | Executar `supabase/storage-setup.sql` |
| Logo não aparece na interface | Arquivo `apps/web/public/logo.svg` ausente | Confirmar que o arquivo foi obtido no clone |
| Variáveis do frontend ignoradas | Prefixo incorreto | O Vite exige o prefixo `VITE_` |

---

## 11. Alternativa: PostgreSQL local

Caso se prefira não depender do Supabase para o banco de dados:

```bash
docker compose up -d
```

Ajustar em `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fleet_manager"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/fleet_manager"
```

Em seguida, executar as migrations e o povoamento normalmente. O Supabase permanece necessário apenas para o anexo de arquivos aos documentos; as demais funcionalidades operam integralmente com o banco local.

---

## Documentos relacionados

- [05-banco-de-dados.md](05-banco-de-dados.md) — modelo de dados e migrations
- [04-arquitetura.md](04-arquitetura.md) — arquitetura da solução
