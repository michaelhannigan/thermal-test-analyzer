# How to contribute

Practical guidance for working in this codebase: the workflow, how changes are verified, how to debug, the conventions to follow, and the tooling that enforces them.

## Pages

- [Development workflow](development-workflow.md) — install, run, and the change loop
- [Testing](testing.md) — how changes are verified (quality gates, smoke testing)
- [Debugging](debugging.md) — common failure modes and how to diagnose them
- [Patterns and conventions](patterns-and-conventions.md) — the idioms to match
- [Tooling](tooling.md) — ESLint, jscpd, tsx, Vite, and TypeScript configs

## The short version

```bash
npm run install:all     # once
npm run dev             # API :4000 + web :5173
# make changes, then:
npm run typecheck && npm run lint && npm run dupcheck
```

Match existing patterns (strict TypeScript, ESM with explicit import extensions, typed API client, inline styles via CSS variables), keep the three quality gates green, and remember the server holds all state in memory. See [Patterns and conventions](patterns-and-conventions.md) for the details.
