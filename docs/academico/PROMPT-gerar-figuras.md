# Prompt para gerar as figuras do documento técnico

> **Como usar:** abra o app do Claude, anexe o arquivo
> `Fleet Manager - Documento Tecnico (PFII, em andamento).docx`
> e cole todo o texto abaixo da linha tracejada em uma única mensagem.

---

Você vai produzir os 8 diagramas de um documento técnico acadêmico que estou anexando. O documento está completo em texto — só faltam as imagens, que estão marcadas nele como `[ INSERIR IMAGEM ]` seguidas da legenda.

**Regra que vale para tudo:** todos os fatos técnicos que você precisa estão descritos abaixo e no documento anexo. Não invente nada, não presuma tecnologias que não estejam listadas, e não "melhore" a arquitetura. Se algo estiver ambíguo, use exatamente o que está escrito no documento e me avise ao final.

## Contexto do projeto

**Fleet Manager** — sistema web para gestão de frotas. Trabalho de Conclusão de Curso em Ciência da Computação na Universidade de Fortaleza (UNIFOR), desenvolvido por André Luiz Cavalcante da Silva, Luiz Eduardo Pacheco e Gregory Figueiredo de M P Jereissati, sob orientação do Prof. Me. Ronaldo Gonçalves Junior.

O trabalho tem duas etapas. O **Projeto Final Integrador I** está concluído: concepção, modelagem, construção do produto mínimo viável e publicação em produção. O **Projeto Final Integrador II** está em andamento e termina em novembro de 2026. O documento anexo registra um projeto **em curso**, não encerrado — nenhum diagrama deve sugerir conclusão ou entrega final.

## Ficha técnica verificada (fonte da verdade)

Estes dados foram conferidos diretamente no código-fonte. Use-os literalmente.

**Organização do repositório** — monorepo gerenciado por **npm workspaces** (não Turborepo, que não é usado no projeto):
- `apps/api` — backend Node.js + Express + TypeScript
- `apps/web` — frontend React + Vite + TypeScript + TailwindCSS
- `packages/shared` — enumerações e DTOs compartilhados entre as duas aplicações
- Configurações de TypeScript e ESLint ficam na raiz, **não** dentro de `packages/shared`

**Camadas do backend** (dependência estritamente unidirecional, de cima para baixo):
`routes` → `controllers` → `services` → `repositories` → Prisma Client → PostgreSQL.
Middlewares transversais, aplicados antes do controller: `authenticate`, `authorize`, `validate`, `error-handler`.

**Autenticação** — delegada ao **Supabase Auth**. A aplicação não armazena senhas. O token é um JWT assinado em **ES256** (chave assimétrica). A API verifica assinatura, emissor e público usando a **chave pública do endpoint JWKS** do projeto Supabase, via biblioteca `jose`. Papel de acesso (`role`) e situação de aprovação (`status`) **não viajam no token** — ficam na tabela `User` e são reconsultados no banco a cada requisição.

**Controle de acesso** — RBAC com três papéis: `ADMIN`, `MANAGER`, `OPERATOR`.

**Situação do usuário** — `PENDING`, `ACTIVE`, `BLOCKED`. Todo cadastro novo entra como `PENDING` e depende de aprovação de um administrador.

**Persistência** — PostgreSQL gerenciado pelo Supabase, acessado exclusivamente pelo Prisma ORM. RLS habilitado em todas as tabelas e privilégios revogados dos papéis públicos.

**Armazenamento de arquivos** — Supabase Storage, para os anexos dos documentos.

**Implantação** — **um único projeto na Vercel**, com frontend estático e API no mesmo domínio. A API roda como função serverless sob a rota `/api`. Publicado em `https://pfi-fleet-manager-api.vercel.app`. O agendador da própria Vercel chama uma vez por dia o endpoint que sinaliza vencimentos.

### Modelo de dados

| Entidade | Campos principais |
|---|---|
| **User** | id, name, email, cpf, phone, authUserId, role, status, endereço completo, createdAt, updatedAt |
| **Vehicle** | id, plate, brand, model, year, color, status, createdAt, updatedAt |
| **Driver** | id, name, cpf, cnh, cnhExpiry, phone, status, createdAt, updatedAt |
| **Expense** | id, vehicleId, type, amount, date, description, createdAt |
| **Maintenance** | id, vehicleId, type, status, description, scheduledDate, completedDate, createdAt |
| **Document** | id, vehicleId (opcional), driverId (opcional), type, expiryDate, fileUrl, alertSent, createdAt |

**Relacionamentos — atenção, este ponto foi corrigido e é importante:**
- `Vehicle` **N:M** `Driver` (tabela de associação `_VehicleDrivers`) — um motorista conduz vários veículos e um veículo é conduzido por vários motoristas
- `Vehicle` 1:N `Expense`
- `Vehicle` 1:N `Maintenance`
- `Vehicle` 1:N `Document`
- `Driver` 1:N `Document`
- `Document` liga-se a **um veículo OU a um motorista, em exclusividade** — nunca aos dois, nunca a nenhum. CRLV e IPVA apontam para o veículo; CNH aponta para o motorista.
- `User` **não** se relaciona com as demais entidades — é uma entidade independente, que representa quem opera o sistema.

**Enumerações:**
- `UserRole`: ADMIN, MANAGER, OPERATOR
- `UserStatus`: PENDING, ACTIVE, BLOCKED
- `VehicleStatus` / `DriverStatus`: ACTIVE, INACTIVE
- `ExpenseType`: FUEL, MAINTENANCE, FINE, IPVA, INSURANCE, OTHER
- `MaintenanceType`: PREVENTIVE, CORRECTIVE
- `MaintenanceStatus`: SCHEDULED, DONE, OVERDUE
- `DocumentType`: CRLV, IPVA, SEGURO, CNH, LICENCA, OUTRO

## O que eu preciso: 8 figuras

Gere cada uma como **imagem em alta resolução, fundo branco, proporção adequada para caber em uma página A4 retrato com margens**. Entregue uma por vez, na ordem, e me diga o número e a legenda de cada uma para eu inserir no lugar certo.

---

**Figura 1 – Modelo de arquitetura 4+1**

O modelo de Kruchten em sua forma canônica: quatro visões — Lógica, Processo, Implementação (Desenvolvimento) e Implantação (Física) — dispostas em torno da visão central de Casos de Uso, que as conecta. Diagrama conceitual, genérico, sem conteúdo específico do Fleet Manager. Rótulos em português.

---

**Figura 2 – Diagrama de casos de uso significativos e atores**

Diagrama UML de casos de uso. Três atores, com herança de permissões refletindo a matriz RBAC:

- **Operador** — Registrar despesa; Registrar manutenção; Registrar documento; Consultar painel de indicadores; Consultar central de alertas
- **Gestor** — tudo do Operador, mais: Cadastrar veículo; Cadastrar motorista; Vincular motorista a veículo; Excluir registro
- **Administrador** — tudo do Gestor, mais: Aprovar cadastro de usuário; Alterar papel de usuário; Bloquear usuário

Inclua também o caso de uso **Autenticar-se**, comum aos três atores, e o ator externo de sistema **Supabase Auth**, associado a ele.

---

**Figura 3 – Diagrama de camadas da aplicação**

Camadas horizontais empilhadas, com setas de dependência apontando **sempre para baixo** — a unidirecionalidade é o ponto que o diagrama precisa comunicar:

1. **Cliente** — Navegador / React SPA
2. **Rotas e Middlewares** — `routes`, `authenticate`, `authorize`, `validate`, `error-handler`
3. **Controladores** — tradução HTTP
4. **Serviços** — regras de negócio, sem conhecimento de HTTP nem de banco
5. **Repositórios** — único ponto que conhece a persistência
6. **Prisma ORM**
7. **PostgreSQL (Supabase)**

À direita, fora da pilha, mostre **Supabase Auth** e **Supabase Storage** como serviços externos acessados a partir das camadas apropriadas (Auth pelos middlewares e pelo cliente; Storage pelo cliente).

---

**Figura 4 – Diagrama de pacotes da aplicação**

Estrutura do monorepo em pacotes UML:

- `fleet-manager` (raiz, npm workspaces)
  - `apps/api` — subpacotes: `routes`, `controllers`, `services`, `repositories`, `middlewares`, `config`, `lib`, `jobs`
  - `apps/web` — subpacotes: `pages`, `components`, `hooks`, `lib`, `i18n`
  - `packages/shared` — subpacotes: `enums`, `dtos`

Setas de dependência: `apps/api` → `packages/shared` e `apps/web` → `packages/shared`. **Não** deve haver dependência direta entre `apps/api` e `apps/web`.

---

**Figura 5 – Diagrama de classes**

Diagrama UML de classes das seis entidades de domínio — User, Vehicle, Driver, Expense, Maintenance, Document — com os atributos listados na tabela do modelo de dados acima e os tipos correspondentes.

Represente as multiplicidades exatamente como especificado, com destaque para:
- Vehicle `*` — `*` Driver
- Document ligado a Vehicle `0..1` e a Driver `0..1`, com uma nota UML indicando a restrição de exclusividade: *"exatamente uma das associações deve estar preenchida"*
- User isolado, sem associações

Inclua as enumerações como classes `<<enumeration>>` ligadas aos atributos que as usam.

---

**Figura 6 – Diagrama de sequência**

Diagrama UML de sequência do caso de uso **"Operador registra uma despesa"**, cobrindo autenticação e persistência. Participantes, nesta ordem:

`Navegador (React)` · `Supabase Auth` · `API /expenses` · `authenticate` · `authorize` · `validate` · `ExpenseController` · `ExpenseService` · `ExpenseRepository` · `PostgreSQL`

Fluxo:
1. Navegador faz login no Supabase Auth e recebe o token de acesso (JWT ES256)
2. Navegador envia `POST /api/expenses` com `Authorization: Bearer <token>`
3. `authenticate` verifica a assinatura do token pela chave pública do JWKS (mostre a busca do JWKS como chamada ao Supabase Auth, com nota de que a chave fica em cache)
4. `authenticate` consulta o perfil do usuário no PostgreSQL pelo `authUserId` e confere se o status é `ACTIVE`
5. `authorize` confere o papel contra os papéis permitidos na rota
6. `validate` valida o corpo da requisição com o esquema Zod
7. Controller chama Service, Service chama Repository, Repository grava no PostgreSQL
8. Resposta `201 Created` retorna pelo mesmo caminho

Marque com um fragmento `alt` os pontos de recusa: token inválido → `401`; perfil inexistente → `404 PROFILE_NOT_FOUND`; status `PENDING` ou `BLOCKED` → `403`.

---

**Figura 7 – Diagrama de implantação** ⚠️ *este substitui um diagrama antigo que estava errado*

Diagrama UML de implantação com **exatamente três nós**. O erro do diagrama anterior era mostrar frontend e backend em provedores separados — **não estão**, ambos vivem no mesmo projeto Vercel, no mesmo domínio.

**Nó 1 — Dispositivo do Usuário**
Navegador web executando a SPA React.

**Nó 2 — Vercel (projeto único, um só domínio)**
Contém dois artefatos:
- Artefatos estáticos do frontend (build do Vite), distribuídos pela CDN
- Função serverless Node.js executando a aplicação Express, servindo a rota `/api`

Mostre também o agendador da plataforma (cron) chamando `GET /api/jobs/alerts` uma vez por dia.

**Nó 3 — Supabase (plataforma gerenciada)**
Três serviços:
- PostgreSQL (com RLS habilitado)
- Supabase Auth (emite tokens, publica o JWKS)
- Supabase Storage (anexos dos documentos)

**Conexões, com protocolo rotulado:**
- Navegador → Vercel: HTTPS (tanto os estáticos quanto `/api`, **no mesmo domínio** — destaque isso visualmente, é a decisão de arquitetura que o diagrama existe para comunicar)
- Navegador → Supabase Auth: HTTPS (login e renovação de sessão)
- Navegador → Supabase Storage: HTTPS (envio e leitura de arquivos)
- Função serverless → PostgreSQL: TCP/TLS via Prisma
- Função serverless → Supabase Auth: HTTPS (busca do JWKS)

---

**Figura 8 – Modelo lógico do banco de dados** ⚠️ *este também substitui um diagrama incompleto*

Diagrama entidade-relacionamento no formato de modelo lógico (tabelas com colunas, tipos, chaves primárias e estrangeiras). O diagrama anterior omitia a tabela `User` e a relação N:M — as duas precisam aparecer.

Tabelas: `User`, `Vehicle`, `Driver`, `Expense`, `Maintenance`, `Document` e a tabela de associação `_VehicleDrivers` (com as duas chaves estrangeiras `A` → Vehicle e `B` → Driver).

Marque as chaves primárias, as estrangeiras, as colunas `UNIQUE` (`User.email`, `User.cpf`, `User.authUserId`, `Vehicle.plate`, `Driver.cpf`, `Driver.cnh`) e as colunas anuláveis. Indique as exclusões em cascata (`ON DELETE CASCADE`) partindo de Vehicle e de Driver.

Represente `User` visualmente separado das demais, já que não possui relacionamento com elas.

---

## Ao terminar

Depois de gerar as oito figuras, me diga:
1. Se encontrou alguma contradição entre estas instruções e o documento anexo.
2. Se algum diagrama ficou denso demais para caber legível em uma página A4 — e, nesse caso, como você sugere dividi-lo.
