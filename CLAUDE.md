# Fleet Manager — Guia para Colaboradores

> Ponto de entrada para quem for trabalhar neste repositório, pessoa ou agente.
> O [`README.md`](README.md) tem finalidade, stack, instalação, execução e validação. Este arquivo acrescenta o contexto de domínio e as regras de trabalho.

---

## Ponto de partida desta etapa

O projeto está em uma **nova etapa**, que parte da aplicação existente e em funcionamento.

- **A aplicação atual é a base.** O código em `apps/` é a referência do comportamento vigente.
- **Nenhuma proposta anterior de mudança de regras está aprovada.** Uma revisão de produto chegou a ser esboçada e foi descartada como planejamento. Se alguém mencionar regras "RP01–RP32", elas não existem mais e nunca foram aprovadas.
- **Regras de negócio, arquitetura e identidade visual serão revisitadas depois**, em etapa própria. Até lá, não as altere por iniciativa própria.
- **O Documento Técnico é referência, não ordem de serviço.** Ele descreve o sistema no momento em que foi escrito; divergência entre ele e o código não autoriza alterar a aplicação.
- **Não faça commit sem autorização explícita.**

---

## O que é

Sistema web de gestão de frotas: veículos, motoristas, despesas, manutenções, documentos com vencimento, alertas e indicadores financeiros.

- **Repositório:** https://github.com/gregoryjereissati/pfi-fleet-manager
- **Produção:** https://pfi-fleet-manager-api.vercel.app

---

## Arquitetura

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React + TypeScript + Vite | SPA |
| Backend | Node.js + Express 4 + TypeScript | API REST em camadas |
| Acesso ao banco | **postgres.js** | SQL parametrizado nos repositórios, sem ORM |
| Banco | PostgreSQL (Supabase) | Gerenciado |
| Autenticação | **Supabase Auth** | Token ES256 verificado pelo JWKS. A API não guarda senha. Papel e situação ficam na tabela `User` |
| Armazenamento | Supabase Storage | Anexos de documentos |
| Validação | Zod | Body das rotas e variáveis de ambiente na inicialização |
| Controle de acesso | RBAC **por empresa** | ADMIN, MANAGER, OPERATOR, sempre dentro de uma `Company`. Acima delas, o super administrador da plataforma |
| Deploy | **Vercel, projeto único** | Frontend estático e API serverless no mesmo domínio — sem CORS |
| Monorepo | **npm workspaces** | Sem Turborepo nem Nx |
| Testes | Vitest | 193 testes: regras do backend e integração com o banco |

> Material anterior a agosto de 2026 pode citar Auth0, autenticação própria com `bcryptjs`, Turborepo, Railway, Redis ou AWS. **Nada disso está no projeto.** A tabela acima prevalece.

Backend em camadas, dependência unidirecional:

```
routes → middlewares → controllers → services → repositories → PostgreSQL
```

`config/` (env com Zod, conexão única do postgres.js) · `db/` (migrations SQL, executor, seed e limpeza) · `jobs/` (rotina diária de alertas) · `lib/` (verificação de token, auditoria, erros do PostgreSQL) · `types/` (tipos do modelo e augmentações do Express).

O mapa das pastas está no [README](README.md#mapa-do-projeto).

---

## Fluxo de autenticação

```
Login:
1. Frontend autentica no Supabase Auth (signInWithPassword)
2. Recebe access_token (JWT ES256), renovado automaticamente
3. Envia Authorization: Bearer <access_token>
4. Backend verifica assinatura, emissor e público pelo JWKS
5. Busca o User por authUserId; rejeita PENDING e BLOCKED
6. authorize(role) verifica o papel

Cadastro (duas etapas):
1. Frontend cria a conta no Supabase Auth (signUp)
2. Com o token, chama POST /auth/register com os dados cadastrais **e o
   código da empresa** (Company.joinCode)
3. A API cria o perfil PENDING na empresa correspondente. O papel pedido fica
   em requestedRole; o papel efetivo nasce no mínimo
4. Se já existir perfil com o mesmo e-mail e sem conta vinculada, vincula o
   existente, preservando papel e situação
5. O administrador da empresa aprova. Aprovar alguém como OPERATOR cria a
   ficha de motorista, de forma idempotente
```

`authenticate` recusa o acesso com `PENDING_APPROVAL`, `REJECTED`, `BLOCKED`,
`NO_COMPANY` (perfil sem empresa) ou `COMPANY_INACTIVE`. O recorte de acesso
— empresa, papel e ficha de motorista — é montado a partir do perfil
reconsultado no banco, nunca de dados enviados pelo cliente.

**Não existe rota de login na API.** O login acontece no frontend, contra o Supabase. O cadastro de perfil usa o middleware `requireSupabaseSession`; as demais rotas protegidas usam `authenticate` e `authorize(role)`.

---

## Modelo de dados

Definido em `apps/api/db/migrations/` — é a fonte da verdade. Os tipos correspondentes em TypeScript estão em `apps/api/src/types/db.ts`.

| Entidade | Campos principais |
|---|---|
| Company | name, cnpj?, joinCode, status |
| User | companyId?, name, email, cpf, phone, authUserId, role, **requestedRole**, status, **isSuperAdmin**, endereço |
| Vehicle | **companyId**, plate, brand, model, year, color, status |
| Driver | **companyId**, **userId?**, name?, cpf?, cnh?, cnhExpiry?, phone, status |
| VehicleDriverAssignment | companyId, vehicleId, driverId, startDate, endDate?, startEstimated |
| Expense | **companyId**, vehicleId, type, amount, date, description, **status**, **createdById**, updatedById, cancel* |
| Maintenance | **companyId**, vehicleId, type, status, description, scheduledDate, completedDate, **createdById**, updatedById, cancel* |
| Document | **companyId**, vehicleId?, driverId?, type, expiryDate, fileUrl?, alertSent, **createdById** |
| ChangeLog | companyId, entityType, entityId, action, changes, reason, actorId, actorName |

Relações: Company 1:N tudo · Vehicle 1:N Expense · Maintenance · Document ·
Driver 1:N Document · Vehicle N:M Driver **através de `VehicleDriverAssignment`,
com período**.

Quatro regras do modelo que não são óbvias no esquema:

- **Super administrador não é um papel.** A condição vive em
  `users.is_super_admin`, coluna própria, e nunca em `user_role`. Papel é dado
  de entrada no cadastro e na aprovação; um valor a mais no enum permitiria
  pedir ou conceder a condição por esses caminhos. Só o script
  `provisionar-super-admin` a concede, e uma restrição do banco garante que
  quem a tem não pertence a empresa alguma.

- **`companyId` é a fronteira de isolamento.** Ele está em toda entidade
  operacional, e não é derivado percorrendo relações. Toda consulta o inclui na
  condição.
- **Ficha de motorista vinculada não duplica identidade.** Com `userId`
  preenchido, `name` e `cpf` ficam **nulos**: a identidade pertence ao `User`.
  As colunas existem para as fichas anteriores à integração.
- **Autoria não tem relação declarada com `User`.** É um identificador simples,
  para que remover um usuário não altere nem apague os lançamentos dele. O nome
  legível vem do `ChangeLog`, que o grava por cópia.

**Migrations são somente-adição.** O executor guarda uma soma de verificação de cada arquivo aplicado: alterar um deles passa a ser erro, porque o banco e o histórico teriam divergido. Mudança pretendida vira migration nova.

---

## Regras para Colaboradores

### 1. Acentuação em português (INEGOCIÁVEL)

Todo texto em português **deve** usar acentuação correta: i18n, interface, rótulos, mensagens de erro, comentários, documentação.

Veículos, Manutenções, Usuários, não, ação, gestão, está, já, período, descrição, conclusão, Combustível.

Nunca omita acento por conveniência.

### 2. Não faça commit sem autorização explícita

Nada de `git commit`, `git push`, deploy ou alteração de banco por iniciativa própria. Deixe as mudanças no diretório de trabalho e relate o que foi feito.

### 3. Não altere regras de negócio, stack ou visual nesta etapa

Serão revisitados em etapa própria. Se uma tarefa parecer pedir isso, confirme antes.

### 4. Antes de concluir

Rode os checks da seção [Validação](README.md#validação) do README. O erro do ESLint e o aviso de tamanho do pacote são pré-existentes e estão descritos lá — não os confunda com regressão introduzida por você.

Depois: atualize a documentação afetada editando o arquivo existente, e **pare sem commitar**.

### 5. Padrão de mensagem de commit

Quando o commit for autorizado:

```
feat(api): add vehicles CRUD endpoints
feat(web): add vehicle listing page
fix(api): handle missing auth header
test(api): add expense service tests
chore: update dependencies
```

Escopo: `api`, `web`, `shared`, ou omitido para a raiz.

---

## Fora do escopo do produto

- Rastreamento GPS em tempo real e telemetria
- Planejamento e otimização de rotas
- Integração automática com DETRAN
- Aplicativo mobile nativo
- Emissão de documentos fiscais e integração contábil
- **Notificação de vencimentos por e-mail, SMS ou mensagem** — o acompanhamento é feito dentro da aplicação, pela central de alertas
- **Recuperação autônoma de senha** — depende de canal externo
