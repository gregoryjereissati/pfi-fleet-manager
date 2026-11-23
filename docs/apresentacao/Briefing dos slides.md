# Briefing dos slides da defesa

Para quem for montar os slides. O conteúdo já está fechado e confere com o
Documento Técnico. O visual fica livre.

## Regras

- **10 minutos**, focados no que entregamos. Construção, arquitetura e testes em
  detalhe só se a banca perguntar.
- **9 slides** na apresentação. Os slides técnicos de apoio podem ficar depois do
  "Obrigado", para abrir nas perguntas (estão no `.pptx` atual, a partir do slide 10).
- **Não mude nenhum número.** Todos estão no Documento Técnico e no Relatório de
  Testes. Se a banca comparar e achar diferença, a gente perde ponto.
- Texto curto em cada slide. A explicação vai na fala.
- Os slides 3, 4 e 5 precisam de espaço grande para a imagem. Hoje entram as
  capturas de tela. Depois, os vídeos (roteiro em `Roteiro dos videos.md`).
- Sugestão de visual: fundo escuro com destaque verde-esmeralda (`#10B981`), igual
  à aplicação. Assim a passagem do slide para o vídeo não destoa.

## Arquivos

| O quê | Onde |
|---|---|
| Slides atuais (referência de conteúdo) | `docs/apresentacao/Fleet Manager - Defesa.pdf` |
| Slides atuais com as notas de fala | `docs/apresentacao/Fleet Manager - Defesa.pptx` |
| Captura do painel | `docs/academico/telas/tela-painel.png` |
| Captura da central de alertas | `docs/academico/telas/tela-central-alertas.png` |
| Captura do histórico de uma despesa | `docs/apresentacao/tela-historico.png` |
| Captura da CNH vencida no vínculo | `docs/apresentacao/tela-cnh-vencida.png` |

## Slide a slide

### 1. Capa · Gregory · 30 s

- Fleet Manager, sistema web de gestão de frotas
- André Luiz Cavalcante da Silva, Luiz Eduardo Pacheco, Gregory Figueiredo de M. P. Jereissati
- Orientador: Prof. Me. Ronaldo Gonçalves Junior
- Ciência da Computação, Universidade de Fortaleza, 2026
- Endereço: pfi-fleet-manager-api.vercel.app
- Imagem: captura do painel

### 2. O problema e o que entregamos · Gregory · 1 min

Duas colunas.

**Antes**
- Despesas, manutenções e documentos em planilhas e pessoas diferentes
- Ninguém sabe quanto cada veículo custa
- A planilha não avisa: o documento vence e vira multa

**Fleet Manager**
- Uma base única, em que todo lançamento pertence a um veículo
- Custo por veículo e por período, num painel
- Prazos de documentos, manutenções e CNH calculados e avisados numa central
- No ar, para várias empresas, cada uma enxergando só o que é seu

### 3. Demonstração: o painel de indicadores · Luiz · 1 min 30 s

Imagem grande: `tela-painel.png` (depois, o vídeo 1).

- Custo total, médio e por veículo
- Variação contra o período anterior, de mesma duração
- Filtro por período, veículo e categoria
- Somas feitas no banco: só os totais trafegam

### 4. Demonstração: alertas sem sair da tela · Luiz · 1 min 30 s

Imagem grande: `tela-central-alertas.png` (depois, o vídeo 2).

- O sino mostra os três alertas mais urgentes
- Documentos e CNH: até 30 dias; manutenções: até 7
- A manutenção atrasada aparece sem ninguém marcar
- A rotina diária registra quando sinalizou cada documento

### 5. Demonstração: as regras na prática · Luiz · 1 min 30 s

Duas imagens lado a lado (depois, os vídeos 3 e 4).

- `tela-historico.png`: lançar, recusar data futura, cancelar com motivo e ver quem fez o quê
- `tela-cnh-vencida.png`: CNH vencida recusada no vínculo; o motorista vê só o que é dele

### 6. Resultados em números · André · 1 min 30 s

Seis números grandes, cada um com uma linha de explicação.

| Número | Rótulo | Explicação |
|---|---|---|
| 402 | testes automatizados | Em três níveis, com 88,4% das linhas do servidor executadas |
| 0 erros | em 124.753 requisições | Workload misto com até 100 conexões; p99 sempre abaixo de 350 ms |
| 3 s | para avisar que o banco caiu | Responde 503 em vez de travar e volta sozinho, sem reiniciar |
| 50 mil | despesas numa empresa | A lista abre em 17 ms e a tela em menos de 1 s |
| 2 min | de testes a cada mudança | Teste vermelho não vai ao ar: a publicação espera o CI |
| 0 | vulnerabilidades conhecidas | Auditoria das dependências limpa |

### 7. Os sete objetivos, cumpridos e comprovados · André · 1 min

| Objetivo | Evidência |
|---|---|
| 1. Cadastro e vínculos | Testes de veículos e cadastro; seções 5.4 a 5.6 |
| 2. Despesas em seis categorias | Testes de despesas e de precisão monetária |
| 3. Manutenções e atraso | Atraso calculado, testado contra o banco |
| 4. Documentos e alertas | Central com três frentes; Figura 9 |
| 5. Painel de indicadores | Figura 8; tempos com 50 mil despesas |
| 6. Autenticação e acesso | 48 testes de autenticação, permissão e isolamento |
| 7. Qualidade, desempenho e resiliência | 402 testes, CI, workload e queda do banco |

### 8. Limitações, declaradas, e próximos passos · Gregory · 1 min

**O que não foi feito**
- Não foi aplicado numa frota real: os benefícios são expectativas fundamentadas
- Testes de tela feitos, mas fora da integração contínua
- Carga local com gerador, API e banco na mesma máquina
- Validade da CNH em dois lugares, na ficha e no documento

**Próximos passos**
- Validação com gestores de frota reais, com medição antes e depois
- Testes de tela na integração contínua
- Unificar a validade da CNH
- Notificação por e-mail, hoje fora do escopo

### 9. Obrigado · todos

- Perguntas?
- pfi-fleet-manager-api.vercel.app
- github.com/gregoryjereissati/pfi-fleet-manager

Nas perguntas: arquitetura e segurança com o Luiz; testes, CI e desempenho com o
André; escopo, regras e limitações com o Gregory.

## O que falar

As notas de cada slide estão no `.pptx` atual (no PowerPoint, Keynote ou
LibreOffice, em "Notas"). Se os slides forem refeitos em outro arquivo, copie as
notas junto, porque elas trazem a fala e a fonte de cada número no documento.
