# Fleet Manager — Instruções para agentes

> Vale para todos os agentes (Codex, Cursor, Copilot, Claude Code e outros).
> **Leia [`CLAUDE.md`](CLAUDE.md) primeiro** — arquitetura, autenticação, modelo de dados e regras do projeto.
> **[`README.md`](README.md)** tem instalação, execução e validação.
> Este arquivo só acrescenta as regras de trabalho.

---

## Ponto de partida

Esta etapa parte da **aplicação existente e em funcionamento**. O código em `apps/` é a referência do comportamento vigente.

- Nenhuma proposta anterior de mudança de regras está aprovada.
- Regras de negócio, arquitetura e visual serão revisitados depois, em etapa própria.
- O Documento Técnico em `docs/academico/` é **referência**, não ordem de serviço. Divergência entre ele e o código não autoriza alterar a aplicação.

---

## Três regras que não se negociam

1. **Não faça commit sem autorização explícita.** Nada de `git commit`, `git push`, deploy ou alteração de banco por iniciativa própria. Deixe as mudanças no diretório de trabalho e relate.
2. **Não altere regras de negócio, stack ou identidade visual nesta etapa.** Se a tarefa parecer pedir isso, confirme antes.
3. **Acentuação correta em português**, sempre: i18n, interface, erros, comentários, documentação. Veículos, Manutenções, Usuários, não, ação, período, descrição.

---

## Antes de escrever código

1. Diga em uma frase o que vai construir.
2. Cite 2–3 alternativas e por que escolheu a sua.
3. Confirme no código que o comportamento que você assume como existente realmente existe.

Pule esta etapa apenas em correções triviais.

## Ao escrever código

**TDD** para todo service, repository ou controller novo: escreva o teste em `src/services/__tests__/` (ou equivalente), veja falhar, implemente, veja passar.

| Regra | Detalhe |
|---|---|
| Camadas | controllers → services → repositories. Sem banco no controller, sem HTTP no service |
| SQL | Só nos repositórios, sempre parametrizado. Identificador dinâmico (ordenação, coluna) só a partir de lista fechada — nunca do corpo da requisição |
| Autenticação | Supabase Auth. Rotas protegidas usam `authenticate`; o papel, `authorize(role)`. O cadastro de perfil usa `requireSupabaseSession`. **Não existe rota de login na API** |
| Validação | Zod no arquivo de rotas, via middleware `validate(schema)` |
| Erros | Lance `AppError(status, message)` do service; o error handler cuida do resto |
| Tipos | Importe enums e DTOs de `packages/shared` antes de criar tipos locais |
| Comentários | Só quando o **porquê** não for óbvio. Nunca explique o **que** o código faz |
| Escopo | Implemente o que foi pedido. Sem abstração extra |

## Antes de declarar pronto

```bash
npm run test:api                    # 220 testes devem passar
cd apps/api && npx tsc --noEmit     # sem erros
cd apps/web && npx tsc --noEmit     # sem erros
cd apps/web && npm run build        # deve gerar o pacote
```

Tudo deve passar limpo, `npm run lint` inclusive. Não há mais erro nem aviso pré-existente: se aparecer algum, é regressão.

Depois: atualize a documentação afetada e **pare sem commitar**.

## Não faça

- Mockar o banco substituindo-o por outro. Nos testes de regra, substitua os **repositórios** (`vi.mock`) e use os duplos de `src/test-helpers/db-mock.ts`.
- Alterar uma migration já aplicada. Escreva uma nova.
- Montar SQL por concatenação de texto vindo da requisição.
- Suprimir erro de TypeScript com `@ts-ignore` ou `as any` sem justificar.
- Criar relatórios, diagnósticos ou catálogos de regras sem que tenham sido pedidos.
