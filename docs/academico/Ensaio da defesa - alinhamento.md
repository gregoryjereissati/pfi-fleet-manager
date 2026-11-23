# Ensaio da defesa: alinhamento entre aplicação, Documento Técnico e apresentação

> Atualizado em 09/11/2026, depois da revisão pela "balança": em cada ponto, o
> lado mais completo (documento ou aplicação) foi levado para o outro.
> Nada foi commitado.
>
> **Revisão de 23/11/2026.** Entrou o capítulo 3, de trabalhos relacionados, e os
> capítulos seguintes avançaram um número (metodologia é o 4, desenvolvimento o 5,
> resultados o 6, conclusão o 7). Os quadros avançaram dois. As seções citadas abaixo
> já estão atualizadas. Os slides valem pela versão
> `docs/apresentacao/Fleet_Manager_Defesa_v6.html`, de 15 minutos.

---

## 1. Situação atual

| Item | Situação |
|---|---|
| Aplicação | Três promessas do documento implementadas: manutenção atrasada calculada sozinha, central de alertas com manutenções e CNH, rotina diária com data de sinalização visível. Três regras novas: CNH vencida bloqueia vínculo novo, a empresa nunca fica sem administrador ativo e despesa não aceita data futura |
| Testes | 402 automatizados: 213 unitários, 52 de integração e 137 de ponta a ponta. Cobertura de 88,4% das linhas do servidor, com as duas suítes juntas |
| Workload do professor | Rodado em 09/11, em 10, 50 e 100 conexões: 124.753 requisições, zero erro, p99 máximo de 342,5 ms. O script está versionado em `apps/api/carga/workload.ts` |
| Documento Técnico | `.docx` regenerado pelo `scripts/gerar-documento.py`. **O PDF não foi regenerado**: o `gerar-pdf.py` exige Windows com Word, que preenche sumário, listas e numeração |
| README, CLAUDE.md, AGENTS.md | Atualizados com os números e as funcionalidades novas |

### O que ainda depende de vocês

1. ~~Gerar o PDF no Windows~~: **resolvido**. `python3 scripts/gerar-pdf.py` gera o PDF também no Mac, pelo LibreOffice. São 67 páginas, com sumário, listas e referências preenchidos e números de página conferidos. Vale revisar o PDF página a página (quebras e tabelas largas).
2. **Cadastrar os segredos da publicação no GitHub** antes do próximo push na `main`: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` e, opcionalmente, `PRODUCAO_DIRECT_URL`. A tabela está no README, em "Integração e entrega contínuas". Sem eles, o job `publicar` falha de propósito e a produção fica parada na última versão. A publicação agora só acontece depois do CI (corrigido em 09/11).
3. ~~Zod com vulnerabilidade alta~~: **corrigido**. Migrado para o Zod 4.6.7, com APIs obsoletas substituídas, e o `minimatch` das ferramentas de lint forçado para a versão 11. `npm audit`: 0 vulnerabilidades.
4. ~~Cronograma (Apêndice A)~~: **resolvido**. Saiu a linha da entrega de agosto; o documento não menciona mais a etapa anterior.
5. **Referências novas.** **resolvido** em 23/11: cada citação foi conferida na fonte. Humble e Farley saíram (entrou Fowler) e a ISO/IEC 25010 passou para a edição de 2023.
6. **Banco de produção.** A migration `0007` (coluna `alert_sent_at`) só foi aplicada no banco local. Com o segredo `PRODUCAO_DIRECT_URL` cadastrado, o job `publicar` a aplica antes de publicar. Sem ele, rode `npm run db:migrate` com o `.env` de produção antes do push.
7. **Relatório de Testes de 20/10** (PDF separado): continua com os números daquela rodada. O Documento Técnico agora traz as duas rodadas, cada tabela com a data.

### Melhorias de 09/11 (tarde)

- **Listas de seleção no design system.** As 23 seleções nativas foram trocadas por um componente próprio (`components/ledger/Select.tsx`), com teclado, busca pela primeira letra e validação de obrigatório.
- **Sino com painel de notificações.** Mostra a contagem por frente e os três alertas mais urgentes, sem sair da tela, com atalho para a central.
- **Troca de aba imediata.** A animação de entrada ficou só na primeira tela.
- **Volume de demonstração.** `npm run db:popular` cria um ano de operação nas duas empresas. Para a apresentação, rode-o contra a produção (passo a passo no README).
- **Documento.** Seções 4.5, 5.6 e 6.7 e as Figuras 8 e 9 atualizadas.

---

## 2. A balança: o que foi para cada lado

| Aspecto | Lado melhor | O que foi feito |
|---|---|---|
| Manutenção "atrasada" | Documento | Implementada: calculada na consulta, a partir da data prevista; não pode ser escolhida à mão (`400 OVERDUE_IS_COMPUTED`) |
| Central de alertas | Documento | Agora reúne documentos (30 dias), manutenções (atrasadas + 7 dias) e CNH (30 dias), sem repetir a mesma CNH. Rota nova: `GET /api/alerts` |
| Rotina diária | Nenhum dos dois | Grava `alert_sent_at`; a central mostra "Sinalizado pela rotina diária em…"; renovar o documento limpa a sinalização |
| Corpo grande demais → 413 | Relatório | Faltava o teste; criado o caso VAL-07 |
| Testes, CI, observabilidade, paginação, cancelamento com motivo | Aplicação | Escritos no documento (2.7, 4.5, 5.6, 5.11, 5.12, 6.2 a 6.5) |
| Matriz de acesso | Aplicação | Quadro 6 reescrito a partir das rotas, com o recorte do operador |
| Conta protegida por e-mail fixo | Nenhum dos dois | Trocada pela regra "a empresa nunca fica sem administrador ativo" (`409 LAST_ACTIVE_ADMIN`) |
| CNH vencida | Documento (objetivo de reduzir risco legal) | Bloqueia vínculo novo (`409 DRIVER_LICENSE_EXPIRED`) sem desfazer o existente |
| Despesa com data futura | Documento (custo realizado) | Recusada na API e na tela |
| RNF04 "sem medição" | Aplicação | Meta numérica adotada (p99 < 1 s, Nielsen, 1993) e medição na seção 6.4 |
| Conclusão com trabalhos futuros já feitos | Aplicação | Conclusão reescrita, respondendo a cada objetivo |
| Interface | Aplicação | Duas telas reais no documento (Figuras 8 e 9) |

O Quadro 9 do documento lista as 23 regras de negócio, cada uma com o motivo de existir. Ele responde à pergunta "essa regra ajuda o cliente?".

---

## 3. As anotações do professor, e onde cada uma foi resolvida

| Anotação | Onde está resolvida |
|---|---|
| Conferir os objetivos específicos | Objetivo 7 reescrito (1.3); Quadro 12 liga objetivo, entrega e evidência (6.6); conclusão responde a cada um |
| CI/CD: colocar o fluxo | Seção 5.11 e Figura 12: nove etapas de validação, depois a publicação, só na `main` e só com sucesso |
| Estilo de aprovação / marketing | Texto técnico: cada número com como foi medido, máquina, data e limite (6.4, 6.7) |
| Todos devem falar | Roteiro na seção 4 deste arquivo |
| O que é migrations | Definida em 2.5; somente adição e soma de verificação em 4.4; também no glossário |
| Sopa de letras E2E | Quadro 11 com o nome das áreas por extenso; lista de siglas com 30 itens; glossário com 13 termos |
| "Azure" | Ainda não identificado. Se for o rodapé do slide de CI, a Figura 12 resolve |
| Dois GET /dashboard | Tabela 5 separada: "uma única rota em quatro níveis de carga, e não rotas diferentes"; caminhos reais em todas as tabelas |
| Tirar anexos dos anexos | Todos os resultados no capítulo 6. O Apêndice C só traz como reproduzir |
| Workload | Tabelas 2 e 3, com a interpretação da queda de vazão |

---

## 4. Roteiro da defesa (cada bloco aponta para o documento)

> **Formato final: 10 minutos, focado no resultado.** A apresentação
> `docs/apresentacao/Fleet Manager - Defesa.pptx` tem 9 slides: capa · problema e
> entrega (Gregory, 1 min 30 s) · três demonstrações em vídeo (Luiz, 4 min 30 s) ·
> resultados em números e objetivos cumpridos (André, 2 min 30 s) · limitações e
> perguntas (Gregory, 1 min 30 s). Os slides técnicos ficam na seção "Apoio para
> perguntas". Roteiro de gravação: `docs/apresentacao/Roteiro dos videos.md`.
> A tabela abaixo é o mapa completo, útil para as perguntas.

| Bloco | Seções | Conteúdo | Quem fala (sugestão) |
|---|---|---|---|
| Problema e objetivos | 1 | Problema, objetivo geral, os sete objetivos específicos | Gregory |
| Decisões de base | 2 a 4 | Camadas, SQL sem ORM (e o custo), autenticação delegada × autorização própria, migrations, estratégia de verificação (Quadro 4) | Gregory |
| Arquitetura e dados | 5.1 a 5.4 | Camadas, monorepo, modelo ER, `companyId` como fronteira, situações calculadas | Luiz |
| Segurança e acesso | 5.5, 5.7, 5.9 | Token ES256, RBAC, recorte do operador, último administrador, anexos por URL assinada | Luiz |
| Sistema funcionando | 5.6 | Demonstração: painel e central de alertas (manutenção atrasada sem ninguém marcar; CNH) | Quem estiver mais seguro |
| CI/CD e observabilidade | 5.11, 5.12 | Figura 12, etapa por etapa; health, tempo-limite, log | André |
| Resultados | 6.1 a 6.6 | Regras e motivos (Quadro 9), testes (Quadro 11), workload (Tabelas 2 e 3), resiliência, objetivos (Quadro 12) | André |
| Limitações e conclusão | 6.7, 7 | O que não foi feito e por quê; o que a revisão corrigiu (publicação e Zod); validação real | Gregory |

Para os slides: toda sigla com legenda, todo número com data e máquina, caminho real das rotas, resultados no corpo.

---

## 5. Perguntas prováveis

| Pergunta | Resposta curta | Onde |
|---|---|---|
| O que é uma migration? | Arquivo SQL numerado, aplicado em ordem e uma vez; o executor guarda uma soma de verificação e recusa arquivo alterado depois | 2.5, 4.4 |
| Quando uma manutenção vira atrasada? | Quando está programada e a data prevista ficou para trás; é calculado na consulta, ninguém marca | 5.4, RN11 |
| O que a rotina diária faz? | Registra quando cada documento entrou na janela de 30 dias; a central mostra a data; renovar limpa | 5.8, RN13 |
| Por que a vazão cai de 1.452 para 790 req/s? | Fila no pool de 10 conexões com o banco, mais as 16 mil despesas gravadas durante o teste; em base limpa, 890 | 6.4 |
| Por que POST é a rota mais lenta? | Grava despesa e histórico na mesma transação | 6.4 |
| Um teste vermelho impede a publicação? | Sim: o job `publicar` depende do `validar`, e a Vercel não publica sozinha a `main` | 5.11, Figura 12 |
| Onde está o script de carga? | `apps/api/carga/workload.ts`; resultado em `docs/testes/workload-misto.json` | Apêndice C |
| Por que a mesma CNH não aparece duas vezes? | A ficha só entra se nenhum documento CNH do motorista já está sendo avisado | 5.6, RN12 |
| Por que não bloquear o vínculo existente quando a CNH vence? | Desfazer vínculos sozinho tiraria do gestor uma decisão que é dele; a central avisa | RN14 |
| Por que sem ORM? | A condição de empresa fica visível em cada consulta; custo: verbosidade | 2.5, 6.7 |
| Foi validado com usuário real? | Ouvimos proprietários de empresas e usamos bases delas em parte dos testes, sob confidencialidade; sem avaliação formal, o que está declarado como limitação | 4.1, 6.7 |
| E a vulnerabilidade do Zod? | Corrigida com a migração para a versão 4; auditoria zerada | 6.7 |
| Como as migrations chegam à produção? | O job `publicar` as aplica antes de publicar o código; são somente de adição | 5.11 |
