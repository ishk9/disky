# disky — Claude Code Instructions

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All color choices, spacing, panel borders, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

Key rules to enforce automatically:
- File sizes → amber (`color="yellow"` in Ink maps to amber in most terminals; prefer explicit hex via chalk if outside Ink)
- Freed space / success → green
- Errors only → red (never for large file sizes)
- Active panel border → cyan, inactive → gray
- Animation fps for disk art → 4fps max

## Stack
- TypeScript ESM (`"type": "module"`, `"module": "nodenext"`)
- Ink v4.4.1 + React 18 for TUI
- Vitest for tests (`npm test`)
- Build: `tsc` → `dist/`

## Commands
- `npm run build` — compile TypeScript
- `npm test` — run all tests (96 tests, must stay green)
- `node dist/index.js tui` — launch the TUI
- `node dist/index.js scan --top 5` — CLI scan

## Architecture Notes
- Scanner runs in a worker thread (`src/tui/workers/scanWorker.ts`) — do not move sync disk I/O back to main thread
- `PanelLayout.tsx` owns all shared state (scanner data, main content, active panel)
- Views (`ScanView`, `CleanView`, `DetailView`, `WatchView`) are presentational — receive data as props
- Alt-screen is handled in `App.tsx` `launchTUI()` — do not add additional ANSI escape codes elsewhere
