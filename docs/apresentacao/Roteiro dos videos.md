# Roteiro de gravação dos vídeos da defesa

Quatro vídeos curtos, um por funcionalidade, para entrar nos slides 3, 4 e 5 de
`Fleet Manager - Defesa.pptx`. A apresentação tem 10 minutos, e os vídeos ocupam
cerca de metade: cada um deve ter **no máximo 1 minuto**. Gravados antes, rodam sem depender da internet da
sala nem do sistema no ar. A aplicação ao vivo fica aberta só como plano B.

---

## Antes de gravar (uma vez)

1. **Dados.** Rode o volume de demonstração no banco que você vai filmar:
   ```bash
   cd apps/api && npm run db:popular
   ```
   Sem isso, o painel aparece quase vazio e com "-100% vs. período anterior".
2. **Ferramenta.** Use o [Screen Studio](https://screen.studio) (Mac). Configure:
   - zoom automático nos cliques **ligado**;
   - cursor um pouco maior e com movimento suavizado;
   - fundo ao redor da janela discreto (preto ou cinza-escuro, para combinar com os slides);
   - exportação em **MP4, 1080p, 30 fps**.

   Alternativa gratuita: [Cap](https://cap.so), também com zoom automático.
3. **Navegador.** Chrome numa janela só:
   - janela de cerca de **1440 × 900**, zoom do navegador em 100%;
   - barra de favoritos escondida (Cmd+Shift+B) e nenhuma outra aba;
   - **idioma em português** (o botão EN no topo deve aparecer como "EN").
4. **Conta.** Entre no sistema com a conta de demonstração de **administrador** da
   empresa *Transportes Litoral Norte*. As contas estão no README, em
   "Perfis de demonstração". Não grave a tela de login com a senha à vista: comece
   cada vídeo já logado.
5. **Ritmo.** Mova o mouse devagar, faça **uma pausa de 1 a 2 segundos depois de
   cada clique** (o zoom precisa de tempo) e não role a página com pressa. Se errar,
   continue: o Screen Studio deixa cortar trechos depois.

---

## Vídeo 1 — Painel (slide 3) · cerca de 45 s

Mostra: custo por período, comparação com o período anterior e filtro por veículo.

1. Comece no **Dashboard**, com "Últimos 180 dias" selecionado. Pare 2 s nos
   cartões de cima (total, registros, média, veículos ativos).
2. Clique em **Últimos 30 dias**. Pare sobre o selo "vs. período anterior" do total.
3. Clique na lista **Veículo** e escolha um caminhão (por exemplo, um *Accelo* ou
   *Cargo*). Mostre que os números mudaram.
4. Role devagar até o gráfico **Despesas por mês** e os **Top veículos por despesa**.
5. Volte ao topo e clique em **Limpar**.

## Vídeo 2 — Alertas (slide 4) · cerca de 45 s

Mostra: o sino com os mais urgentes, a central completa e a manutenção atrasada
que ninguém marcou.

1. Comece no Dashboard. Clique no **sino** do canto superior direito. Pare 2 s no
   painel: contagem por frente e os três alertas mais urgentes.
2. Passe o mouse pelo primeiro alerta e clique em **Ver todos os N alertas**.
3. Na **Central de Alertas**, role até a seção **Manutenções atrasadas ou previstas
   para os próximos 7 dias**. Pare num cartão vermelho, "Atrasada há N dia(s)".
4. Num cartão de documento, mostre a linha **"Sinalizado pela rotina diária em…"**.
5. Clique em **Ver manutenções**. Na lista, abra o filtro de situação e escolha
   **Atrasada**.

## Vídeo 3 — Despesas (slide 5, à esquerda) · cerca de 60 s

Mostra: o lançamento, a data futura recusada, o cancelamento com motivo e o
histórico de quem fez o quê.

1. Vá em **Despesas** e clique em **Nova Despesa**.
2. Escolha um veículo, a categoria **Combustível**, valor **350,00** e, na data,
   **digite a data de amanhã**. Clique em salvar: aparece "A data da despesa não pode
   ser posterior a hoje". Pare 2 s na mensagem.
3. Troque a data para hoje e salve. A despesa aparece no topo da lista.
4. No menu **⋯** da linha, escolha **Cancelar lançamento**. Escreva o motivo
   "Lançamento em duplicidade" e confirme.
5. Mostre a linha **riscada**, com o motivo. Se estiver escondida, marque
   **Mostrar cancelados**.
6. No menu **⋯** da mesma linha, clique em **Histórico**. Pare 2 s na janela:
   "Criado por…" e "Cancelado por…", com data, hora e o motivo.

## Vídeo 4 — Regras de acesso (slide 5, à direita) · cerca de 60 s

Mostra: a CNH vencida bloqueando o vínculo e o motorista vendo só o que é dele.

1. Na **Central de Alertas**, encontre um documento **CNH vencida** e anote o nome do
   motorista. É a CNH vencida do volume de demonstração.
2. Vá em **Veículos**, abra um veículo e entre em **Motoristas vinculados**.
3. Procure o motorista da CNH vencida e clique em vincular. Aparece "A CNH deste
   motorista está vencida…". Pare 2 s na mensagem.
4. Clique em **Sair** (canto inferior esquerdo) e **corte o vídeo aqui**. Grave a
   segunda parte já logado como a **motorista** de demonstração (Cláudia).
5. Logado como motorista, mostre que o menu não tem **Usuários** nem **Empresas**,
   que em **Veículos** aparecem só os veículos dela e que em **Despesas** aparecem
   só os lançamentos dela.

---

## Colocar os vídeos nos slides

1. Abra `Fleet Manager - Defesa.pptx`.
2. No slide do vídeo, **Inserir → Vídeo → Vídeo deste computador** (no Keynote,
   arraste o arquivo para o slide).
3. Redimensione o vídeo para cobrir a moldura com a captura de tela e apague a
   captura (ou mande-a para trás).
4. Em **Reprodução**, escolha **Iniciar: Automaticamente**. Marque "Ocultar
   enquanto não estiver em reprodução" só se quiser a captura aparecendo antes.
5. Teste o slide em modo de apresentação, no computador que vai ser usado na defesa.

## Imagem do CI/CD (slides de apoio, opcional)

O slide de CI/CD fica na seção "Apoio para perguntas" e já usa a figura do fluxo. Se quiser uma imagem real, faça uma captura da
página **Actions** do GitHub com uma execução verde mostrando os jobs `validar` e
`publicar` e cole ao lado da figura.

---

## Plano B no dia

- O sistema aberto e logado numa segunda aba, já no Dashboard.
- O PDF do Documento Técnico aberto.
- A tabela de perguntas prováveis de `docs/academico/Ensaio da defesa - alinhamento.md`.
