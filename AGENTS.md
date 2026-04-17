# Fleet Manager — Agent Instructions

> This file governs ALL agents (Codex, Claude Code, Cursor, Copilot, etc.) working in this repository.
> It is the counterpart to CLAUDE.md and must stay in sync with it.
> **Read CLAUDE.md in full before touching any code.** This file adds workflow rules on top of it.

---

## Source of Truth

All project context lives in **CLAUDE.md**: architecture decisions, data model, RBAC matrix, sprint backlog, history.

- Never re-derive architecture from scratch — read the spec first.
- Never implement something already marked `[x]` in CLAUDE.md.
- Always update CLAUDE.md checkboxes immediately when a subtask completes.

---

## Mandatory Workflow (every task, no exceptions)

### 1. Brainstorm before writing code

Before implementing any feature, change, or fix:

1. State what you are about to build in one sentence.
2. List 2–3 alternative approaches and their tradeoffs.
3. Pick one and explain why.
4. Only then write code.

> Skip this only for trivial one-liners (typo fix, rename). If in doubt, brainstorm.

### 2. Test-Driven Development

For any new service, repository, or controller:

1. Write the test file first (in `src/services/__tests__/` or equivalent).
2. Run tests — they must fail.
3. Write the implementation.
4. Run tests — they must pass.
5. Refactor if needed, keep tests green.

Frontend hooks and utilities follow the same rule when testable.

### 3. Verify before declaring done

After every implementation step:

```bash
# Backend
cd apps/api && npx tsc --noEmit
npm run test:api

# Frontend
cd apps/web && npx tsc --noEmit
npm run build
```

All checks must pass. Never declare a task complete if any check fails.

### 4. Update CLAUDE.md

After each subtask:
- Mark the checkbox `[ ]` → `[x]` immediately.
- Add a row to the "Histórico de Implementação" table.
- Update "Última atualização" date.

---

## Architectural Rules (enforced, not optional)

These mirror CLAUDE.md decisions. Violations must be reverted.

| Rule | Detail |
|---|---|
| Layered architecture | controllers → services → repositories. No DB calls in controllers. No HTTP in services. |
| No raw SQL | Always use Prisma. |
| Auth | Every protected route must use `authenticate` middleware. RBAC via `authorize(role)`. |
| Validation | Zod schemas in route files via `validate(schema)` middleware. |
| Error handling | Throw `AppError(status, message)` from services. Let the error handler catch it. |
| Types | Import enums and DTOs from `packages/shared` before defining local types. |
| No comments | Only add a comment when the WHY is non-obvious. Never explain WHAT the code does. |
| No over-engineering | Implement exactly what the sprint task requires. No extra abstractions. |

---

## Commit Standards

```
feat(api): add expenses CRUD endpoints
feat(web): add expense listing page
fix(api): handle missing auth header
test(api): add vehicle service tests
chore: update dependencies
```

- Scope must be one of: `api`, `web`, `shared`, or omitted for root changes.
- One logical change per commit.
- Never commit with failing tests or TypeScript errors.

---

## Sprint Backlog Reference

The current sprint and all pending work are tracked in **CLAUDE.md → Backlog por Sprint**.

Always check which sprint is active and which issues are open before starting work.
Current GitHub repo: https://github.com/gregoryjereissati/pfi-fleet-manager

---

## What NOT to do

- Do not add features outside the current sprint scope.
- Do not change architecture decisions without aligning with the team.
- Do not skip brainstorm because a task "feels simple."
- Do not mock the database in tests — use Vitest's mock of the Prisma client, not an in-memory DB substitution.
- Do not add comments explaining what code does — only why when truly non-obvious.
- Do not leave TypeScript errors suppressed with `// @ts-ignore` or `as any` without a documented reason.
