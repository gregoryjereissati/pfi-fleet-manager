# Requisitos

**Projeto:** Fleet Manager — Sistema de Gestão Inteligente de Frotas
**Código do Projeto:** FM-PFI-2026

Este documento consolida os requisitos do sistema. Os requisitos **RF01–RF10** e **RNF01–RNF07** têm origem no documento *Levantamento de Requisitos (03/03/2026)* e foram preservados com a numeração original. Os requisitos **RF11–RF17** foram identificados a partir da análise do sistema implementado e correspondem a funcionalidades desenvolvidas ao longo do projeto que não constavam do levantamento inicial.

A coluna **Situação** reflete o estado verificado no código-fonte, e não a intenção do projeto.

**Legenda:** ✅ Atendido · 🟡 Parcialmente atendido · ⏳ Não implementado

---

## 1. Requisitos Funcionais

### 1.1. Requisitos do levantamento original

| ID | Descrição | Situação | Evidência |
|---|---|---|---|
| **RF01** | O sistema deverá permitir o cadastro, edição e exclusão de veículos. | ✅ | `vehicle.service.ts`, `VehicleList.tsx`, `VehicleForm.tsx` |
| **RF02** | O sistema deverá permitir o cadastro e gerenciamento de motoristas. | ✅ | `driver.service.ts`, `DriverList.tsx`, `DriverForm.tsx` |
| **RF03** | O sistema deverá permitir o registro de despesas vinculadas obrigatoriamente a um veículo. | ✅ | `expense.service.ts`; `vehicleId` é obrigatório no schema e no banco |
| **RF04** | O sistema deverá permitir o registro de diferentes tipos de despesas (combustível, manutenção, multas, IPVA, seguros, entre outros). | ✅ | Enumeração `ExpenseType` com 6 categorias |
| **RF05** | O sistema deverá permitir o controle de manutenções preventivas e corretivas. | ✅ | `maintenance.service.ts`; enumerações `MaintenanceType` e `MaintenanceStatus` |
| **RF06** | O sistema deverá registrar documentos obrigatórios com data de vencimento. | ✅ | `document.service.ts`; enumeração `DocumentType` com 6 tipos |
| **RF07** | O sistema deverá emitir alertas para vencimentos próximos de documentos e manutenções. | ✅ | `AlertCenter.tsx`, `alertCron.ts`, `useAlertCount.ts` — **ver observação abaixo** |
| **RF08** | O sistema deverá gerar indicadores financeiros básicos, como custo por veículo e evolução mensal de despesas. | ✅ | `dashboard.service.ts`, `Dashboard.tsx` |
| **RF09** | O sistema deverá possuir autenticação de usuários. | ✅ | Supabase Auth; verificação do token em `lib/verify-token.ts` |
| **RF10** | O sistema deverá controlar níveis de acesso por perfil (Administrador, Gestor e Operador). | ✅ | `authorize.ts`; enumeração `UserRole` |

> **Observação sobre o RF07 — canal de emissão do alerta.** O requisito é atendido **dentro da aplicação**: o sistema classifica automaticamente documentos e manutenções por situação de vencimento, consolida-os em uma central de alertas e exibe contadores no menu lateral e no cabeçalho. Uma rotina diária identifica os documentos que vencem em até 30 dias e os marca como sinalizados, de forma idempotente.
>
> A **notificação por canais externos** — e-mail, SMS ou mensagem — foi avaliada e **deliberadamente excluída do escopo**, conforme registrado em [01-descricao-do-problema-e-escopo.md](01-descricao-do-problema-e-escopo.md#10-fora-do-escopo). O alerta é, portanto, percebido por quem acessa o sistema. Esta delimitação é declarada de forma explícita para que o alcance do requisito não seja interpretado de maneira ampliada.

### 1.2. Requisitos identificados durante o desenvolvimento

| ID | Descrição | Situação | Evidência |
|---|---|---|---|
| **RF11** | O sistema deverá permitir o vínculo de múltiplos motoristas a um veículo e de um motorista a múltiplos veículos. | ✅ | Relação `_VehicleDrivers`; `VehicleDrivers.tsx` |
| **RF12** | O sistema deverá permitir o anexo de arquivo digital (imagem ou PDF) ao registro de documento, com visualização. | ✅ | `lib/supabase.ts`, `FilePreviewModal.tsx` |
| **RF13** | O sistema deverá exigir aprovação de um administrador para liberar o acesso de usuários recém-cadastrados. | ✅ | `UserStatus.PENDING`, `AccessGate.tsx`, `authenticate.ts` |
| **RF14** | O sistema deverá permitir o bloqueio e a reativação de contas de usuário pelo administrador. | ✅ | `PATCH /users/:id/status`, `UserList.tsx` |
| **RF15** | O sistema deverá permitir que o usuário edite seus próprios dados cadastrais e altere sua senha. | ✅ | `GET/PUT /users/me` (dados cadastrais) e `supabase.auth.updateUser` (senha), em `Profile.tsx` |
| **RF16** | O sistema deverá distinguir a desativação de um registro de sua exclusão permanente. | ✅ | `DELETE /:id` (desativa) e `DELETE /:id/permanent` (exclui) |
| **RF17** | O sistema deverá apresentar a interface em português brasileiro e inglês, com escolha persistida. | ✅ | `lib/i18n.ts`, `locales/pt-BR.json`, `locales/en-US.json` |

### 1.3. Requisitos excluídos do escopo

Registrados para delimitar o alcance do sistema e evitar interpretação ampliada dos requisitos acima.

| Descrição | Motivo da exclusão |
|---|---|
| Notificação de vencimentos por e-mail, SMS ou mensagem | Exigiria contratação e configuração de serviço externo de envio, com custo e dependência operacional não justificáveis no escopo. O acompanhamento de prazos é realizado dentro da aplicação (RF07). |
| Recuperação autônoma de senha pelo usuário | Decorre da exclusão anterior: a redefinição depende de envio por canal externo. A alteração de senha permanece disponível ao usuário autenticado (RF15). |

---

## 2. Requisitos Não Funcionais

| ID | Descrição | Situação | Como é atendido |
|---|---|---|---|
| **RNF01** | O sistema deverá ser desenvolvido como aplicação web responsiva. | ✅ | React com TailwindCSS; layout adaptável por breakpoints. |
| **RNF02** | O sistema deverá garantir armazenamento seguro dos dados em banco de dados relacional. | ✅ | PostgreSQL gerenciado no Supabase, com conexão TLS. As senhas não são armazenadas pela aplicação: ficam sob responsabilidade do Supabase Auth. |
| **RNF03** | O sistema deverá possuir controle de autenticação e autorização. | ✅ | Autenticação pelo Supabase Auth, com token ES256 verificado por JWKS; autorização pelos middlewares `authenticate` e `authorize`, aplicados por rota. |
| **RNF04** | O sistema deverá apresentar tempo de resposta adequado às operações básicas (até 3 segundos em operações comuns). | 🟡 | As consultas usam índices e agregações no banco. **Não foi realizada medição formal de desempenho**, portanto o atendimento não está comprovado por evidência empírica. |
| **RNF05** | O sistema deverá ser desenvolvido utilizando arquitetura cliente-servidor. | ✅ | SPA React consumindo API REST em Express, processos independentes. |
| **RNF06** | O sistema deverá permitir escalabilidade futura para inclusão de novas funcionalidades. | ✅ | Arquitetura em camadas, monorepo com tipos compartilhados, migrations versionadas. |
| **RNF07** | O sistema deverá manter integridade e consistência das informações registradas. | ✅ | Chaves estrangeiras com exclusão em cascata, restrições de unicidade e validação de entrada com Zod. |

### 2.1. Requisitos não funcionais adicionais adotados

| ID | Descrição | Situação | Como é atendido |
|---|---|---|---|
| **RNF08** | O código deverá possuir cobertura de testes automatizados nas regras de negócio do backend. | ✅ | 100 testes automatizados em 13 arquivos, executados com Vitest. |
| **RNF09** | A interface deverá estar disponível em português brasileiro e inglês. | ✅ | i18next com detecção e persistência da preferência. |
| **RNF10** | As variáveis de ambiente deverão ser validadas na inicialização da aplicação. | ✅ | `config/env.ts` valida com Zod `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `PORT` e `NODE_ENV`, interrompendo a inicialização em caso de configuração inválida. |

---

## 3. Regras de Negócio

| ID | Regra | Onde é aplicada |
|---|---|---|
| **RN01** | Toda despesa deve estar obrigatoriamente vinculada a um veículo. | Coluna `vehicleId` não nula em `Expense`; validação Zod na rota. |
| **RN02** | Toda manutenção deve estar obrigatoriamente vinculada a um veículo. | Coluna `vehicleId` não nula em `Maintenance`. |
| **RN03** | Um documento deve estar vinculado a **um veículo ou a um motorista**, nunca a ambos e nunca a nenhum. | Validação `refine` no schema Zod de `document.routes.ts`. |
| **RN04** | Usuários recém-cadastrados recebem a situação `PENDING` e não acessam o sistema até serem aprovados por um administrador. | Valor padrão em `User.status`; verificação em `authenticate.ts` e `auth.service.login`. |
| **RN05** | Usuários com situação `BLOCKED` têm o acesso negado imediatamente, mesmo portando um token válido e não expirado. | `authenticate.ts` reconsulta a situação do usuário no banco a cada requisição. |
| **RN06** | A placa do veículo, o CPF e a CNH do motorista, e o CPF e o e-mail do usuário são únicos no sistema. | Restrições `@unique` no schema Prisma. |
| **RN07** | A exclusão permanente de um veículo ou motorista remove em cascata todos os registros dependentes (despesas, manutenções e documentos). | `onDelete: Cascade` nas relações do Prisma. |
| **RN08** | A desativação de um veículo ou motorista preserva o registro e seu histórico, alterando apenas sua situação para `INACTIVE`. | Método `delete` dos serviços correspondentes. |
| **RN09** | Ao registrar uma manutenção como realizada, a data de conclusão é normalizada automaticamente; ao reverter o status, a data é removida. | `maintenance.service.ts`. |
| **RN10** | A situação de vencimento de um documento é calculada dinamicamente a partir da data de validade, não sendo armazenada. | `document.repository.ts`. |
| **RN11** | Documentos que vencem em até 30 dias são sinalizados diariamente por rotina automatizada, de forma idempotente. | `jobs/alertCron.ts`, execução diária à meia-noite. |
| **RN12** | Os dados de identificação do veículo (placa, marca, modelo e cor) são normalizados para letras maiúsculas. | `VehicleForm.tsx`. |
| **RN13** | O token de acesso é emitido e renovado pelo Supabase Auth; a API apenas verifica sua validade, o emissor e o público a cada requisição. | `lib/verify-token.ts`. |
| **RN14** | O cadastro ocorre em duas etapas: criação da conta no Supabase Auth e criação do perfil na aplicação, vinculado pelo campo `authUserId`. | `auth.service.ts`, `Register.tsx`. |
| **RN15** | Quando já existe perfil com o mesmo e-mail e sem conta vinculada, o cadastro vincula o perfil existente em vez de criar outro, preservando seu papel e sua situação. | `auth.service.registerProfile`. |

---

## 4. Matriz de controle de acesso (RBAC)

Matriz extraída da configuração real das rotas em `apps/api/src/routes/`.

| Recurso | ADMIN | MANAGER | OPERATOR |
|---|:---:|:---:|:---:|
| Gerenciar usuários (listar, alterar perfil e situação, excluir) | ✅ | ❌ | ❌ |
| Editar o próprio perfil | ✅ | ✅ | ✅ |
| Consultar veículos e motoristas | ✅ | ✅ | ✅ |
| Cadastrar e editar veículos | ✅ | ✅ | ❌ |
| Cadastrar e editar motoristas | ✅ | ✅ | ❌ |
| Vincular e desvincular motorista ↔ veículo | ✅ | ✅ | ❌ |
| Consultar e registrar despesas | ✅ | ✅ | ✅ |
| Consultar e registrar manutenções | ✅ | ✅ | ✅ |
| Consultar documentos | ✅ | ✅ | ✅ |
| Cadastrar e editar documentos | ✅ | ✅ | ❌ |
| Excluir despesas e manutenções | ✅ | ✅ | ❌ |
| Excluir veículos, motoristas e documentos | ✅ | ✅ | ❌ |
| Consultar o painel de indicadores | ✅ | ✅ | ✅ |

> **Nota.** Esta matriz reflete o comportamento efetivo do sistema. O perfil MANAGER possui permissão de exclusão sobre registros operacionais e cadastrais, restrição que o distingue do ADMIN apenas no que se refere à gestão de usuários.

---

## 5. Rastreabilidade — requisito × módulo

| Requisito | Módulo do sistema | Rotas da API |
|---|---|---|
| RF01, RF16 | Veículos | `/api/vehicles` |
| RF02, RF16 | Motoristas | `/api/drivers` |
| RF11 | Vínculo veículo–motorista | `/api/vehicles/:id/drivers` |
| RF03, RF04 | Despesas | `/api/expenses` |
| RF05 | Manutenções | `/api/maintenances` |
| RF06, RF12 | Documentos | `/api/documents` |
| RF07 | Alertas | `/api/documents/alerts/count` |
| RF08 | Indicadores | `/api/dashboard/indicators` |
| RF09 | Autenticação | Supabase Auth (login) · `/api/auth/register` (perfil) |
| RF10, RF13, RF14 | Gestão de usuários | `/api/users` |
| RF15 | Perfil do usuário | `/api/users/me` |
| RF17 | Internacionalização | — (camada de interface) |
