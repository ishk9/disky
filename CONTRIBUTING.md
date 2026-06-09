# Contributing to disky

Thanks for helping make disky better. This guide covers local setup, the quality gate,
and the architecture conventions to follow.

## Setup

```bash
git clone <repo>
cd disky
npm install
npm run build
node dist/index.js scan   # smoke test
```

Requires Node 22+ and macOS (disky is a macOS-native tool).

## Quality gate

Before opening a PR, run the full check — CI runs the same:

```bash
npm run check   # typecheck + lint + format:check + tests
```

Individual steps:

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run lint:fix` | ESLint autofix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier verify |
| `npm test` | Vitest (run once) |
| `npm run test:coverage` | Vitest + V8 coverage thresholds |

Enable the pre-commit hook (runs lint + format on staged files, plus gitleaks if
installed) once per clone:

```bash
git config core.hooksPath .githooks
```

## Architecture conventions

disky follows SOLID so new capabilities plug in without touching orchestration code:

- **Scanners** implement `IScanProvider` and are composed by the scan orchestrator. A new
  category (cache, log, large-file, …) is a new provider — model it on the existing
  detectors in `src/strategies/artifact/`.
- **Cleaners** implement `ICleaner`; removal logic lives in one place and is dispatched by
  entry category. Never inline `rm -rf` in a command or hook.
- **System calls** (du, find, docker, system metrics) live behind interfaces in
  `src/platform/` with macOS implementations in `src/platform/macos/`. Domain code depends
  on the interface, which keeps it unit-testable with mocks.
- **Renderers** implement `IRenderer<T>` and return strings; commands handle output.
- **Output** goes through the shared output context (TTY/JSON/dry-run aware) — don't
  hard-code colors or `JSON.stringify` ad hoc.
- **Safety** — every destructive path must honor protected-path checks, `--dry-run`, the
  operation log, and confirmation. See [SECURITY.md](SECURITY.md).

## Tests

Every new provider, cleaner, or service ships with a vitest spec in `tests/`. Mock the
`src/platform/` interfaces rather than touching the real filesystem.

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Keep changes
scoped; update `CHANGELOG.md` under `[Unreleased]`.
