# Status de Desenvolvimento

**Projeto:** Fleet Manager — Sistema de Gestão Inteligente de Frotas
**Data desta apuração:** 24 de agosto de 2026
**Método:** verificação direta do código-fonte, execução dos testes automatizados e das rotinas de compilação e build.

Este documento apresenta o estado real do desenvolvimento. Funcionalidades parcialmente implementadas ou pendentes estão declaradas como tais.

**Legenda:**
✅ **Implementado** — código completo com persistência real em banco de dados
🟡 **Parcial** — existe estrutura funcional, mas falta parte relevante
⏳ **Planejado** — previsto no escopo, sem implementação
❌ **Não implementado** — sem previsão nesta versão

---

## 1. Resumo

| Indicador | Situação |
|---|---|
| Módulos funcionais do escopo principal | 8 de 8 implementados |
| Requisitos funcionais originais (RF01–RF10) | 10 atendidos |
| Requisitos não funcionais (RNF01–RNF07) | 6 atendidos, 1 sem verificação empírica |
| Migração para o Supabase Auth | Concluída |
| Testes automatizados | 100 aprovados, 0 reprovados |
| Compilação TypeScript | Sem erros (backend e frontend) |
| Análise estática (ESLint) | Sem erros |
| Build de produção do frontend | Gerado com sucesso |
| Publicação em produção | Não realizada |

**Situação geral:** produto mínimo viável funcionalmente completo em ambiente de desenvolvimento, com publicação em produção pendente.

---

## 2. Matriz de funcionalidades

### 2.1. Autenticação e controle de acesso

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Cadastro de usuário em duas etapas | ✅ | `services/auth.service.ts`, `pages/Register.tsx` | — |
| Login com e-mail e senha (Supabase Auth) | ✅ | `lib/supabase.ts`, `pages/Login.tsx` | — |
| Verificação do token por JWKS (ES256) | ✅ | `lib/verify-token.ts` | — |
| Renovação automática da sessão | ✅ | Cliente `supabase-js` | — |
| Vínculo entre conta de acesso e perfil | ✅ | `services/auth.service.ts`, coluna `authUserId` | — |
| Controle de acesso por perfil (RBAC) | ✅ | `middlewares/authorize.ts` | — |
| Aprovação de novos usuários pelo administrador | ✅ | `middlewares/authenticate.ts`, `components/AccessGate.tsx` | — |
| Bloqueio e reativação de contas | ✅ | `PATCH /users/:id/status`, `pages/UserList.tsx` | — |
| Proteção de rotas no frontend | ✅ | `components/ProtectedRoute.tsx` | — |
| Alteração da própria senha | ✅ | `supabase.auth.updateUser`, `pages/Profile.tsx` | — |
| Recuperação autônoma de senha | ❌ | — | Fora do escopo — depende de envio externo |
| Confirmação de e-mail no cadastro | ❌ | — | Fora do escopo desta versão |

### 2.2. Veículos

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Cadastro e edição de veículos | ✅ | `services/vehicle.service.ts`, `pages/VehicleForm.tsx` | — |
| Listagem com filtros | ✅ | `pages/VehicleList.tsx` | — |
| Tela de detalhes | ✅ | `pages/VehicleDetail.tsx` | — |
| Desativação e reativação | ✅ | `PUT /vehicles/:id` | — |
| Exclusão permanente com cascata | ✅ | `DELETE /vehicles/:id/permanent` | — |
| Normalização de dados em maiúsculas | ✅ | `pages/VehicleForm.tsx` | — |
| Vínculo com motoristas | ✅ | `pages/VehicleDrivers.tsx` | — |

### 2.3. Motoristas

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Cadastro e edição de motoristas | ✅ | `services/driver.service.ts`, `pages/DriverForm.tsx` | — |
| Listagem com filtros | ✅ | `pages/DriverList.tsx` | — |
| Tela de detalhes com veículos e documentos | ✅ | `pages/DriverDetail.tsx` | — |
| Controle de validade da CNH | ✅ | Campo `cnhExpiry`; documento do tipo `CNH` | — |
| Desativação e exclusão permanente | ✅ | `DELETE /drivers/:id`, `/permanent` | — |
| Vínculo entre motorista e conta de usuário | ⏳ | — | Relacionar `Driver` e `User` |

### 2.4. Despesas

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Registro de despesa vinculada a veículo | ✅ | `services/expense.service.ts`, `pages/ExpenseForm.tsx` | — |
| Seis categorias de despesa | ✅ | Enumeração `ExpenseType` | — |
| Listagem com filtros por veículo, tipo e período | ✅ | `pages/ExpenseList.tsx` | — |
| Edição e exclusão | ✅ | `PUT` e `DELETE /expenses/:id` | — |
| Anexo de comprovante fiscal | ❌ | — | Fora do escopo desta versão |

### 2.5. Manutenções

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Registro de manutenção preventiva e corretiva | ✅ | `services/maintenance.service.ts` | — |
| Controle dos status programada, realizada e atrasada | ✅ | Enumeração `MaintenanceStatus` | — |
| Normalização automática da data de conclusão | ✅ | `services/maintenance.service.ts` | — |
| Listagem com filtros | ✅ | `pages/MaintenanceList.tsx` | — |
| Agendamento recorrente de manutenção preventiva | ❌ | — | Fora do escopo desta versão |

### 2.6. Documentos e alertas

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Cadastro de documento com data de vencimento | ✅ | `services/document.service.ts` | — |
| Vínculo exclusivo a veículo ou motorista | ✅ | Validação Zod em `document.routes.ts` | — |
| Filtro de tipos conforme a entidade | ✅ | `pages/DocumentForm.tsx` | — |
| Classificação automática do vencimento | ✅ | `repositories/document.repository.ts` | — |
| Anexo de arquivo (imagem ou PDF) | ✅ | `lib/supabase.ts` | — |
| Visualização do arquivo anexado | ✅ | `components/FilePreviewModal.tsx` | — |
| Central de alertas | ✅ | `pages/AlertCenter.tsx` | — |
| Contador de alertas no menu e no cabeçalho | ✅ | `hooks/useAlertCount.ts` | — |
| Rotina diária de sinalização de vencimentos | ✅ | `jobs/alertCron.ts` | Ver observação abaixo |
| **Notificação por e-mail, SMS ou mensagem** | ❌ | — | **Fora do escopo** — decisão registrada no documento de escopo |
| Exclusão do arquivo do Storage ao excluir o documento | 🟡 | — | Remover o objeto do bucket |
| Validação de tipo e tamanho no servidor | 🟡 | — | Ver seção 4 |

> **Observação sobre a rotina de alertas.** A rotina executa diariamente e marca os documentos que vencem em até 30 dias com `alertSent = true`. O alerta é apresentado **dentro da aplicação**, na central de alertas e nos contadores da interface. A notificação por canais externos foi **excluída do escopo por decisão de projeto** e, portanto, não figura como pendência. A delimitação é declarada de forma explícita para que o alcance da funcionalidade não seja interpretado de maneira ampliada.

### 2.7. Painel de indicadores

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Indicadores consumindo dados reais da API | ✅ | `services/dashboard.service.ts`, `hooks/useDashboard.ts` | — |
| Filtros por período, veículo e tipo de despesa | ✅ | `pages/Dashboard.tsx` | — |
| Custo total, custo médio e quantidade de despesas | ✅ | `services/dashboard.service.ts` | — |
| Evolução mensal das despesas (gráfico de barras) | ✅ | `pages/Dashboard.tsx` (Recharts) | — |
| Distribuição por categoria (gráfico de pizza) | ✅ | `pages/Dashboard.tsx` | — |
| Custo por veículo | ✅ | `services/dashboard.service.ts` | — |
| Últimas despesas registradas | ✅ | `pages/Dashboard.tsx` | — |
| Indicadores de manutenções pendentes e atrasadas | ✅ | `services/dashboard.service.ts` | — |
| Indicadores de documentos vencidos e a vencer | ✅ | `services/dashboard.service.ts` | — |
| Exportação de relatórios (PDF ou planilha) | ❌ | — | Fora do escopo desta versão |

### 2.8. Gestão de usuários e perfil

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Listagem de usuários (ADMIN) | ✅ | `pages/UserList.tsx` | — |
| Alteração de perfil de acesso | ✅ | `PATCH /users/:id/role` | — |
| Alteração de situação da conta | ✅ | `PATCH /users/:id/status` | — |
| Exclusão de usuário | ✅ | `DELETE /users/:id` | — |
| Edição do perfil próprio | ✅ | `pages/Profile.tsx` | — |
| Alteração da própria senha | ✅ | `PUT /users/me` | — |

### 2.9. Interface e experiência de uso

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Internacionalização pt-BR / en-US | ✅ | `lib/i18n.ts`, `locales/` | — |
| Persistência do idioma escolhido | ✅ | `lib/i18n.ts` | — |
| Identidade visual e tema escuro | ✅ | `tailwind.config.ts`, `index.css` | — |
| Diálogos de confirmação próprios | ✅ | `components/ConfirmDialog.tsx` | — |
| Layout responsivo | ✅ | Classes utilitárias do TailwindCSS | — |
| Acessibilidade (WCAG) | ⏳ | — | Não avaliada formalmente |

### 2.10. Qualidade e infraestrutura

| Funcionalidade | Status | Evidência | Próximo passo |
|---|---|---|---|
| Testes unitários dos serviços | ✅ | 8 arquivos em `services/__tests__/` | — |
| Testes dos middlewares | ✅ | 3 arquivos em `middlewares/__tests__/` | — |
| Testes de repositório e controller | ✅ | 2 arquivos | — |
| Validação de entrada com Zod | ✅ | Schemas em `routes/` | — |
| Validação de variáveis de ambiente | ✅ | `config/env.ts` | — |
| Migrations versionadas | ✅ | 5 migrations | — |
| Rotina de povoamento do banco | ✅ | `prisma/seed.ts` | — |
| Configuração do Storage versionada | ✅ | `supabase/storage-setup.sql` | — |
| Testes automatizados de interface | ⏳ | — | Introduzir testes de componente |
| Testes de integração da API | ⏳ | — | `supertest` já é dependência do projeto |
| Integração contínua (CI) | ⏳ | — | Configurar execução automática dos testes |
| Publicação do frontend | ⏳ | — | Publicar na Vercel |
| Publicação do backend | ⏳ | — | Publicar no Railway |
| Configuração de CORS para produção | 🟡 | `app.ts` | Ver seção 4 |

---

## 3. Resultado das verificações executadas

Verificações realizadas em 24 de agosto de 2026, neste repositório.

```text
Instalação de dependências ......... ✅ OK
Análise estática (ESLint) .......... ✅ OK — nenhum erro
TypeScript (backend) ............... ✅ OK — nenhum erro
TypeScript (frontend) .............. ✅ OK — nenhum erro
Testes automatizados ............... ✅ OK — 100 aprovados / 13 arquivos
Build de produção (frontend) ....... 🟡 OK com aviso — pacote único de 969 kB
Execução local ..................... 🟡 Depende de banco de dados configurado
```

### Distribuição dos testes automatizados

| Arquivo de teste | Testes |
|---|---:|
| `services/__tests__/vehicle.service.test.ts` | 17 |
| `services/__tests__/document.service.test.ts` | 15 |
| `services/__tests__/user.service.test.ts` | 11 |
| `services/__tests__/maintenance.service.test.ts` | 10 |
| `services/__tests__/driver.service.test.ts` | 10 |
| `services/__tests__/auth.service.test.ts` | 8 |
| `services/__tests__/expense.service.test.ts` | 9 |
| `middlewares/__tests__/authenticate.test.ts` | 9 |
| `middlewares/__tests__/authorize.test.ts` | 4 |
| `services/__tests__/dashboard.service.test.ts` | 3 |
| `middlewares/__tests__/validate.test.ts` | 3 |
| `controllers/__tests__/user.controller.test.ts` | 2 |
| `repositories/__tests__/dashboard.repository.test.ts` | 1 |
| **Total** | **100** |

---

## 4. Pendências técnicas conhecidas

Registradas de forma explícita para que o estado do projeto não seja superestimado.

| # | Pendência | Impacto | Prioridade |
|---|---|---|---|
| 1 | CORS aceita apenas origens `localhost` | Impede o funcionamento após a publicação em produção | Alta |
| 2 | A confirmação de e-mail precisa estar desativada no projeto Supabase | Com ela ativa, o cadastro não se completa, pois não há serviço de envio configurado | Média |
| 3 | Arquivos permanecem no Storage após a exclusão do documento | Acúmulo de arquivos órfãos | Média |
| 4 | Ausência de validação de arquivo no servidor de aplicação | A restrição depende exclusivamente da política do Storage | Média |
| 5 | Bucket de arquivos é público | Quem possuir a URL acessa o arquivo sem autenticação | Média |
| 6 | `User` e `Driver` sem vínculo no modelo de dados | O operador não pode ser associado ao seu cadastro de motorista | Média |
| 7 | Pacote JavaScript único, sem divisão por rota | Carregamento inicial mais lento | Baixa |
| 8 | Ausência de testes automatizados de interface | Regressões visuais não são detectadas automaticamente | Baixa |
| 9 | RNF04 (tempo de resposta) sem medição formal | Requisito declarado, porém não comprovado | Baixa |

---

## 5. Histórico de evolução

| Etapa | Entrega | Situação |
|---|---|---|
| Preparação | Monorepo, schema, aplicação Express, middlewares, usuários | Concluída |
| Etapa 1 | Autenticação no frontend, internacionalização, painel inicial | Concluída |
| Etapa 2 | Veículos e motoristas — API e interface | Concluída |
| Etapa 3 | Despesas e manutenções — API e interface | Concluída |
| Etapa 4 | Documentos, rotina de sinalização e central de alertas | Concluída |
| Etapa 5 | Indicadores reais, gestão de usuários e testes | Concluída |
| Ajustes | Autenticação própria, migração do banco, exclusão permanente, anexo de arquivos, identidade visual | Concluída |
| Ajustes | Migração da autenticação própria para o **Supabase Auth** | Concluída |
| Etapa 6 | Publicação em produção e entrega final | **Em andamento** |

---

## Documentos relacionados

- [01-descricao-do-problema-e-escopo.md](01-descricao-do-problema-e-escopo.md) — escopo do projeto
- [03-requisitos.md](03-requisitos.md) — requisitos e sua rastreabilidade
- [08-proximas-etapas.md](08-proximas-etapas.md) — encaminhamento das pendências
