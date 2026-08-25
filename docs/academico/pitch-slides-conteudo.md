# Fleet Manager — Conteúdo dos Slides de Pitch

Apresentação comercial para banca do TCC — UNIFOR, Ciência da Computação, 2026
Tempo estimado: ~8 minutos de slides

---

## Slide 1 — Abertura (gancho)

**Título:** Você sabe exatamente quanto a sua frota custou este mês?

**Fala:**
A maioria das empresas que operam frotas — transportadoras, prestadoras de serviço, empresas com equipes externas — não tem essa resposta de forma imediata. Elas vivem no Excel, em papéis ou em sistemas caros que exigem treinamento. E isso custa dinheiro.

---

## Slide 2 — O Problema

**Título:** Gestão de frota ainda é manual, fragmentada e cara

**Bullets:**
- Documentos vencendo sem ninguém perceber → multas e autuações
- Despesas registradas em planilhas → sem visibilidade financeira real
- Histórico de manutenções disperso → falhas evitáveis acontecem

**Fala:**
Pequenas e médias empresas perdem tempo e dinheiro por falta de controle. Multas por CNH vencida do motorista, CRLV atrasado, combustível sem registro. O problema não é falta de informação — é falta de centralização.

---

## Slide 3 — A Solução

**Título:** Fleet Manager — Controle total da sua frota, em um lugar só

**Subtítulo:** Plataforma web para gestão operacional, financeira e documental de frotas

**Fala:**
O Fleet Manager centraliza tudo: veículos, motoristas, despesas, manutenções e documentos. Qualquer pessoa da equipe acessa de qualquer lugar, com o nível de permissão certo. Sem instalação, sem planilha, sem surpresa.

---

## Slide 4 — O Produto em Números

**Título:** O que o sistema entrega hoje

**4 cards visuais:**
- **Dashboard financeiro** → indicadores em tempo real com filtros por período e veículo
- **Alertas automáticos** → notificação antes do vencimento de CNH, CRLV e seguros
- **Histórico completo** → despesas, manutenções e documentos por veículo e motorista
- **Interface pensada** → design limpo, escuro, responsivo — sem curva de aprendizado

**Fala:**
Além de funcional, o Fleet Manager foi construído com atenção ao design e à experiência do usuário. A interface é clara, a navegação é intuitiva e qualquer pessoa consegue usar sem treinamento. Isso importa — um sistema que ninguém usa não resolve nada.

---

## Slide 5 — Para Quem é Isso

**Título:** Quem se beneficia

**Tabela de contraste (dois lados):**

| Sem Fleet Manager | Com Fleet Manager |
|---|---|
| Descobre o CRLV vencido na blitz | Recebe alerta 30 dias antes |
| Não sabe quanto gastou com combustível | Dashboard financeiro por tipo e período |
| Motorista com CNH vencida ativo na frota | Controle de vencimento com histórico |
| Manutenção esquecida → quebra inesperada | Agenda de manutenções preventivas |

**Fala:**
Qualquer empresa com mais de 3 veículos já sente esse problema. Transportadoras, construtoras, clínicas com frotas de entrega, empresas de logística de última milha. O produto é horizontal — o problema é universal.

---

## Slide 6 — Visão de Futuro

**Título:** Onde queremos chegar

**Timeline com 3 etapas:**

**Agora — MVP funcional:**
Gestão completa de frota com alertas, dashboard e upload de documentos, rodando em produção

**Próxima fase — Inteligência de dados:**
- Relatórios mensais automáticos por e-mail (gastos, manutenções, documentos)
- Análise de tendência de custos por veículo
- Indicadores preditivos: qual veículo vai custar mais nos próximos 30 dias

**Futuro — Plataforma SaaS:**
- Modelo de assinatura recorrente por frota
- Painel multi-empresa para gestoras e frotas corporativas
- API aberta para integração com ERPs e sistemas de RH

**Fala:**
A evolução do produto não é sobre adicionar telas — é sobre tornar o gestor mais inteligente. Relatórios que chegam sem precisar pedir, alertas que antecipam problemas antes de virarem custo, tendências que transformam dado bruto em decisão. Tudo dentro da plataforma web, sem fricção, no modelo SaaS. Você paga pelo que usa, e o sistema cresce junto com a sua frota.

---

## Slide 7 — Fechamento

**Título:** Frota sob controle. Decisões com dados.

**Subtítulo:** Fleet Manager — da ideia ao produto em um semestre

**Rodapé:** Desenvolvido como Projeto Final Integrador — Ciência da Computação, UNIFOR 2026

**Fala:**
O Fleet Manager nasceu como um projeto acadêmico, mas foi construído com arquitetura, critério e visão de produto real. O problema que ele resolve existe em milhares de empresas brasileiras. O produto está pronto. A pergunta agora é: qual o próximo passo?

---

---

## Design System — Fleet Manager

> Use estas referências para garantir que os slides sejam visualmente coesos com a plataforma.

---

### Identidade Visual

**Nome do produto:** Fleet Manager
**Logo:** ícone de bússola/estrela de quatro pontas em dourado (`#C4A35A`), acompanhado do wordmark "Fleet Manager" em branco, fonte Outfit bold
**Personalidade visual:** premium, sóbrio, confiável — preto profundo com acentos dourados. Não é escuro por modismo; é escuro porque remete a instrumentação, cockpit, painel de controle.

---

### Paleta de Cores

#### Cores principais

| Token | Hex | Uso |
|---|---|---|
| `fleet-black` | `#0C0C0C` | Fundo principal da aplicação / fundo dos slides |
| `fleet-darker` | `#141414` | Sidebar, painéis secundários |
| `fleet-card` | `#1C1C1C` | Cards, modais, superfícies elevadas |
| `fleet-input` | `#242424` | Campos de input, elementos interativos |
| `gold` | `#C4A35A` | Cor de destaque principal — CTAs, ativo, ícone do logo |
| `gold-hover` | `#D4BD82` | Estado hover do dourado |

#### Hierarquia de texto (branco com opacidade)

| Uso | Valor |
|---|---|
| Títulos e texto principal | `#FFFFFF` (100%) |
| Corpo de texto e labels | `rgba(255,255,255,0.70)` |
| Texto secundário / subtítulos | `rgba(255,255,255,0.55)` |
| Texto desabilitado / placeholder | `rgba(255,255,255,0.35–0.28)` |

#### Cores de status (semânticas)

| Status | Cor |
|---|---|
| Alerta / erro | `#EF4444` (red-500) — com fundo `red-500/10` |
| Sucesso | `#4ADE80` (green-400) |
| Vencendo em breve | âmbar / `#F59E0B` |
| Vencido | vermelho / `#EF4444` |

#### Bordas e separadores
- Cor padrão: `rgba(255,255,255,0.07)` — extremamente sutil, quase invisível
- Não usar bordas brancas sólidas; tudo é translúcido sobre fundo escuro

---

### Tipografia

**Família:** [Outfit](https://fonts.google.com/specimen/Outfit) — Google Fonts
**Classificação:** sans-serif geométrica moderna
**Pesos disponíveis:** 300 · 400 · 500 · 600 · 700 · 800

#### Escala tipográfica sugerida para slides

| Elemento | Peso | Tamanho sugerido |
|---|---|---|
| Título principal do slide | 700 (Bold) | 40–48px |
| Subtítulo | 400–500 | 20–24px |
| Corpo de texto / bullets | 400 | 16–18px |
| Labels / rodapés | 300–400 | 12–14px |
| Destaque em bullets | 600 (SemiBold) | mesmo tamanho do corpo |

> Nunca usar fonte serifada. Outfit é a única família do produto.

---

### Padrões de Componentes

#### Card
- Fundo: `#1C1C1C`
- Borda: `1px solid rgba(255,255,255,0.07)`
- Border-radius: `12px` (rounded-xl)
- Padding interno: `20–24px`

#### Botão primário (CTA)
- Fundo: `#C4A35A` (gold)
- Texto: `#0C0C0C` (preto — contraste alto)
- Peso: 600 (SemiBold)
- Border-radius: `8px`
- Hover: `#D4BD82`

#### Badge / tag de status
- Fundo: cor semântica com 10–20% de opacidade
- Texto: cor semântica em 100%
- Border-radius: pill (`9999px`)
- Exemplo ativo: fundo `gold/10`, texto `gold`, borda `gold/20`

#### Item de navegação ativo
- Fundo: `gold/10`
- Texto: `#C4A35A`
- Borda esquerda: `2px solid #C4A35A`

---

### Linguagem Visual

- **Modo:** exclusivamente escuro — não existe versão clara
- **Contraste:** alto entre superfícies (fundo puro vs. card) mas bordas intencionalmente suaves
- **Dourado:** reservado para destaque e ação — não decorativo. Quando aparece, chama atenção
- **Espaçamento:** generoso e arejado — sem elementos comprimidos
- **Ícones:** linha fina (estilo Lucide Icons — stroke, não fill)

---

### Aplicação nos Slides

**Fundo de cada slide:** `#0C0C0C` ou gradiente sutil de `#0C0C0C` → `#141414`

**Slide de título / capa:**
- Logo centralizado em dourado
- Nome do produto em Outfit 700, branco
- Subtítulo em Outfit 400, `rgba(255,255,255,0.55)`

**Slides de conteúdo:**
- Título em Outfit 700, branco, alinhado à esquerda
- Cards com fundo `#1C1C1C`, borda `rgba(255,255,255,0.07)`, border-radius `12px`
- Destaques e números-chave em `#C4A35A`
- Ícones em estilo linha fina, na cor dourada ou branca

**Slide de contraste (antes/depois):**
- Coluna esquerda (sem Fleet Manager): texto em `rgba(255,255,255,0.40)`, ícone `✕` em vermelho
- Coluna direita (com Fleet Manager): texto em branco, ícone `✓` em dourado

**Slide de timeline (futuro):**
- Linha horizontal ou vertical em `rgba(255,255,255,0.15)`
- Nó ativo em `#C4A35A` (círculo preenchido)
- Nós futuros em `rgba(196,163,90,0.30)` (dourado translúcido)

---

## Ritmo sugerido

| Slide | Tempo |
|---|---|
| 1 — Gancho | 30s |
| 2 — Problema | 1min |
| 3 — Solução | 45s |
| 4 — Produto em números | 1min 30s |
| 5 — Para quem | 1min 30s |
| 6 — Visão de futuro | 1min 30s |
| 7 — Fechamento | 45s |
| **Total** | **~8 minutos** |
