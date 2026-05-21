# Agents.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, `bun typecheck` and `bun run test` must pass before a task can be considered completed.
- Do NOT use `bun test`. Use `bun run test` instead. (uses vitest)

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.
