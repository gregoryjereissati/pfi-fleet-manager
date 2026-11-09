# Guia de normalização do TCC — especificação para aplicação pelo Claude

> **Finalidade:** reorganizar e formatar um TCC existente com base nos dois materiais da Biblioteca Central da Universidade de Fortaleza fornecidos pelo usuário. Este arquivo é uma especificação de trabalho para uma IA ou uma pessoa; não é o texto do TCC.
>
> **Perfil adotado:** TCC monográfico, sistema de citações autor-data e orientações dos slides enviados. Preservar o conteúdo científico existente. Não acrescentar pesquisas, resultados, fontes ou dados pessoais fictícios.
>
> **Limite importante:** os PDFs têm “2024” no nome, mas utilizam normas de anos diferentes e exibem data interna de 26/06/2023 no encerramento. Este compilado não equivale à íntegra das normas nem a uma certificação de conformidade com todas as edições atuais.

## 1. Comando de execução para o Claude

Ao receber este arquivo junto ao projeto do TCC, execute as instruções a seguir:

1. Leia este guia inteiro antes de alterar o documento.
2. Identifique o arquivo principal do TCC, os arquivos de capítulos, a bibliografia, as imagens, as tabelas, o modelo institucional e o mecanismo de geração do documento final.
3. Trabalhe sobre uma cópia ou com controle de versão. Preserve o original e os arquivos de dados.
4. Aplique o **perfil dos slides** descrito neste guia. Caso o usuário forneça um manual institucional específico ou determine outra edição normativa, registre as diferenças e siga essa orientação explícita. Não misture silenciosamente perfis diferentes.
5. Use os metadados reais encontrados no trabalho. Não presuma que a instituição do usuário é a Unifor só porque os slides foram produzidos por ela.
6. Corrija estrutura, estilos, numeração, paginação, sumário, legendas, citações e referências, preservando o significado e a autoria do texto.
7. Não invente autores, títulos de obras, anos, páginas, DOI, URLs, datas de acesso, assinaturas, titulações, dados de pesquisa ou resultados. Não transforme exemplos deste guia em conteúdo do TCC.
8. Mantenha literalmente as citações diretas. Se houver necessidade de supressão ou intervenção, sinalize-a corretamente e confira a fonte. Sem acesso à fonte, registre a necessidade de verificação.
9. Não elimine trechos, tabelas, figuras ou referências apenas porque sua adequação está incompleta. Corrija o que puder com evidência e registre o restante como pendência.
10. Não crie dedicatória, agradecimentos, epígrafe ou outros elementos pessoais em nome do autor. Elementos opcionais só entram se já existirem ou forem solicitados.
11. Aplique a formatação no mecanismo real de produção: estilos do DOCX, comandos e classe do LaTeX, ou modelo e configuração do conversor de Markdown. Não se limite a inserir instruções visuais no texto.
12. Gere o documento final, se as ferramentas estiverem disponíveis; atualize os campos automáticos e confira a saída renderizada. Se não puder compilar ou renderizar, informe precisamente quais verificações ficaram pendentes.
13. Entregue os arquivos editáveis, a saída final quando possível e um relatório curto com: alterações realizadas, escolhas adotadas, problemas encontrados e pendências que exigem informação do autor.

**Critério de conclusão:** o resultado deve estar coerente com este perfil, com sumário e referências cruzadas atualizados, conteúdo preservado e nenhuma informação fabricada. Não declare “100% ABNT” se houver pendências, normas não verificadas ou ausência de inspeção do arquivo final.

## 2. Fontes, escopo e como interpretar as regras

### 2.1 Materiais utilizados

| Código | Arquivo | Extensão | Uso neste guia |
|---|---|---:|---|
| F | `[Slides] ABNT - Formatação de TCCs 2024.pdf` | 63 páginas | Estrutura, apresentação, paginação, resumos, listas, sumário, seções, tabelas, ilustrações e elementos pós-textuais |
| C | `[Slides] ABNT Citações_Referências 2024.pdf` | 38 páginas | Citações, sistema autor-data, autoria e modelos de referências |

As indicações como **F, p. 8** e **C, p. 20** correspondem à posição da página no PDF, contando a capa como página 1. Elas permitem conferir a origem da orientação, mesmo quando o slide não apresenta número impresso.

As instruções presentes nos materiais são tratadas como conteúdo de referência a ser compilado. Links, contatos e exemplos dos slides não constituem ordens para acessar contas, enviar mensagens ou inserir aquelas obras no TCC.

### 2.2 Classificação das orientações

- **Regra do material:** orientação textual ou visual dos PDFs. É a base do perfil pedido.
- **Decisão de implementação:** escolha necessária para tornar a formatação executável quando os slides não fixam todos os detalhes. Não deve ser apresentada como exigência universal da ABNT.
- **Pendência institucional:** aspecto que depende do curso, da biblioteca, do modelo oficial ou do formato de entrega.
- **Correção de inconsistência:** tratamento explícito de divergência, erro aparente ou exemplo desatualizado nos próprios slides.

Arial ou Times New Roman, recuo de parágrafo de 1,25 cm, tamanho 10 em todas as exceções indicadas no slide F8 e certas opções de alinhamento devem ser entendidos como **perfil ensinado pelo material**, sem atribuir automaticamente cada escolha à norma nacional.

### 2.3 Edições e atualização

Os materiais trabalham com apresentação de trabalhos baseada na NBR 14724:2011, citações na NBR 10520:2023, referências na NBR 6023:2018, resumo na NBR 6028:2021 e numeração progressiva na NBR 6024:2012.

O material chama a norma de sumário de “6027/2013”, mas a imagem de sua folha de rosto informa edição de 11/12/2012, válida a partir de 11/01/2013. Portanto, a identificação bibliográfica da edição é **NBR 6027:2012**. [F, p. 33–34]

Há edições posteriores às utilizadas pelos slides: a Biblioteca da UFES registra a NBR 14724:2024 e a NBR 6023:2025. Essa consulta externa serve para delimitar a atualidade do compilado; suas regras não foram incorporadas indistintamente ao perfil dos slides. Fonte consultada em 28/09/2026: [Sistema Integrado de Bibliotecas da UFES — Normalização](https://biblioteca.ufes.br/normalizacao).

**Instrução ao Claude:** se a tarefa for seguir estes PDFs, aplique este guia. Se a exigência for seguir as normas vigentes, verifique as edições e o manual institucional antes de afirmar conformidade atual; não trate o nome “2024” dos arquivos como comprovação de atualização normativa.

## 3. Configuração geral do documento

### 3.1 Matriz de estilos

| Elemento | Fonte/tamanho | Entrelinhas | Alinhamento | Recuo ou tratamento |
|---|---|---|---|---|
| Corpo do texto | Arial ou Times New Roman, 12 pt | 1,5 | Justificado | Primeira linha de 1,25 cm |
| Citação direta curta | Mesma fonte do corpo, 12 pt | 1,5 | Integrada ao parágrafo | Aspas duplas; até 3 linhas |
| Citação direta longa | Mesma família, 10 pt | Simples | Justificado, como decisão de uniformização | Bloco com 4 cm de recuo à esquerda; sem aspas externas e sem recuo adicional de primeira linha |
| Nota de rodapé | Mesma família, 10 pt | Simples | Padronizado no modelo | Nota automática, sem recuo herdado do corpo |
| Referência bibliográfica | Mesma família, 10 pt neste perfil | Simples | Esquerda | Sem recuo de primeira linha; uma linha em branco simples entre entradas |
| Natureza do trabalho | Mesma família, 10 pt neste perfil | Simples | Justificado, como decisão de implementação | Recuo do bloco de 8 cm a partir da margem esquerda |
| Legendas, fontes e notas de tabelas | Mesma família, 10 pt | Simples | Esquerda para fonte e notas | Sem recuo de primeira linha |
| Legendas e fontes de ilustrações | Mesma família, 10 pt | Simples | Centralizado no perfil dos slides | Sem recuo de primeira linha |
| Dedicatória | Mesma família, 12 pt | 1,5 | Justificado | Bloco com recuo de 8 cm |
| Epígrafe | Mesma família, 12 pt | 1,5 | Justificado | Abaixo do meio da folha; recuo recomendado de 8 cm |
| Agradecimentos | Mesma família, 12 pt | 1,5 | Justificado | Primeira linha de 1,25 cm |
| Corpo das listas e do sumário | Mesma família, 12 pt | 1,5 | Conforme o tipo de lista | Páginas alinhadas à direita quando aplicável |

Base: F, p. 8, 14, 17–20, 29–35, 47–54; C, p. 11–12 e 23–24.

**Atenção à fonte das referências:** F, p. 8, agrupa referências entre as exceções com fonte 10 e espaço simples. Por fidelidade ao pedido, essa é a configuração deste perfil. Não a apresente como obrigação universal da NBR 6023; um modelo institucional pode adotar tamanho diferente.

### 3.2 Página e margens

- Margem superior: **3 cm**.
- Margem esquerda: **3 cm**.
- Margem inferior: **2 cm**.
- Margem direita: **2 cm**. [F, p. 7]
- Adotar **papel A4, 21 × 29,7 cm**, em orientação retrato, como configuração operacional complementar. O tamanho do papel não está especificado no texto extraído dos slides de regras gerais.
- Usar texto preto como padrão de produção; preservar cores necessárias à compreensão de ilustrações. Essa é uma decisão de implementação, não uma regra expressa dos slides.
- Não usar espaços, tabulações repetidas ou linhas vazias para simular margens e posicionamento.
- A configuração acima corresponde ao perfil de página apresentado no material. Impressão frente e verso, margens espelhadas e posição de número no verso exigem confirmação do modelo institucional; não improvisar uma adaptação silenciosa.

**Referência de medida:** recuo de 4 cm ou 8 cm é medido a partir da margem esquerda da área de texto, e não da borda física do papel. Com margem esquerda de 3 cm, um bloco recuado 8 cm começa a 11 cm da borda física.

### 3.3 Família tipográfica e parágrafos

- Escolher uma única família: Arial ou Times New Roman. Se o TCC já usa uma delas de modo consistente, preservá-la; caso contrário, adotar Times New Roman como decisão deste guia.
- Não misturar famílias entre capítulos, citações, notas, tabelas e referências sem justificativa.
- O corpo deve usar 12 pt, alinhamento justificado, entrelinhas 1,5 e primeira linha de 1,25 cm. [F, p. 8]
- Como decisão de implementação, usar 0 pt antes e depois dos parágrafos comuns e não inserir linhas vazias entre eles. Títulos, referências e blocos especiais possuem tratamento próprio.
- Não aplicar o recuo de primeira linha do corpo a títulos, referências, legendas, listas ou citações longas.
- Não confundir “entrelinhas 1,5” com “espaço de 1,5 cm”: são grandezas diferentes.
- Manter títulos junto ao primeiro parágrafo correspondente e evitar linhas órfãs e viúvas, como cuidados de composição.

### 3.4 Estrangeirismos

O material orienta usar itálico para termos estrangeiros no texto, exemplificando *online*, *campus*, *link*, *site*, *light*, *e-mail*, *designer* e *download*. Aplicar esse perfil de forma consistente no texto autoral. [F, p. 42]

Não alterar automaticamente o texto literal de citações, URLs, identificadores, comandos de programação ou nomes oficiais de produtos. Esses casos exigem distinção entre palavra estrangeira em prosa e conteúdo que precisa preservar sua grafia.

## 4. Estrutura e ordem dos elementos

O esquema visual de F, p. 11, apresenta a seguinte ordem. A ficha catalográfica é detalhada posteriormente, em F, p. 15–16.

| Ordem | Elemento | Situação no material | Observação |
|---:|---|---|---|
| 1 | Capa | Obrigatório | Parte externa; não entra na contagem |
| 2 | Lombada | Opcional | Parte externa; pertinente à encadernação |
| 3 | Folha de rosto | Obrigatório | Início da contagem |
| 4 | Ficha catalográfica | Prevista no verso da folha de rosto | Verificar exigência e obtenção institucional |
| 5 | Errata | Opcional | Depois da folha de rosto, se necessária |
| 6 | Folha de aprovação | Obrigatório | Depois da folha de rosto e eventual errata |
| 7 | Dedicatória | Opcional | Não criar sem texto do autor |
| 8 | Agradecimentos | Opcional | Não criar sem texto do autor |
| 9 | Epígrafe | Opcional | Exige autoria e tratamento da fonte |
| 10 | Resumo em português | Obrigatório | Inclui palavras-chave |
| 11 | Resumo em língua estrangeira | Obrigatório | O material adota inglês: Abstract e Keywords |
| 12 | Lista de ilustrações | Opcional | Conforme existência e necessidade |
| 13 | Lista de tabelas | Opcional | Conforme existência e necessidade |
| 14 | Lista de abreviaturas e siglas | Opcional | Listas separadas quando adequado |
| 15 | Lista de símbolos | Opcional | Com respectivos significados |
| 16 | Sumário | Obrigatório | Último elemento pré-textual |
| 17 | Introdução | Parte textual | Primeira página com número visível |
| 18 | Desenvolvimento | Parte textual | Dividido em seções conforme o conteúdo |
| 19 | Conclusão | Parte textual | Encerramento do trabalho |
| 20 | Referências | Obrigatório | Primeiro elemento pós-textual |
| 21 | Glossário | Opcional | Ordem alfabética |
| 22 | Apêndice(s) | Opcional | Material produzido pelo autor |
| 23 | Anexo(s) | Opcional | Material de terceiros |
| 24 | Índice(s) | Opcional | Não se confunde com o sumário |

Embora os slides explicativos mostrem apêndice e anexo antes de glossário, a **ordem do documento** deve seguir o esquema estrutural de F, p. 11: referências, glossário, apêndices, anexos e índice.

**Não converter automaticamente um TCC em formato de artigo para uma monografia.** Se o projeto recebido for um artigo, identificar a exigência do curso. A NBR 6022 e regras editoriais específicas são mencionadas pelo material, mas não são detalhadas suficientemente para uma conversão completa.

## 5. Elementos pré-textuais e parte externa

### 5.1 Capa

Incluir os dados reais: instituição, título, subtítulo quando houver, autor, cidade da instituição e ano de entrega. Separar título e subtítulo por dois-pontos. [F, p. 13]

O modelo visual da Unifor coloca o bloco institucional no alto, o título na região central, o nome do autor abaixo do título e cidade/ano na parte inferior. Esse arranjo é uma característica do exemplo fornecido, não uma justificativa para substituir um modelo oficial diferente do curso.

- Capa sem número de página e fora da contagem.
- Não escrever literalmente “CAPA”.
- Não copiar logotipo, nome da Unifor, centro ou curso do exemplo para um trabalho de outra instituição.
- Não deduzir cidade a partir do local de residência do autor: usar a cidade da instituição de apresentação.
- Não inserir ano de defesa ou aprovação no lugar do ano de entrega sem verificar.
- Centralização dos blocos de título, autor e cidade/ano é uma decisão apoiada no exemplo visual; seguir o modelo institucional se fornecido.

### 5.2 Lombada

Elemento opcional da parte externa. O material a inclui no esquema, mas não oferece instruções suficientes sobre orientação, medidas ou encadernação. Se exigida, usar o modelo da instituição ou da biblioteca. Não inserir uma “página de lombada” no PDF por padrão.

### 5.3 Folha de rosto

Incluir, nesta sequência: autor; título; subtítulo; natureza e objetivo do trabalho; instituição; orientador; coorientador quando houver; cidade; ano de entrega. [F, p. 14]

- A contagem do trabalho começa aqui, sem exibir o número nesta página.
- O bloco de natureza fica com recuo de 8 cm a partir da margem esquerda.
- No perfil de F, p. 8, o bloco de natureza utiliza 10 pt e espaço simples.
- Não aplicar o recuo de 8 cm ao título ou a toda a página.
- Manter informações de orientação associadas ao bloco correspondente, conforme o modelo visual.
- Não inventar titulação do orientador ou grau pretendido.

Modelo de conteúdo, a preencher somente com dados confirmados:

```text
[NOME COMPLETO DO AUTOR]

[TÍTULO]: [SUBTÍTULO, SE HOUVER]

Trabalho de Conclusão de Curso apresentado ao curso de [CURSO]
da [INSTITUIÇÃO], como requisito para [OBJETIVO/GRAU].
[ÁREA DE CONCENTRAÇÃO, SE APLICÁVEL]

Orientador(a): [TITULAÇÃO E NOME CONFIRMADOS].
Coorientador(a): [SOMENTE SE HOUVER].

[CIDADE]
[ANO DE ENTREGA]
```

O bloco acima é um modelo sem diagramação: os espaços vazios não devem ser usados para posicionar elementos no documento final.

### 5.4 Ficha catalográfica

O material situa a ficha no verso da folha de rosto e orienta fornecer autor, título, número de páginas, assuntos, local e data. Devem constar nomes completos e dados corretos de orientação. Sobrenomes compostos e designações como Filho, Neto e Sobrinho não devem ser separados indevidamente do sobrenome de entrada. [F, p. 15–16]

- Usar a ficha gerada ou validada pelo serviço institucional.
- Não fabricar classificação, número de chamada, identificação de bibliotecário ou outros dados catalográficos.
- Confirmar número de páginas depois da diagramação final.
- Preencher coorientação apenas quando existir coorientador; não confundir membro da banca com coorientador.
- Para a Unifor, os slides indicam o endereço `https://www.unifor.br/ficha-catalografica`; é um recurso mencionado pela fonte, sem garantia de disponibilidade atual.
- A posição física é o verso da folha de rosto. A inclusão e a contagem dessa página na versão digital devem ser verificadas no modelo institucional, pois os slides não explicam o caso suficientemente.

### 5.5 Errata

Elemento opcional, indicado no esquema de F, p. 11, mas sem detalhamento de formatação nos slides. Preservar se já existir e houver necessidade de registrar correções. Não criar errata para problemas que podem ser corrigidos diretamente antes da entrega. Se exigida após a produção final, confirmar o padrão institucional.

### 5.6 Folha de aprovação

Incluir: autor; título e subtítulo; natureza, objetivo, instituição e área de concentração, quando aplicável; data de aprovação; nomes, titulações, assinaturas e instituições dos integrantes da banca. [F, p. 17]

- Aplicar recuo de 8 cm ao bloco de natureza.
- Usar o estilo de natureza definido na matriz.
- Preservar campos para assinaturas quando o documento ainda não estiver assinado.
- Não gerar assinaturas, nomes de avaliadores ou data de aprovação fictícios.
- Não alterar ou redesenhar uma folha já assinada sem necessidade e autorização específica.
- Não exibir número de página.

### 5.7 Dedicatória

Opcional. Texto pessoal de homenagem, sem título “DEDICATÓRIA”, sem aspas externas, fonte 12, alinhamento justificado, entrelinhas 1,5 e recuo de 8 cm. [F, p. 18]

Preservar o texto do autor. Não acrescentar homenagens por iniciativa da IA.

### 5.8 Agradecimentos

Opcional. O título **AGRADECIMENTOS** deve ser centralizado, em maiúsculas, negrito e sem número de seção. Texto em 12 pt, justificado, entrelinhas 1,5 e primeira linha de 1,25 cm. [F, p. 19]

### 5.9 Epígrafe

Opcional. É uma citação relacionada ao trabalho, com indicação de autoria. No perfil dos slides: sem título “EPÍGRAFE”, abaixo do meio da folha, recuo recomendado de 8 cm, fonte 12, justificado, entrelinhas 1,5 e entre aspas. [F, p. 20]

Não atribuir frases a pessoas sem verificar a origem. Se a epígrafe existente não tiver fonte identificável, registrar a pendência. Não aplicar automaticamente a ela o estilo de citação longa do desenvolvimento: o material fornece uma apresentação específica para esse elemento.

## 6. Resumo, Abstract e palavras-chave

Base: F, p. 21–27.

### 6.1 Resumo em português

- Apresentar de forma concisa os pontos relevantes do trabalho.
- Preferir, para o TCC, **resumo informativo**: objetivo/finalidade, metodologia, resultados e conclusões. Essa escolha operacional se apoia na distinção ensinada no material.
- O resumo indicativo apenas aponta os principais assuntos, sem detalhar dados e resultados; não confundir os dois tipos.
- Extensão para trabalho acadêmico: **150 a 500 palavras**.
- Se o trabalho for efetivamente um artigo de periódico, o material informa **100 a 250 palavras**. Não aplicar esse limite a uma monografia por engano.
- Preferir verbos na terceira pessoa.
- Evitar abreviações, símbolos e contrações pouco usuais.
- Evitar fórmulas, equações e diagramas, salvo quando indispensáveis; nesse caso, defini-los na primeira ocorrência.
- Não inserir resultados que não existam no trabalho. Se o TCC ainda estiver em desenvolvimento, apontar que o resumo final depende da conclusão da pesquisa.

Como padronização operacional, usar título **RESUMO** centralizado, em maiúsculas, negrito, 12 pt e sem numeração; texto em um único parágrafo, 12 pt, justificado e entrelinhas 1,5. O exemplo de F, p. 26, apresenta o resumo em bloco único; recuo e detalhes não expressamente definidos devem acompanhar o modelo institucional. Na ausência dele, usar primeira linha sem recuo neste bloco.

### 6.2 Palavras-chave

- Usar **3 a 5 termos**, conforme o material.
- Inserir abaixo do resumo, precedidos de `Palavras-chave:`.
- Separar os termos por **ponto e vírgula** e encerrar a sequência com ponto.
- Usar iniciais minúsculas, exceto nomes próprios, nomes científicos que exijam maiúscula e siglas.
- Selecionar termos que representem o tema real do trabalho.

Exemplo meramente estrutural:

```text
Palavras-chave: [termo 1]; [termo 2]; [termo 3].
```

### 6.3 Resumo em inglês

- O material orienta apresentar uma versão em inglês do resumo em português.
- Usar os rótulos **ABSTRACT** e **Keywords**.
- Manter equivalência de objetivo, método, resultados e conclusões.
- Traduzir as palavras-chave preservando o sentido técnico.
- Conferir terminologia e fidelidade; não aceitar automaticamente traduções de ferramentas.
- Adotar a mesma apresentação do resumo em português.
- Não acrescentar no Abstract informação ausente do Resumo.

## 7. Listas pré-textuais

Base: F, p. 28–32. As listas são opcionais no material; sua inclusão pode ser exigida pelo curso.

### 7.1 Lista de ilustrações

- Ordenar conforme a aparição no texto.
- Cada entrada contém tipo, número, travessão, título e página.
- Abrange desenhos, esquemas, fluxogramas, fotografias, gráficos, mapas e outros tipos de ilustração.
- Título **LISTA DE ILUSTRAÇÕES**: centralizado, maiúsculas, negrito, 12 pt, sem número de seção.
- Corpo da lista: 12 pt e entrelinhas 1,5.
- Fazer a entrada reproduzir o título efetivo da ilustração; não inventar títulos abreviados incompatíveis.
- Gerar a partir das legendas, sempre que o sistema permitir.

Exemplo estrutural: `Figura 1 — [Título da figura] ........ [página real]`.

Separar listas por tipo, como lista de quadros ou gráficos, é uma opção de organização a confirmar com o modelo do curso; os slides não impõem um número mínimo de figuras para isso.

### 7.2 Lista de tabelas

- Ordenar pela aparição no texto.
- Cada entrada contém `Tabela`, número, travessão, título e página.
- Título **LISTA DE TABELAS**: centralizado, maiúsculas, negrito, 12 pt e sem indicativo numérico.
- Corpo: 12 pt, entrelinhas 1,5; identificação à esquerda, título justificado e página à direita.
- Usar tabulação com preenchimento ou geração automática, sem digitar sequências de pontos e espaços para alinhar.

### 7.3 Lista de abreviaturas e siglas

- Título **LISTA DE ABREVIATURAS E SIGLAS**, ou títulos separados: centralizados, maiúsculas, negrito, 12 pt e sem número de seção.
- Corpo em 12 pt, entrelinhas 1,5 e alinhamento justificado.
- O material recomenda listas próprias quando houver **a partir de cinco itens por tipo**. Isso não significa cinco itens somando siglas e abreviaturas.
- Relacionar cada abreviatura/sigla à forma por extenso correta.
- Como decisão de organização complementar, usar ordem alfabética. Os slides não explicitam essa ordenação.
- Como cuidado editorial complementar, explicar a sigla na primeira ocorrência no texto, mesmo que exista lista.

### 7.4 Lista de símbolos

- Ordem de ocorrência no texto, acompanhando cada símbolo de seu significado.
- Título **LISTA DE SÍMBOLOS**: centralizado, maiúsculas, negrito, 12 pt e sem número de seção.
- Corpo em 12 pt, entrelinhas 1,5, justificado.
- Preservar caracteres, índices, expoentes e unidades.

## 8. Sumário

Base: F, p. 33–36.

- Deve ser o **último elemento pré-textual**.
- Título **SUMÁRIO** centralizado, em maiúsculas e negrito, sem número de seção.
- Corpo em 12 pt, entrelinhas 1,5.
- Não incluir capa, folha de rosto, aprovação, dedicatória, agradecimentos, epígrafe, resumos, listas ou o próprio sumário.
- Incluir as seções textuais e os elementos pós-textuais presentes, como referências, glossário, apêndices e anexos.
- Não atribuir número de seção a REFERÊNCIAS, GLOSSÁRIO, APÊNDICES, ANEXOS ou ÍNDICE.
- Manter indicativos numéricos das seções alinhados à esquerda.
- Reproduzir exatamente títulos, grafia, hierarquia e destaque tipográfico usados no corpo.
- Usar páginas reais e atualizadas, alinhadas à direita.
- Em arquivo eletrônico, preferir entradas com hiperlinks.
- Gerar automaticamente a partir dos estilos/comandos de títulos.
- Atualizar depois de qualquer alteração que mude a paginação.

**Não copiar os números de página do exemplo do slide.** Eles pertencem a outro documento.

## 9. Paginação

Base: F, p. 9, 13–14.

1. Excluir a capa da contagem.
2. Iniciar a contagem na folha de rosto.
3. Contar os elementos pré-textuais conforme o perfil institucional, mas não imprimir seus números.
4. Mostrar a numeração a partir da primeira página textual, normalmente a introdução.
5. O número visível deve refletir a contagem acumulada, sem reiniciar automaticamente em 1 na introdução.
6. No perfil de página simples dos slides, posicionar no canto superior direito, a 2 cm da borda superior e com o último algarismo a 2 cm da borda direita.
7. Continuar a sequência nos elementos pós-textuais, sem reiniciar em referências, apêndices ou anexos, como decisão de continuidade do documento.
8. Não usar numeração romana nos pré-textuais: esse procedimento não é apresentado no material.

**Exemplo hipotético:** se houver seis páginas contáveis antes da introdução, ela exibirá 7. A quantidade real depende do documento; não fixar 7 no código.

O tamanho tipográfico do número de página não é explicitamente definido pelo slide de numeração. Como decisão de implementação, adotar 10 pt, da mesma família do corpo, sujeito ao modelo institucional.

**Pendências específicas:** os slides não resolvem de forma suficiente a contagem da ficha catalográfica no arquivo digital, folhas em branco e impressão em frente e verso. Registrar a política utilizada e confirmar quando esses casos existirem.

**Implementação:** utilizar campos de página e quebras de seção/comandos próprios. Conferir a posição visual do algarismo na saída final: definir apenas “distância do cabeçalho” no editor pode não produzir exatamente a posição exigida.

## 10. Títulos, seções e organização textual

Base: F, p. 37–41.

### 10.1 Numeração progressiva

- Usar algarismos arábicos.
- Limitar a hierarquia apresentada nos slides a cinco níveis, da seção primária à quinária.
- Separar número e título por espaço.
- Não colocar ponto final, hífen, travessão ou parênteses **entre o indicativo e o título**.
- Os pontos internos da numeração hierárquica permanecem: `2.1.3` está correto.
- Abrir cada seção primária em nova página.
- Não abrir subseções em nova página automaticamente.
- Não saltar níveis sem justificativa estrutural e não criar títulos vazios para preencher um modelo.

Exemplos:

```text
1 INTRODUÇÃO
2 REFERENCIAL TEÓRICO
2.1 Conceitos fundamentais
2.1.1 Definições operacionais
```

Evitar: `1. INTRODUÇÃO`, `1 – INTRODUÇÃO`, `1) INTRODUÇÃO`.

### 10.2 Hierarquia tipográfica adotada

O material apresenta o seguinte padrão; aplicá-lo também ao sumário:

| Nível | Numeração ilustrativa | Aparência |
|---|---|---|
| Primário | 1 | MAIÚSCULAS e negrito |
| Secundário | 1.1 | Maiúsculas e minúsculas, negrito |
| Terciário | 1.1.1 | Maiúsculas e minúsculas, negrito e itálico |
| Quaternário | 1.1.1.1 | Maiúsculas e minúsculas, itálico |
| Quinário | 1.1.1.1.1 | Maiúsculas e minúsculas, sem destaque adicional |

Adotar 12 pt e alinhamento à esquerda para títulos numerados, sem recuo de primeira linha. Como decisão de implementação para os intervalos não quantificados nos slides, usar espaçamento equivalente a uma linha de entrelinhas 1,5 entre título e texto, e entre texto anterior e subtítulo; evitar somar parágrafos vazios a esse espaçamento. No alto da página, não acrescentar espaço acima do título além da configuração do modelo.

### 10.3 Títulos sem indicativo numérico

Usar títulos centralizados, em maiúsculas, negrito e 12 pt para agradecimentos, resumos, listas, sumário, referências, glossário e índice, conforme os exemplos e orientações do material. Não prefixar esses elementos com números de capítulo.

Apêndices e anexos recebem letra identificadora, travessão e título; isso não os transforma em seções numeradas do desenvolvimento.

Dedicatória e epígrafe dispensam título. Capa, folha de rosto e aprovação não devem receber cabeçalhos artificiais com esses nomes.

### 10.4 Introdução, desenvolvimento e conclusão

O material prevê essas três partes, sem impor uma quantidade fixa de capítulos ou páginas. Não inventar um limite de páginas como se fosse regra ABNT.

Como orientação editorial complementar:

- A introdução apresenta tema, problema, objetivos, justificativa e organização quando esses conteúdos já estiverem no trabalho.
- O desenvolvimento pode conter referencial teórico, metodologia, resultados e discussão, com títulos adequados à pesquisa.
- A conclusão deve responder aos objetivos com base no que foi efetivamente demonstrado.
- Preservar a organização científica válida do autor; não é obrigatório usar “DESENVOLVIMENTO” como título literal de um capítulo.
- Não escrever resultados inexistentes para preencher uma seção nem transformar a tarefa de normalização em uma nova pesquisa.

## 11. Citações no sistema autor-data

Base: C, p. 8–21. Adotar um sistema consistente em todo o trabalho. O material menciona a possibilidade de sistema numérico nas referências, mas desenvolve principalmente autor-data; este guia escolhe **autor-data**.

### 11.1 Regras fundamentais

- Citação direta reproduz literalmente a fonte.
- Citação indireta apresenta a ideia com redação própria e também exige indicação de fonte.
- Citação de citação identifica uma ideia conhecida por meio de outro documento, usando *apud*.
- Toda chamada deve permitir identificar a referência correspondente.
- No perfil da NBR 10520:2023 mostrado nos slides, usar sobrenome com maiúscula inicial também dentro dos parênteses: `(Silva, 2020)`.
- Não confundir isso com a entrada na lista de referências, onde o sobrenome de autor pessoal aparece em maiúsculas: `SILVA, ...`.
- Para transcrição direta, indicar página ou outro localizador existente na fonte. Não criar paginação para conteúdo não paginado.
- Para paráfrase, usar autor e ano; localização pode ser preservada quando útil e verificável, sem inventá-la.
- Não usar o número da página do visualizador de PDF no lugar da numeração da obra sem conferir qual localização está sendo citada.

Todos os exemplos com “Silva”, “Souza” e similares abaixo são **esquemáticos**, não fontes a serem acrescentadas ao trabalho.

### 11.2 Citação direta curta: até três linhas

- Integrada ao parágrafo.
- Fonte 12 e entrelinhas 1,5.
- Entre aspas duplas.
- Indicação de autor, ano e página/localizador.
- Conferir a quantidade de linhas na diagramação final, não no editor de código.

```text
Segundo Silva (2020, p. 25), “trecho literal conferido na fonte”.

“Trecho literal conferido na fonte” (Silva, 2020, p. 25).
```

Manter a pontuação do período de forma consistente; nos modelos simples acima, o ponto final do período fica depois da chamada.

### 11.3 Citação direta longa: mais de três linhas

- Bloco separado do texto.
- Fonte 10 neste perfil, menor que a do corpo.
- Entrelinhas simples.
- Sem aspas externas.
- Recuo recomendado de 4 cm à esquerda, adotado por este guia como padrão do bloco.
- Sem recuo adicional na primeira linha.
- Manter autor, ano e página/localizador.
- Manter distância visual do texto anterior e posterior por estilo de parágrafo.

**Inconsistência da fonte:** C, p. 12, escreve literalmente “espaço de 1,5 cm” entre texto e citação. Isso não equivale a entrelinhas 1,5 e não deve ser transformado automaticamente em exigência normativa. Neste guia, a decisão operacional é separar o bloco por intervalo equivalente a uma linha com entrelinhas 1,5, sem impor 1,5 cm. Se o modelo institucional exigir outra medida, aplicá-la e registrar.

Não transformar uma citação longa em texto autoral só para simplificar a formatação. Não encurtar a citação sem indicar supressão.

### 11.4 Citação indireta

- Reescrever a ideia com linguagem própria, preservando seu significado.
- Não usar aspas quando não houver transcrição literal.
- Manter autor e ano.
- Não considerar uma troca superficial de palavras suficiente para dispensar citação.
- Na tarefa de normalização, preservar a redação autoral existente sempre que ela estiver adequada; não refazer todo o conteúdo sem necessidade.

```text
Silva (2020) relaciona [síntese fiel da ideia] a [contexto efetivo].

[Paráfrase fiel da ideia consultada] (Silva, 2020).
```

### 11.5 Um, dois e três autores

| Autoria | Integrada à frase | Entre parênteses |
|---|---|---|
| Um autor | Silva (2020) | (Silva, 2020) |
| Dois autores | Silva e Souza (2020) | (Silva; Souza, 2020) |
| Três autores | Silva, Souza e Lima (2020) | (Silva; Souza; Lima, 2020) |

Na frase, usar vírgula e a conjunção “e”; dentro dos parênteses, separar autores da mesma obra por ponto e vírgula. [C, p. 16–17]

### 11.6 Quatro ou mais autores

O material permite indicar todos os autores ou usar o primeiro seguido de *et al.*, mantendo padronização. [C, p. 18]

```text
Oliveira et al. (2017)
(Oliveira et al., 2017)

ou

Oliveira, Almeida, Vasconcelos e Lima (2017)
(Oliveira; Almeida; Vasconcelos; Lima, 2017)
```

Como escolha deste guia, usar *et al.* nas chamadas com quatro ou mais autores, salvo se o TCC ou modelo já tiver uma política consistente de listar todos. Aplicar itálico à expressão na saída formatada; o bloco de código acima mostra somente a sintaxe textual.

Não aplicar *et al.* indiscriminadamente a obras com dois ou três autores. Não remover autores da base bibliográfica apenas para abreviar a chamada.

### 11.7 Vários documentos na mesma chamada

- Obras de autores diferentes: separar por ponto e vírgula; adotar ordem alfabética como padronização compatível com o exemplo dos slides.
- Várias obras da mesma autoria, de anos diferentes: separar os anos por vírgulas.
- Manter claro o que é um grupo de autores da mesma obra e o que é uma nova obra.

```text
(Fonseca, 2015; Paiva, 2017; Silva, 2019)
(Souza, 2015, 2016, 2017)
```

Base: C, p. 19.

### 11.8 Sobrenomes iguais e obras do mesmo ano

Quando houver coincidência de sobrenomes, acrescentar iniciais dos prenomes; se ainda houver ambiguidade, escrever prenomes por extenso. [C, p. 20]

```text
(Barbosa, C., 2015)
(Barbosa, O., 2015)

(Barbosa, Celso, 2015)
(Barbosa, Cássio, 2015)
```

Obras diferentes da mesma autoria e mesmo ano recebem letras minúsculas, sem espaço após o ano:

```text
(Silva, 2016a)
(Silva, 2016b)
Silva (2016a)
```

Sincronizar os sufixos entre todas as chamadas e as referências. Como regra operacional, definir a sequência a/b/c pela ordenação das entradas correspondentes na bibliografia, sem atribuir letras aleatórias por capítulo.

### 11.9 Autoria institucional e ausência de autor pessoal

O esquema de C, p. 15, admite autor ou entidade. Utilizar a entidade responsável corretamente identificada e manter correspondência com sua entrada na bibliografia. Não transformar o nome do site em autor se houver autor pessoal identificado.

Os exemplos de vídeo e podcast empregam entrada pelo título. Quando não houver autoria identificável, não inventar uma pessoa ou escrever “Anônimo” por conveniência. Conferir o tratamento aplicável à tipologia e à edição de referências adotada. Os slides não detalham todos os casos de título abreviado e de autoria governamental.

### 11.10 Citação de citação: apud

Usar quando o autor do TCC não consultou diretamente a fonte original, mas a encontrou citada em uma obra efetivamente consultada. Identificar autor e ano da fonte original, *apud*, e autor/ano da fonte consultada, com localizador aplicável. [C, p. 14]

```text
(AutorOriginal, 1997 apud AutorConsultado, 1999, p. 6)
```

O localizador deve corresponder ao documento a que se refere; não inventar página do original. Como complemento de integridade bibliográfica, incluir nas referências a obra efetivamente consultada e não apresentar a original como lida. Se o original também tiver sido consultado de fato, reavaliar a necessidade de *apud*.

Preferir localizar a fonte original quando isso fizer parte da tarefa autorizada. Não substituir *apud* por citação direta da obra original sem tê-la verificado.

### 11.11 Supressões, destaques e traduções

- Supressões são sinalizadas por `[...]`, como nos exemplos do material. Não omitir trechos de forma que altere o sentido.
- Ao acrescentar ênfase, indicar `grifo nosso` ou `grifo próprio` na chamada. [C, p. 21]
- O slide informa que a NBR 10520:2023 dispensa a antiga indicação `grifo do autor`; não acrescentá-la automaticamente quando o destaque já pertence ao original.
- Ao traduzir o trecho, indicar `tradução nossa`, conforme o exemplo do material.
- Não declarar tradução própria quando o trecho foi copiado de uma tradução publicada; nesse caso, identificar a edição consultada.

```text
“Trecho com destaque acrescentado” (Silva, 2020, p. 25, grifo nosso).
“Trecho traduzido pelo autor do TCC” (Smith, 2020, p. 25, tradução nossa).
```

Como complemento editorial, intervenções explicativas do autor dentro de uma transcrição devem ser claramente delimitadas, usualmente entre colchetes, e conferidas conforme a norma aplicável. Não corrigir silenciosamente o texto literal da fonte.

### 11.12 Casos que os slides não esgotam

Fontes sem data, documentos não paginados sem localizador, comunicação oral, informação não publicada, autores com partículas complexas, autoria governamental hierárquica e casos especiais de títulos precisam de consulta específica quando ocorrerem. Não inventar uma regra para preencher lacunas.

Ausência de página não significa autorização para inventar `p. 1`. Ausência de ano não significa usar o ano atual ou o ano do acesso.

## 12. Referências bibliográficas

Base: F, p. 54; C, p. 22–36.

### 12.1 Apresentação da lista

- Elemento obrigatório, depois da parte textual.
- Título **REFERÊNCIAS**, centralizado, em maiúsculas, negrito e sem número de seção.
- Incluir no sumário.
- Ordenar alfabeticamente pela entrada, pois este guia adota autor-data.
- Alinhar à margem esquerda, sem justificar.
- Usar espaço simples dentro de cada entrada.
- Separar entradas por uma linha em branco de espaço simples.
- Não usar marcadores ou números na bibliografia deste perfil.
- Não aplicar recuo de primeira linha ou recuo francês por hábito de outro padrão.
- Usar 10 pt neste perfil, conforme a observação sobre F, p. 8.
- Empregar itálico em *et al.*, explicitamente orientado em C, p. 23.
- Como padrão tipográfico baseado nos exemplos visuais, destacar em negrito o título da obra autônoma ou o título do periódico, conforme o tipo; não destacar automaticamente o subtítulo nem o título do artigo.

O material menciona ordenação numérica como alternativa em outro sistema de chamada. Não combinar citações autor-data com uma lista numerada em ordem de ocorrência sem orientação específica do curso.

### 12.2 Controle de dados e correspondência

- Conferir autoria, título, subtítulo, edição, local, editora e ano na própria obra, preferencialmente folha de rosto, ficha catalográfica ou página oficial da publicação. [C, p. 25–29]
- Preservar acentos, ordem de autores e sobrenomes compostos.
- Uniformizar prenomes por extenso ou abreviados sem adivinhar expansões de iniciais; registrar a política adotada.
- Manter todos os autores disponíveis na base bibliográfica; uma abreviação de exibição não deve destruir os metadados.
- Não transferir automaticamente a regra de abreviação das chamadas para todos os tipos de referência. O slide de referências orienta o itálico em *et al.*, mas não detalha todos os critérios de sua adoção em entradas bibliográficas.
- Toda obra citada deve ter referência recuperável, observados casos especiais como *apud*.
- Auditar referências sem chamada: identificar se foram de fato utilizadas e se o curso permite bibliografia consultada. Não excluir nem acrescentar chamadas automaticamente para “fechar” a lista.
- Não copiar para o TCC as referências bibliográficas dos próprios slides, salvo se essas fontes tiverem sido efetivamente usadas no TCC.
- Não confundir data de publicação com data de acesso.
- Registrar a data de acesso real, informada ou documentada. A IA não deve afirmar que o autor acessou uma fonte numa data inventada.
- Não criar DOI. Não completar URLs por adivinhação.

### 12.3 Como usar os modelos seguintes

Os campos entre colchetes são marcadores de preenchimento. Não são referências prontas. Substituí-los apenas por dados confirmados e remover campos que comprovadamente não se aplicam. Se faltar um dado necessário, registrar pendência; não deixar uma referência fictícia com aparência de completa.

O negrito e o itálico abaixo indicam a formatação desejada no documento final. URL longa deve quebrar sem perder caracteres; não inserir hífen manual dentro do endereço.

### 12.4 Livro impresso

**Modelo:**

[SOBRENOME], [Prenome]. **[Título]**: [subtítulo]. [Edição]. [Local]: [Editora], [ano].

- Ordem dos campos conforme C, p. 26.
- A edição deve corresponder ao exemplar efetivamente usado; não presumir “1. ed.” quando o dado não está apresentado.
- O subtítulo vem depois de dois-pontos, sem o destaque do título principal.
- Chamada correspondente: `Sobrenome (ano)` ou `(Sobrenome, ano)`.

### 12.5 Livro digital

[SOBRENOME], [Prenome]. **[Título]**: [subtítulo]. [Edição]. [Local]: [Editora], [ano]. E-book. Disponível em: [URL]. Acesso em: [dia mês ano].

Base: C, p. 27. Identificar a edição digital realmente consultada. Não confundir plataforma de leitura com editora.

### 12.6 Artigo de periódico digital

[SOBRENOME], [Prenome]; [SOBRENOME], [Prenome]. [Título do artigo]: [subtítulo]. **[Título do periódico]**, [local], v. [volume], n. [número], p. [inicial–final], [data/ano]. DOI: [DOI ou URL do DOI confirmado]. Disponível em: [URL]. Acesso em: [dia mês ano].

Base: C, p. 29.

- O destaque é do periódico, não do título do artigo.
- Não confundir volume com número/fascículo.
- Se houver identificador eletrônico de artigo no lugar de páginas, preservar esse dado e verificar o modelo aplicável; não inventar intervalo de páginas.
- Incluir DOI somente quando existente e confirmado.
- O exemplo do slide usa `[s. l.]` para local não identificado. Não aplicar esse marcador indiscriminadamente: conferir primeiro os metadados e a edição normativa adotada.

### 12.7 Legislação

[JURISDIÇÃO OU ENTIDADE RESPONSÁVEL]. **[Tipo da norma, número e data]**. [Ementa]. [Local]: [fonte oficial/órgão], [ano]. Disponível em: [URL oficial]. Acesso em: [dia mês ano].

Base: C, p. 30. Abrange os tipos de legislação citados no material, como leis, decretos, emendas e medidas provisórias; não confundir este modelo com jurisprudência.

- Identificar corretamente a jurisdição.
- Preservar número, data e ementa do ato consultado.
- Preferir a fonte oficial para conferir os dados bibliográficos.
- Em epígrafes ou ementas muito extensas, o material admite supressão por `[...]`, desde que não altere o sentido.
- Não afirmar vigência jurídica apenas por ter formatado uma referência; a tarefa aqui é bibliográfica.

### 12.8 Página de site ou matéria on-line

[SOBRENOME], [Prenome]. [Título da matéria]. **[Nome do site]**, [local], [data de publicação]. Disponível em: [URL]. Acesso em: [dia mês ano].

Base: C, p. 31.

- Usar a autoria realmente indicada.
- Distinguir o título da matéria do nome do site.
- A data de publicação é a da matéria, não a do acesso nem o ano de copyright do rodapé por suposição.
- Se o site não apresentar autoria, local ou data, tratar a lacuna conforme a norma aplicável; não preencher por adivinhação.

### 12.9 TCC, monografia, dissertação e tese

[SOBRENOME], [Prenome]. **[Título]**: [subtítulo]. [Ano]. [Tipo do trabalho] ([grau e curso/área]) — [unidade acadêmica], [instituição], [cidade], [ano].

Base: C, p. 32. O exemplo do material apresenta uma tese e repete o ano nas posições do modelo; não remover uma delas automaticamente por parecer redundância.

Para trabalho consultado em repositório, incluir endereço e acesso quando exigidos pelo tratamento de documento on-line, como complemento operacional ao modelo impresso apresentado. Não inventar programa, faculdade ou grau.

### 12.10 Vídeo no YouTube

[TÍTULO com entrada pelo título]. [Responsabilidade: apresentador, diretor, produtor ou outra função confirmada]. [Local]: [produtor/editora], [ano de publicação]. 1 vídeo ([duração]). Publicado pelo canal [nome]. Disponível em: [URL]. Acesso em: [dia mês ano].

Base: C, p. 33.

- O exemplo usa entrada pelo título, com palavra inicial em maiúsculas; não converter todo título automaticamente para caixa-alta.
- Preservar a função de cada pessoa creditada: apresentador, entrevistado e autor não são intercambiáveis.
- Conferir duração, nome do canal e ano.
- O ano da citação deve coincidir com o ano da obra referenciada, não com o de acesso.
- Ausência de local/produtor deve ser tratada conforme a edição normativa escolhida; o exemplo usa marcadores de ausência, mas eles não autorizam completar sem conferência.

### 12.11 Podcast

[TÍTULO]: [subtítulo]. Locução de: [nome]. [Outras responsabilidades, se pertinentes e confirmadas]. [Local]: [produtor/gravadora], [data de publicação]. Podcast. Disponível em: [URL]. Acesso em: [dia mês ano].

Base: C, p. 34.

- Preservar número e título do episódio quando existirem.
- Distinguir locutor e entrevistado.
- Não usar a data de acesso como data do episódio.
- Confirmar a entrada e a chamada pelo título quando não houver autor pessoal apropriado.

### 12.12 Publicação em rede social

[SOBRENOME], [Prenome ou autoria institucional confirmada]. **[Texto/título da publicação conforme a fonte]**. [Cidade], [data da publicação]. [Rede social]: [perfil/identificador]. Disponível em: [URL específica]. Acesso em: [dia mês ano].

Base: C, p. 35.

- Usar o nome da plataforma correspondente à publicação consultada; o slide mostra exemplo de Twitter e esquema de Instagram, sem exigir que todas as referências sejam de Instagram.
- Manter o identificador correto do perfil e o endereço específico do post.
- Não atribuir automaticamente nome civil a um perfil sem identificação comprovada.
- Não reescrever livremente o texto usado para identificar o post.

### 12.13 Datas e meses

Como padronização complementar em português, usar datas de acesso no formato `dia mês ano`, com dia sem zero desnecessário e abreviaturas consistentes:

| Mês | Forma |
|---|---|
| Janeiro | jan. |
| Fevereiro | fev. |
| Março | mar. |
| Abril | abr. |
| Maio | maio |
| Junho | jun. |
| Julho | jul. |
| Agosto | ago. |
| Setembro | set. |
| Outubro | out. |
| Novembro | nov. |
| Dezembro | dez. |

O exemplo de podcast traz “mai.”; este guia uniformiza para “maio” como ajuste editorial. Nunca usar a data ilustrativa de um slide como data de acesso do TCC.

### 12.14 Tipologias não detalhadas pelos PDFs

Capítulo de livro, trabalho em evento, patente, software, conjunto de dados, norma técnica, jurisprudência e outras tipologias não recebem modelos completos nos slides. Se ocorrerem no TCC, identificar a tipologia e conferir a norma/manual pertinente. Não forçar todas as fontes digitais no modelo genérico de site.

O material indica o gerador MORE, `https://more.ufsc.br/`, como recurso. Um gerador auxilia, mas a referência produzida precisa ser conferida; não presumir que suas configurações seguem exatamente a edição exigida.

## 13. Tabelas, quadros, figuras e outras ilustrações

Base: F, p. 43–52.

### 13.1 Regras comuns

- Identificar e numerar os objetos de maneira consistente.
- Usar título acima do objeto.
- Colocar a fonte abaixo, inclusive quando o objeto for de autoria própria.
- Citar tabelas no texto e posicioná-las perto do trecho correspondente, como orienta F, p. 45. Adotar o mesmo cuidado de integração para as demais ilustrações como decisão editorial.
- Usar referências cruzadas automáticas sempre que possível.
- Não substituir a fonte bibliográfica completa apenas por uma legenda; quando houver obra citada, conferir sua presença nas referências.
- Preservar valores, unidades, escalas e categorias. Não alterar os dados para caber na página.
- Evitar separar título, objeto e fonte entre páginas quando o conjunto puder permanecer unido.
- Não usar “figura abaixo” como única identificação: preferir o número real do objeto.

### 13.2 Tabela

Segundo a distinção didática do material, a tabela é especialmente voltada a dados quantitativos e segue a apresentação tabular do IBGE.

- Identificação superior: `Tabela 1 — Título da tabela`.
- Adotar numeração sequencial própria para tabelas.
- Fonte e notas abaixo, em 10 pt, espaço simples e alinhamento à esquerda.
- Não usar bordas laterais externas para fechar a tabela.
- O exemplo visual de F, p. 48, usa linhas horizontais de delimitação e de cabeçalho, sem uma grade completa de células.
- Não interpretar a expressão confusa “linhas verticais” de F, p. 46, como ordem para desenhar uma grade vertical. Priorizar a orientação expressa “não se utilizam grades laterais” e o exemplo de F, p. 47–48.
- Notas gerais vêm depois da fonte e são precedidas de `Nota:` ou `Notas:`. Exemplo de função: explicar arredondamentos. [F, p. 45]

Formas de fonte, somente quando verdadeiras:

```text
Fonte: [Autor] ([ano], p. [página]).
Fonte: Elaborado pelo autor.
Fonte: Adaptado de [Autor] ([ano]).
```

Quando a tabela for montada pelo autor com dados de terceiros, informar essa relação, por exemplo `Fonte: Elaborado pelo autor com base em [Autor] ([ano]).` Essa redação é um complemento editorial; não declarar autoria integral de dados obtidos de outra fonte.

O tamanho do texto interno das células não está fixado claramente pelos slides. Como decisão inicial, usar 12 pt quando couber; se for necessário reduzir, fazê-lo uniformemente, preservando legibilidade e verificando o modelo institucional. Não aplicar automaticamente o tamanho da nota de fonte a toda tabela.

Para tabelas com várias páginas, consultar o tratamento de continuação do IBGE/modelo institucional. Como orientação complementar derivada da seção 8.3 do manual do IBGE, repetir cabeçalho e identificar as partes por “continua”, “continuação” e “conclusão”, deixando o rodapé da tabela na parte final. Fonte: [IBGE — Normas de apresentação tabular](https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv23907.pdf). Esse detalhe complementa os slides; não deve ser confundido com conteúdo explicitamente descrito por eles.

### 13.3 Quadro

- Usado, na distinção do material, principalmente para informações qualitativas e textuais.
- Pode apresentar linhas horizontais e verticais e ser fechado nas extremidades.
- Identificação: `Quadro 1 — Título do quadro`.
- Fonte abaixo, mesmo quando produzido pelo autor.
- É um tipo de ilustração; manter série de numeração e inclusão em lista coerentes com o modelo escolhido.
- Não converter todo quadro em tabela só porque ambos usam células.

### 13.4 Ilustrações

Incluem desenhos, esquemas, fluxogramas, fotografias, gráficos, mapas, organogramas, plantas, quadros, retratos e outros objetos visuais.

- Numeração sequencial, sem duplicações.
- Identificação superior: tipo, número, travessão e título, como `Figura 1 — Título`.
- Fonte abaixo, inclusive para autoria própria.
- No perfil de F, p. 51, fonte em 10 pt, espaço simples e centralizada; ilustração centralizada na página.
- Adotar legendas em 10 pt conforme a regra geral de F, p. 8.
- Se forem usadas séries distintas como Figura, Gráfico e Quadro, manter a decisão em todo o documento e nas listas.
- Preservar proporção, resolução, rótulos e legibilidade.
- Não copiar o logotipo ABNT mostrado no slide como ilustração do TCC: ele é apenas exemplo didático.

## 14. Equações, fórmulas e notas de rodapé

### 14.1 Equações e fórmulas

O material orienta numeração em algarismos arábicos entre parênteses, alinhada à direita. [F, p. 44]

Como cuidados de implementação:

- Preservar variáveis, índices, expoentes, operadores e unidades.
- Usar editor de equações ou composição matemática nativa quando disponível.
- Posicionar a expressão de forma legível e manter a numeração na margem direita.
- Não inserir números manualmente se houver recurso de numeração automática.
- Preservar a política de numeração existente se coerente; os slides não detalham todos os casos de equações não numeradas ou numeração por seção.
- Conferir chamadas no texto após qualquer reordenação.

### 14.2 Notas de rodapé

F, p. 8, determina fonte 10 e espaço simples no perfil ensinado.

Como decisão de implementação, usar notas automáticas do editor, chamadas vinculadas e estilo uniforme. Não criar rodapés com caixas de texto ou notas digitadas na margem inferior. O material não detalha sistema de numeração, filete separador e todas as distinções entre notas explicativas e de referência; seguir o modelo institucional nesses pontos.

## 15. Elementos pós-textuais

### 15.1 Referências

Aplicar integralmente a seção 12. Não numerar como capítulo; incluir no sumário.

### 15.2 Glossário

Opcional. Reúne palavras ou expressões técnicas de uso restrito acompanhadas de definições. Organizar alfabeticamente. Título **GLOSSÁRIO** centralizado, maiúsculas, negrito, 12 pt e sem numeração; entrelinhas 1,5. [F, p. 57]

Não incluir uma lista genérica de termos que não aparecem no trabalho nem inventar definições especializadas sem base.

### 15.3 Apêndices

O material define a identificação; a distinção de autoria abaixo é um complemento conceitual para evitar troca com anexo.

- Apêndice: material elaborado pelo próprio autor para complementar o trabalho.
- Opcional.
- Título centralizado no formato `APÊNDICE A — Título`.
- Identificar por letras maiúsculas consecutivas.
- Esgotadas as letras simples, usar letras dobradas, conforme os slides.
- Incluir cada apêndice efetivamente presente no sumário.
- Começar cada apêndice em nova página como decisão de organização.
- Manter a paginação do documento.

Exemplos de conteúdo possível: questionário elaborado pelo autor, roteiro de entrevista próprio ou detalhamento de cálculo. Não incluir instrumento de terceiro como apêndice só porque foi aplicado na pesquisa. [F, p. 55]

### 15.4 Anexos

- Anexo: material de terceiros incorporado como complemento/documentação.
- Opcional.
- Título centralizado no formato `ANEXO A — Título`.
- Sequência de letras própria, independente dos apêndices.
- Usar letras dobradas depois de esgotadas as simples.
- Incluir os anexos no sumário.
- Começar cada anexo em nova página como decisão de organização.
- Manter paginação e identificar a origem do documento.
- Preservar documentos assinados ou oficiais; não modificar seu conteúdo para uniformizar o estilo interno.

Base: F, p. 56.

### 15.5 Índice

Opcional. É uma relação de palavras ou expressões com as páginas onde ocorrem. Sua ordenação depende do critério escolhido, e o título deve indicar a função, como **ÍNDICE DE ASSUNTOS** ou **ÍNDICE CRONOLÓGICO**. [F, p. 58]

- Título centralizado, maiúsculas, negrito, 12 pt, sem número de seção.
- Entradas uma abaixo da outra, com localização real, 12 pt, entrelinhas 1,5 e alinhamento justificado.
- Gerar ou atualizar com a paginação final.
- Não substituir o sumário pelo índice; eles têm funções distintas.

## 16. Inconsistências dos slides e tratamento adotado

| Ponto | Evidência | Decisão deste guia |
|---|---|---|
| Nome de arquivo com “2024” não identifica edição normativa | F usa NBR 14724:2011; C usa NBR 6023:2018 e NBR 10520:2023; encerramentos datados de 2023 | Identificar explicitamente o perfil das fontes e separar atualização posterior |
| “NBR 14274” na bibliografia | F, p. 62, enquanto a imagem de F, p. 5, mostra 14724 | Tratar como erro de digitação; usar 14724 ao identificar a norma |
| “6027/2013” | F, p. 33, versus edição de 2012 na imagem de F, p. 34 | Identificar NBR 6027:2012, distinguindo início de validade em 2013 |
| Fonte 10 em referências e natureza | F, p. 8, agrupa essas exceções | Aplicar no perfil dos slides, sem generalizar como exigência universal |
| “Espaço de 1,5 cm” em citação longa | C, p. 12 | Não equiparar cm a entrelinhas; aplicar decisão operacional explicitada na seção 11.3 |
| Tabela descrita com “linhas verticais” | F, p. 46; F, p. 47–48, diz não usar grades laterais e mostra linhas horizontais | Usar apresentação sem fechamento lateral e verificar IBGE em casos especiais |
| Autores mudam entre exemplos de antes/depois | C, p. 17, usa trios diferentes nas duas frases | Tratar como exemplos de sintaxe; nunca trocar autores de uma obra ao mover a chamada |
| Ano do vídeo diverge | C, p. 33, referência com 2022 e chamada com 2023 | Conferir a obra e sincronizar ano; não copiar a divergência |
| Sobrenome todo em maiúsculas em uma chamada antiga | C, p. 36, mostra “SILVA”, enquanto C, p. 15–21, usa maiúscula inicial | Aplicar o padrão autor-data atualizado que predomina no próprio material |
| Variação de grafia do mês de maio | C, p. 34, traz “mai.” | Uniformizar para “maio” como ajuste editorial |
| Apêndice/anexo explicados antes de glossário | F, p. 55–57, versus esquema de F, p. 11 | Seguir a ordem estrutural do esquema, não a sequência didática dos slides |
| Capa institucional específica | F, p. 13, mostra modelo Unifor | Preservar esse arranjo apenas se for o modelo aplicável; não presumir instituição do usuário |

Esses ajustes não autorizam alterar dados bibliográficos sem verificar a fonte real. Quando houver dúvida factual, registrar a pendência.

## 17. Aplicação no VS Code e no formato real do projeto

### 17.1 Inspeção inicial

Antes de editar, identificar:

- Formato do original: `.docx`, `.tex`, `.md`, `.qmd`, `.typ`, HTML ou outro.
- Arquivo principal e dependências.
- Ferramenta de compilação/conversão e modelos existentes.
- Base bibliográfica: arquivo `.bib`, gerenciador, referências manuais ou outro formato.
- Estilos e numeração já implementados.
- Metadados reais do trabalho.
- Exigências específicas do curso, inclusive TCC monográfico versus artigo.
- Condição de entrega: PDF, DOCX editável, impresso, frente e verso, versão final assinada etc.

Não trocar a tecnologia do projeto sem necessidade. Reaproveitar a estrutura existente quando ela puder implementar o perfil.

### 17.2 Se o TCC estiver em Markdown

Markdown comum não fixa tamanho do papel, margens, fontes, posição de número de página, ficha no verso ou sumário paginado. Esses requisitos pertencem ao mecanismo de exportação.

- Manter títulos semânticos e conteúdo em Markdown.
- Configurar papel, estilos, legendas e paginação no modelo de exportação para DOCX/PDF ou na folha de estilos suportada pelo conversor.
- Um bloco `>` não garante citação longa com recuo de 4 cm e fonte 10; conferir o estilo produzido.
- Cabeçalhos `#`, `##` e `###` não garantem a hierarquia visual deste guia sem configuração.
- Links internos não substituem sumário com páginas quando a entrega exige documento paginado.
- Tabelas com barras verticais na sintaxe Markdown não determinam a apresentação visual de tabela ABNT.
- Não entregar apenas um `.md` afirmando que margens e paginação foram aplicadas ao TCC se não houve configuração e geração do formato final.

### 17.3 Se o TCC estiver em LaTeX

- Verificar classe e modelo institucional existentes antes de alterar.
- Configurar os parâmetros reais de página, fontes, entrelinhas e recuos.
- Usar comandos semânticos para títulos, citações, tabelas, figuras e referências cruzadas.
- Não digitar a numeração de capítulos junto ao título se a classe já a produz.
- Verificar o comportamento das rotinas de elementos pré-textuais: não presumir que toda classe conta e oculta páginas exatamente como o perfil pedido.
- Conferir estilo bibliográfico, capitalização das chamadas, uso de *et al.* e sufixos de mesmo autor/ano.
- Um pacote com “ABNT” no nome não comprova que a edição configurada coincide com os slides.
- Compilar as passagens necessárias para atualizar sumário e bibliografia.
- Investigar referências indefinidas, imagens ausentes e objetos ultrapassando margens.

### 17.4 Se o TCC estiver em DOCX

- Definir estilos de corpo, cinco níveis de título, títulos não numerados, citação longa, legenda, fonte de objeto, referência e natureza do trabalho.
- Usar numeração multinível vinculada aos estilos.
- Separar os trechos necessários com quebras de seção para controlar cabeçalhos e números.
- Usar campos de paginação, sumário e referências cruzadas.
- Atualizar todos os campos e verificar novamente após a exportação para PDF.
- Não criar cada capítulo com formatação manual isolada.
- Não usar parágrafos vazios para empurrar cidade e ano ao rodapé da capa.
- Não editar o sumário manualmente para esconder falhas de estilos.

### 17.5 Outros formatos

Aplicar os mesmos critérios no mecanismo equivalente. Distinguir configuração declarada de efeito real: a verificação final ocorre no documento renderizado, não apenas no código.

## 18. Fluxo de execução e tratamento de pendências

### Etapa 1 — Diagnóstico

Inventariar elementos existentes, estilos, referências e metadados. Listar o que falta sem interromper correções independentes.

### Etapa 2 — Estrutura

Ordenar elementos, hierarquizar seções e eliminar duplicações acidentais de títulos. Não excluir conteúdo científico para fazê-lo caber em uma estrutura genérica.

### Etapa 3 — Estilos e página

Aplicar margens, fonte, espaçamentos, recuos e quebras. Configurar pré-textuais e contagem antes de ajustar manualmente páginas.

### Etapa 4 — Citações e bibliografia

Conferir chamadas, autores, anos, localização de transcrições, correspondência com referências e modelos por tipologia. Separar correção de estilo de verificação factual.

### Etapa 5 — Objetos e automação

Padronizar títulos e fontes de tabelas/ilustrações; corrigir numeração; atualizar listas, sumário e referências cruzadas.

### Etapa 6 — Saída final

Compilar/exportar, conferir visualmente, corrigir falhas de diagramação e atualizar campos novamente quando necessário.

### Etapa 7 — Relatório

Informar o que foi aplicado e o que ainda depende do autor, com localização objetiva.

Modelo de registro de pendência, preferencialmente em arquivo separado do TCC:

| ID | Local no trabalho | Problema | Informação necessária | Ação provisória |
|---|---|---|---|---|
| P01 | [seção/página/arquivo] | Citação direta sem página | Página ou localizador da obra consultada | Preservar chamada e registrar conferência pendente |
| P02 | [referência] | Ano divergente da chamada | Ano da edição realmente consultada | Não escolher um ano por suposição |
| P03 | Folha de aprovação | Titulação de avaliador ausente | Dado confirmado | Preservar campo sem inventar |

Marcadores como `[PENDENTE: ...]` podem ser usados numa versão de trabalho quando indispensáveis, mas não podem permanecer despercebidos em uma versão anunciada como pronta para entrega.

## 19. Checklist de aceitação

### 19.1 Estrutura e metadados

- [ ] O formato do TCC foi identificado; não houve conversão indevida de artigo para monografia.
- [ ] Instituição, curso, autor, título, orientador, cidade e ano foram confirmados ou marcados como pendência.
- [ ] A capa não entra na contagem.
- [ ] A folha de rosto inicia a contagem.
- [ ] Elementos obrigatórios do perfil estão presentes ou com ausência registrada.
- [ ] Elementos opcionais não foram inventados.
- [ ] Ficha catalográfica e aprovação não contêm dados ou assinaturas fabricados.
- [ ] A ordem de pré-textuais, textuais e pós-textuais está correta.

### 19.2 Formatação

- [ ] Margens: superior/esquerda 3 cm; inferior/direita 2 cm.
- [ ] Tamanho do papel e orientação configurados no mecanismo final.
- [ ] Uma família tipográfica consistente.
- [ ] Corpo em 12 pt, justificado, entrelinhas 1,5 e primeira linha de 1,25 cm.
- [ ] Exceções em espaço simples e no tamanho definido para cada estilo.
- [ ] Referências alinhadas à esquerda, sem recuo de parágrafo.
- [ ] Natureza do trabalho com bloco recuado 8 cm.
- [ ] Citações longas com bloco de 4 cm e sem aspas externas.
- [ ] Não há alinhamento sustentado por espaços ou linhas vazias repetidas.
- [ ] Títulos, legendas e objetos não ficaram isolados ou cortados.

### 19.3 Títulos, sumário e páginas

- [ ] Seções primárias começam em nova página.
- [ ] Numeração de seções consistente, com no máximo cinco níveis neste perfil.
- [ ] Sem pontuação indevida depois do indicativo numérico.
- [ ] Hierarquia visual reproduzida no sumário.
- [ ] Pré-textuais ausentes do sumário.
- [ ] Pós-textuais incluídos sem numeração de capítulo.
- [ ] Páginas do sumário correspondem à saída final.
- [ ] Primeira página textual mostra o número acumulado correto.
- [ ] Pré-textuais não mostram números.
- [ ] Numeração visível posicionada conforme o perfil.
- [ ] Contagem de ficha, versos e páginas especiais foi resolvida ou explicitamente registrada.

### 19.4 Resumos e listas

- [ ] Resumo com 150–500 palavras para monografia, salvo regra institucional diferente documentada.
- [ ] Objetivo, método, resultados e conclusões refletem o conteúdo real.
- [ ] De 3 a 5 palavras-chave, separadas por ponto e vírgula.
- [ ] Abstract corresponde ao Resumo.
- [ ] Keywords correspondem às palavras-chave.
- [ ] Listas refletem objetos reais, em ordem e com páginas corretas.
- [ ] Siglas e símbolos têm significado correto.

### 19.5 Citações e referências

- [ ] Chamada autor-data uniforme e sobrenomes com maiúscula inicial nas citações.
- [ ] Citações curtas e longas classificadas pela diagramação final.
- [ ] Transcrições literais preservadas.
- [ ] Localizadores existentes e verificáveis nas citações diretas, ou pendência registrada.
- [ ] Paráfrases mantêm atribuição.
- [ ] Autores separados corretamente dentro e fora dos parênteses.
- [ ] Política de quatro ou mais autores consistente.
- [ ] Homônimos e mesmo autor/ano desambiguados.
- [ ] Supressões, grifos próprios e traduções identificados.
- [ ] Uso de apud representa o acesso real às fontes.
- [ ] Chamadas e referências foram cruzadas nos dois sentidos.
- [ ] Obras sem chamada foram investigadas, sem exclusão automática.
- [ ] Referências em ordem alfabética e modelo correto por tipo.
- [ ] Autoria, ano, DOI, URL e datas não foram inventados.
- [ ] Títulos de obras/periódicos destacados de forma consistente.
- [ ] Nenhum exemplo deste guia foi incorporado como fonte real por acidente.

### 19.6 Tabelas, ilustrações e equações

- [ ] Títulos acima e fontes abaixo dos objetos.
- [ ] Fontes presentes também em produção própria.
- [ ] Autoria própria, adaptação e uso de dados de terceiros corretamente distinguidos.
- [ ] Tabelas sem fechamento lateral externo e quadros tratados adequadamente.
- [ ] Notas de tabela depois da fonte.
- [ ] Séries de numeração sem duplicação e chamadas atualizadas.
- [ ] Imagens legíveis, proporcionais e dentro das margens.
- [ ] Valores, escalas, unidades, símbolos e fórmulas preservados.
- [ ] Números de equações entre parênteses e alinhados à direita, quando usados.

### 19.7 Verificação do arquivo final

- [ ] O projeto compila/exporta sem erros impeditivos.
- [ ] Sumário, listas, campos e referências cruzadas foram atualizados.
- [ ] A saída renderizada foi inspecionada, inclusive páginas com objetos e citações longas.
- [ ] Não há texto cortado, páginas vazias acidentais ou objetos além das margens.
- [ ] Hiperlinks e endereços bibliográficos foram preservados.
- [ ] Todos os marcadores de pendência foram resolvidos ou reportados.
- [ ] A entrega distingue verificações realizadas de verificações impossíveis no ambiente.
- [ ] O relatório não afirma conformidade com edições normativas que não foram verificadas.

## 20. Mapa de cobertura dos materiais

| Conteúdo | Páginas de origem | Seções deste guia |
|---|---|---|
| Regras gerais, margens, espaçamento e número de página | F7–9 | 3 e 9 |
| Estrutura geral | F10–12, especialmente o esquema visual F11 | 4 |
| Capa, rosto, ficha e aprovação | F13–17 | 5 |
| Dedicatória, agradecimentos e epígrafe | F18–20 | 5 |
| Resumos e palavras-chave | F21–27 | 6 |
| Listas | F28–32 | 7 |
| Sumário | F33–36 | 8 |
| Numeração progressiva e partes textuais | F37–41 | 10 |
| Estrangeirismos | F42 | 3.4 |
| Equações, tabelas, quadros e ilustrações | F43–52 | 13–14 |
| Referências e demais pós-textuais | F53–58 | 12 e 15 |
| Fontes de informação, avaliação e integridade | C2–6 | 21 e instruções de preservação |
| Tipos de citação e autor-data | C8–21 | 11 |
| Apresentação e modelos de referência | C22–35 | 12 |
| Ferramenta MORE | C36 | 12.14 |
| Acesso a normas e modelos institucionais | F4, F59–60; C7 | 21 |
| Preparação da apresentação oral | F61 | 21, conteúdo complementar |
| Referências dos próprios slides e contatos | F62–63; C37–38 | Identificação das fontes; não transferir automaticamente ao TCC |

Slides de abertura, divisores e imagens de capas de normas servem à contextualização; não geram novos elementos no documento do TCC.

## 21. Orientações complementares presentes nos materiais

### 21.1 Qualidade das fontes e integridade

C, p. 2–6, explica que fontes podem ser impressas ou digitais e recomenda avaliar autoria/autoridade, evidências e confiabilidade, pertinência ao tema, propósito e atualidade para o assunto.

O material distingue cópia integral, cópia parcial de trechos e apropriação de ideias sem atribuição. Para a execução deste guia, isso se traduz em preservar a autoria, atribuir ideias e não disfarçar transcrições como paráfrases. Normalização não substitui verificação científica nem garante originalidade por si só.

### 21.2 Acesso institucional e modelos

Os slides indicam o caminho Unifor Online → Biblioteca → Biblioteca/Acervos → Target GEDWeb para consulta às normas e mencionam modelos de TCC na página de serviços da biblioteca: `https://www.unifor.br/web/guest/biblioteca/servicos`.

Esses caminhos são informações históricas dos materiais, sem teste de disponibilidade nesta compilação. Se o usuário pertencer a outra instituição, procurar o manual e o acesso daquela instituição. Não solicitar credenciais nem presumir autorização para entrar em contas.

### 21.3 Defesa oral

F, p. 61, recomenda elaborar roteiro, preparar slides, estudar e ensaiar, conferir equipamentos, cuidar de fala e postura, respeitar o tempo e preparar-se para perguntas. Essas recomendações pertencem à apresentação oral; não são requisitos para acrescentar páginas ao TCC e não determinam uma diagramação de slides neste guia.

---

**Resultado esperado ao aplicar este arquivo:** um TCC com conteúdo preservado, apresentação coerente com os materiais fornecidos, elementos automáticos funcionando, fontes bibliográficas rastreáveis e pendências explicitadas. Escolhas institucionais e ajustes de implementação devem permanecer identificáveis, sem serem apresentados como regras universais da ABNT.
