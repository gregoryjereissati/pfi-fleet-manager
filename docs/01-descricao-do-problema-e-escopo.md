# Descrição do Problema e Escopo do Projeto

**Projeto:** Fleet Manager — Sistema de Gestão Inteligente de Frotas
**Código do Projeto:** FM-PFI-2026
**Instituição:** Universidade de Fortaleza — UNIFOR
**Centro:** Centro de Ciências Tecnológicas — Curso de Ciência da Computação
**Disciplina:** Projeto Final Integrador I (PFI I)
**Orientador:** Prof. Me. Ronaldo Gonçalves Junior
**Equipe:** Gregory Jereissati · Luiz Eduardo Pacheco · André Luiz Cavalcante
**Ano:** 2026

---

## 1. Contextualização

A gestão de frotas é uma atividade estratégica para organizações que dependem do uso contínuo de veículos em suas operações. Envolve simultaneamente três dimensões distintas e interdependentes:

- **Dimensão operacional** — quais veículos existem, em que estado se encontram, quem os conduz e quais manutenções foram realizadas ou estão previstas;
- **Dimensão financeira** — quanto cada veículo consome em combustível, peças, serviços, multas, IPVA e seguros, e como esse custo evolui ao longo do tempo;
- **Dimensão documental** — quais documentos obrigatórios estão vinculados a cada veículo e a cada motorista, e quando cada um deles vence.

Essas três dimensões descrevem o mesmo ativo — o veículo — mas, na prática das organizações, costumam ser administradas por pessoas diferentes, em ferramentas diferentes e em momentos diferentes. O setor financeiro registra as despesas em uma planilha; o responsável pela operação anota as manutenções em outro lugar; a documentação fica arquivada em pastas físicas ou digitais sem qualquer mecanismo de acompanhamento de prazos.

O resultado é uma operação em que **nenhum ponto isolado da organização enxerga o veículo por inteiro**.

Este projeto direciona sua atenção a organizações que operam frotas de **porte pequeno e médio — tipicamente entre 5 e 50 veículos**, sem impedimento de uso em frotas maiores. Essa faixa é relevante porque representa exatamente o ponto em que o controle informal deixa de ser viável, mas em que a adoção de sistemas corporativos de grande porte ainda não se justifica economicamente.

---

## 2. Problema identificado

> **O controle de frotas em organizações de pequeno e médio porte é realizado de forma descentralizada e não integrada, distribuído entre planilhas isoladas, registros manuais e controles paralelos. Como consequência, a organização não dispõe de uma visão consolidada e confiável do custo, da condição operacional e da regularidade documental de cada veículo, e passa a agir de forma reativa diante de eventos que seriam previsíveis.**

O problema não está na ausência de informação — os dados normalmente existem. Está na **fragmentação** dessa informação e na **ausência de um mecanismo ativo de acompanhamento de prazos**.

Três características tornam esse cenário particularmente problemático:

**a) A informação existe, mas não é consultável de forma útil.** Saber quanto um veículo específico custou nos últimos seis meses exige consolidar manualmente registros de origens distintas. Como o esforço é alto, a consulta simplesmente não é feita, e a decisão acaba sendo tomada sem ela.

**b) O controle é passivo.** Uma planilha registra que um documento vence em determinada data, mas não avisa ninguém quando essa data se aproxima. O vencimento só é percebido quando já gerou consequência.

**c) Não há responsabilidade nem rastreabilidade definidas.** Arquivos compartilhados podem ser editados por qualquer pessoa, sem distinção entre quem apenas registra uma despesa e quem toma decisões sobre a frota.

---

## 3. Impactos do problema

Os impactos abaixo decorrem diretamente das características descritas na seção anterior:

| Impacto | Origem |
|---|---|
| **Multas e sanções por documentação vencida** | Controle passivo de prazos: CRLV, IPVA, seguro ou CNH vencem sem que ninguém seja alertado. |
| **Manutenções preventivas esquecidas** | Sem acompanhamento sistemático, a manutenção preventiva é substituída pela corretiva, mais cara e associada a indisponibilidade do veículo. |
| **Custo operacional invisível** | O custo real por veículo não é apurado. Veículos deficitários permanecem na frota porque seu custo nunca foi consolidado. |
| **Ausência de previsibilidade orçamentária** | Sem série histórica organizada, não é possível projetar o gasto dos próximos períodos. |
| **Retrabalho e inconsistência de dados** | O mesmo dado é digitado em mais de um lugar, e as versões divergem ao longo do tempo. |
| **Decisão estratégica sem base factual** | Decisões sobre renovação, venda ou realocação de veículos são tomadas por percepção, não por dado. |

---

## 4. Solução proposta

O **Fleet Manager** é uma aplicação web que centraliza, em uma base de dados única e relacional, as três dimensões hoje dispersas da gestão de frota — operacional, financeira e documental — organizando-as em torno da entidade que de fato as conecta: **o veículo**.

A proposta se apoia em quatro mecanismos:

**4.1. Centralização em torno do veículo.** Toda despesa, manutenção e documento é obrigatoriamente vinculado a um veículo. Essa restrição, garantida por integridade referencial no banco de dados, é o que torna possível responder de forma imediata a perguntas que hoje exigem consolidação manual.

**4.2. Substituição do controle passivo por acompanhamento ativo de prazos.** O sistema calcula continuamente a situação de vencimento de cada documento e o status de cada manutenção, classificando-os automaticamente e apresentando-os em uma central de alertas. Uma rotina automatizada percorre diariamente os documentos próximos do vencimento e os sinaliza para acompanhamento.

**4.3. Consolidação analítica.** Um painel de indicadores apura o custo total e médio da frota, a evolução mensal das despesas, a distribuição por categoria de gasto e o custo por veículo, com filtros por período, veículo e tipo de despesa.

**4.4. Controle de acesso por perfil.** O sistema distingue três perfis de usuário com permissões distintas, de modo que o registro de informações operacionais e as decisões sobre a frota sejam atividades separadas e atribuídas a responsáveis diferentes.

---

## 5. Objetivo geral

> Desenvolver um sistema web para gestão inteligente de frotas, com foco no controle operacional, financeiro e documental de veículos, promovendo maior previsibilidade de custos, redução de riscos legais e suporte à tomada de decisão estratégica.

---

## 6. Objetivos específicos

1. Desenvolver funcionalidades de cadastro, edição e gerenciamento de veículos, motoristas e usuários do sistema, incluindo o vínculo entre motoristas e veículos.
2. Permitir o registro de despesas obrigatoriamente vinculadas a um veículo, contemplando as categorias combustível, manutenção, multa, IPVA, seguro e outras.
3. Implementar o controle de manutenções preventivas e corretivas, com acompanhamento dos status programada, realizada e atrasada.
4. Registrar documentos obrigatórios de veículos e motoristas, com data de vencimento, classificação automática da situação e anexo do arquivo digital correspondente.
5. Disponibilizar um painel de indicadores financeiros que apresente custo total, custo médio, custo por veículo, evolução mensal das despesas e distribuição por categoria.
6. Implementar autenticação de usuários e controle de acesso baseado em papéis (RBAC), garantindo segregação de responsabilidades no uso do sistema.
7. Assegurar a qualidade do software por meio de testes automatizados nas regras de negócio do backend.

---

## 7. Público-alvo

O sistema é destinado a organizações que operam frota própria de pequeno e médio porte e que hoje realizam esse controle de forma dispersa. Dentro dessas organizações, o sistema define três perfis de usuário:

| Perfil | Papel na organização | Responsabilidade no sistema |
|---|---|---|
| **ADMIN** — Administrador | Proprietário ou responsável máximo pela frota | Controle total: gerencia usuários, aprova novos cadastros, define perfis e tem acesso irrestrito a todos os módulos. |
| **MANAGER** — Gestor | Gestor da operação, responsável pela equipe de operadores | Controle parcial: administra veículos, motoristas e documentos, e acompanha os indicadores da frota. Não gerencia usuários. |
| **OPERATOR** — Operador | Motorista ou condutor do veículo | Controle restrito ao registro da rotina: lança despesas e manutenções e consulta as informações da frota. Não realiza cadastros estruturais nem gerencia usuários. |

Beneficiam-se indiretamente da solução a área financeira da organização, que passa a dispor de dados consolidados de custo, e a área administrativa, que reduz a exposição a sanções por irregularidade documental.

> **Observação de modelagem.** O perfil OPERATOR corresponde ao motorista da organização. No modelo de dados atual, contudo, *Motorista* (`Driver`) e *Usuário* (`User`) são entidades independentes e não relacionadas entre si: o motorista existe como registro cadastral, e o operador existe como conta de acesso, sem vínculo formal no banco. A unificação dessas entidades está registrada como próxima etapa em [08-proximas-etapas.md](08-proximas-etapas.md).

---

## 8. Escopo

O projeto contempla o desenvolvimento de uma aplicação web completa, composta por interface de usuário, API REST e banco de dados relacional, abrangendo:

- Cadastro e gestão de **veículos**, com controle de situação (ativo/inativo);
- Cadastro e gestão de **motoristas**, incluindo CNH e respectiva data de validade;
- **Vínculo entre motoristas e veículos**, em relação muitos-para-muitos;
- Registro de **despesas operacionais** vinculadas a veículos, por categoria;
- Controle de **manutenções** preventivas e corretivas, com acompanhamento de status;
- Registro de **documentos obrigatórios** de veículos e motoristas, com data de vencimento e anexo de arquivo;
- **Central de alertas** de vencimento de documentos e manutenções;
- **Painel de indicadores** financeiros e operacionais, com filtros;
- **Autenticação** por e-mail e senha e **controle de acesso por perfil (RBAC)**;
- **Gestão de usuários**, com aprovação de novos cadastros e bloqueio de acesso;
- **Internacionalização** da interface em português brasileiro e inglês.

---

## 9. Funcionalidades contempladas

### 9.1. Já desenvolvidas e operacionais

| Funcionalidade | Situação |
|---|---|
| Cadastro de usuários com aprovação por administrador | Implementada |
| Autenticação por e-mail e senha com token JWT | Implementada |
| Controle de acesso por perfil (ADMIN, MANAGER, OPERATOR) | Implementada |
| Bloqueio e reativação de contas de usuário | Implementada |
| CRUD de veículos, com desativação e exclusão permanente | Implementada |
| CRUD de motoristas, com desativação e exclusão permanente | Implementada |
| Vínculo motorista ↔ veículo | Implementada |
| CRUD de despesas com filtros por veículo, tipo e período | Implementada |
| CRUD de manutenções preventivas e corretivas | Implementada |
| CRUD de documentos com classificação automática de vencimento | Implementada |
| Anexo de arquivo digital ao documento, com visualização | Implementada |
| Painel de indicadores com filtros e gráficos | Implementada |
| Central de alertas de vencimento | Implementada |
| Gestão de usuários pelo administrador | Implementada |
| Edição do perfil próprio e alteração de senha | Implementada |
| Interface em português e inglês | Implementada |
| Testes automatizados das regras de negócio do backend | Implementada — 99 testes |

### 9.2. Dentro do escopo, ainda em desenvolvimento

| Funcionalidade | Situação atual | O que falta |
|---|---|---|
| **Publicação em ambiente de produção** | A aplicação executa em ambiente local. | Publicação do frontend, do backend e configuração do banco de produção. |
| **Unificação entre motorista e usuário operador** | As entidades existem separadamente. | Vínculo formal entre o cadastro de motorista e a conta de acesso do operador. |

> Esta separação é apresentada de forma explícita para que o estado do projeto não seja superestimado. As funcionalidades da seção 9.1 possuem persistência real em banco de dados e foram validadas em execução; as da seção 9.2 estão parcialmente implementadas ou pendentes.

---

## 10. Fora do escopo

As funcionalidades a seguir foram deliberadamente excluídas do projeto e **não serão desenvolvidas** nesta versão:

- **Rastreamento por GPS em tempo real** — exige hardware embarcado e infraestrutura de telemetria, fora do alcance de um projeto acadêmico de desenvolvimento web.
- **Telemetria avançada** — leitura de dados do veículo (consumo instantâneo, diagnóstico eletrônico, comportamento de condução).
- **Planejamento e otimização de rotas** — envolve algoritmos de otimização e serviços de geolocalização que constituem, por si só, um problema de pesquisa distinto.
- **Integração automática com sistemas governamentais (DETRAN)** — depende de convênio institucional e de acesso a interfaces públicas não disponíveis ao projeto.
- **Aplicativo móvel nativo** — a solução é entregue como aplicação web responsiva, acessível por navegador em dispositivos móveis.
- **Emissão de documentos fiscais e integração contábil** — o sistema registra despesas para fins gerenciais, não substituindo sistemas contábeis ou fiscais.
- **Gestão de abastecimento por integração com postos ou cartões de combustível** — o registro de combustível é manual.
- **Notificação externa de vencimentos por e-mail, SMS ou mensagem** — o acompanhamento de prazos é realizado **dentro da aplicação**, por meio da central de alertas e dos indicadores de vencimento. A notificação por canais externos exigiria a contratação e configuração de um serviço de envio de mensagens, com custo e dependência operacional que não se justificam no escopo deste trabalho. O mecanismo adotado atende ao propósito de substituir o controle passivo por acompanhamento ativo, sem introduzir dependência de infraestrutura de terceiros.
- **Recuperação autônoma de senha** — decorre da exclusão anterior: a redefinição de senha pelo próprio usuário depende de envio de mensagem por canal externo. A alteração de senha permanece disponível ao usuário autenticado, na tela de perfil.

---

## 11. Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (frontend e backend) |
| Frontend | React 18, Vite, React Router, TailwindCSS, Recharts, i18next |
| Backend | Node.js, Express 4, arquitetura em camadas |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL, hospedado no Supabase |
| Armazenamento de arquivos | Supabase Storage |
| Autenticação | JWT próprio (biblioteca `jose`), senhas com hash `bcryptjs` |
| Validação | Zod (corpo das requisições e variáveis de ambiente) |
| Agendamento | node-cron |
| Testes | Vitest |
| Organização do repositório | Monorepo com npm workspaces |

A fundamentação teórica de cada escolha encontra-se no Documento Técnico, e o detalhamento arquitetural em [04-arquitetura.md](04-arquitetura.md).

---

## 12. Estado atual do desenvolvimento

O projeto encontra-se com o **produto mínimo viável funcionalmente completo em ambiente de desenvolvimento**. Todos os módulos previstos no escopo principal — veículos, motoristas, despesas, manutenções, documentos, alertas, indicadores e gestão de usuários — estão implementados com persistência real em banco de dados relacional.

Indicadores objetivos de verificação:

| Verificação | Resultado |
|---|---|
| Compilação TypeScript (backend) | Sem erros |
| Compilação TypeScript (frontend) | Sem erros |
| Análise estática (ESLint) | Sem erros |
| Testes automatizados | 99 testes, 13 arquivos — todos aprovados |
| Build de produção do frontend | Gerado com sucesso |

**Pendências reconhecidas, declaradas de forma transparente:**

1. O sistema ainda não foi publicado em ambiente de produção — a execução é local.
2. O sistema não foi aplicado em uma organização real. A validação foi realizada com uma base de dados fictícia, porém consistente, gerada por rotina de povoamento automatizada.
3. Não há testes automatizados de interface; a cobertura de testes concentra-se nas regras de negócio do backend.
4. As entidades *Motorista* e *Usuário* não possuem vínculo formal no modelo de dados, ainda que o perfil OPERATOR corresponda conceitualmente ao motorista.

> O acompanhamento de vencimentos ocorre exclusivamente dentro da aplicação, por decisão de escopo registrada na seção 10, e não constitui pendência.

---

## 13. Resultados esperados

Os resultados abaixo são apresentados como **expectativas do projeto**, e não como benefícios medidos, uma vez que o sistema ainda não foi aplicado em ambiente organizacional real.

1. **Centralização da informação** — eliminar a dispersão entre planilhas e controles paralelos, estabelecendo uma fonte única de dados sobre a frota.
2. **Redução da exposição a sanções** — diminuir a ocorrência de multas decorrentes de documentação vencida, por meio do acompanhamento ativo de prazos.
3. **Visibilidade do custo por veículo** — tornar apurável o custo individual de cada veículo, hoje diluído no custo agregado da operação.
4. **Migração da manutenção corretiva para a preventiva** — reduzir a indisponibilidade e o custo associados a falhas não antecipadas.
5. **Apoio à decisão baseada em dados** — fornecer série histórica organizada que sustente decisões de renovação, alienação ou realocação de veículos.
6. **Segregação de responsabilidades** — assegurar, por meio do controle de acesso por perfil, que o registro operacional e a decisão gerencial sejam atividades distintas e atribuíveis.

A verificação efetiva desses resultados demandaria aplicação do sistema em uma organização real, com medição comparativa antes e depois da adoção, o que se situa fora do escopo temporal deste trabalho e é registrado como possibilidade de continuidade.

---

## Documentos relacionados

| Documento | Conteúdo |
|---|---|
| [02-visao-geral-do-projeto.md](02-visao-geral-do-projeto.md) | Visão geral do produto e dos módulos |
| [03-requisitos.md](03-requisitos.md) | Requisitos funcionais, não funcionais e regras de negócio |
| [04-arquitetura.md](04-arquitetura.md) | Arquitetura da solução e fluxo de dados |
| [05-banco-de-dados.md](05-banco-de-dados.md) | Modelo de dados e dicionário de entidades |
| [06-status-de-desenvolvimento.md](06-status-de-desenvolvimento.md) | Matriz detalhada de status por funcionalidade |
| [07-configuracao-e-execucao.md](07-configuracao-e-execucao.md) | Instruções de instalação e execução |
| [08-proximas-etapas.md](08-proximas-etapas.md) | Próximas etapas do desenvolvimento |
