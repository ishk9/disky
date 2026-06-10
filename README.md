# disky

> A zero-config CLI and TUI for finding developer disk hogs and safely reclaiming space.

disky scans your home directory for rebuildable artifacts such as `node_modules`, `.next`,
`dist`, Docker reclaimable data, Gradle/Maven caches, Xcode DerivedData, installer files,
logs, caches, and other large files. It shows project context, cleanup policy, size, age,
and a dry-run friendly path to removal.

```text
┌─────────────────────────────────────────────────────────────────┐
│  🗑️ disky                                                       │
│  gobbling up your space...                                      │
└─────────────────────────────────────────────────────────────────┘

  ID    SIZE      TYPE           PATH                                       PROJECT         AGE
  1     4.2 GB    node_modules   ~/projects/my-app/node_modules             my-app          3d ago
  2     3.1 GB    Docker         overlay2 (3 images, 2 stopped containers)  -               -
  3     1.8 GB    .next          ~/projects/blog/.next                      blog            1h ago

  10.8 GB recoverable  ·  Run disky <id> for details  ·  disky clean to free space
```

## Requirements

- macOS. The platform layer currently uses macOS implementations for `du`, `find`,
  app discovery, system metrics, Touch ID, and maintenance flows.
- Node.js 22+ for local development. The published package runs from compiled ESM in `dist/`.
- Docker is optional. If Docker is unavailable or has no reclaimable data, Docker results are
  skipped.

## Install

```bash
npm install -g @ishk9/disky
```

Local development:

```bash
npm install
npm run build
npm link
```

## Quick Start

```bash
disky                       # branded command list
disky scan --top 10         # ranked artifact scan
disky tui                   # interactive multi-panel TUI
disky clean --dry-run       # preview cleanup
disky clean                 # confirm and remove auto-cleanable artifacts
disky status                # system dashboard
```

IDs come from the latest scan table. `disky <id>` and `disky clean <id>` resolve through
`~/.disky/last-scan.json`, then fall back to a live scan when needed.

## Commands

### Core Scan and Cleanup

| Command | Description |
|---|---|
| `disky` | Show the branded command list. Does not scan. |
| `disky scan` | Scan known developer artifacts and Docker reclaimable data. |
| `disky scan --top <n>` | Show only the top N entries. |
| `disky scan --all` | Inspect all large directories under home, not just known artifacts. These entries are not auto-cleaned. |
| `disky scan --min <size>` | Filter entries at or above a size such as `500MB`, `1.5GB`, or `100KB`. Bare numbers mean MB. |
| `disky scan --sort <mode>` | Sort by `size` (default), `age`, or `type`. |
| `disky scan --json` | Emit scan results as JSON with no table chrome or colors. |
| `disky <id>` | Show detail for an entry from the latest scan. |
| `disky <path>` | Show detail for a directory path. |
| `disky clean` | Interactively remove all auto-cleanable artifact entries. |
| `disky clean <id>` | Confirm and remove a specific scan entry. |
| `disky clean <path>` | Confirm and remove a specific path. |
| `disky clean --dry-run` | Preview cleanup without deleting files. |
| `disky clean --exclude <paths...>` | Skip paths for this run, in addition to config exclusions. |
| `disky clean --whitelist <patterns...>` | Add temporary protected patterns for this run. |
| `disky clean <id\|path> --force` | Allow targeted removal of a locked entry. Bulk force cleanup is refused. |
| `disky watch` | Refresh the artifact table every 5 seconds until stopped. |

### Interactive TUI

```bash
disky tui
```

The TUI runs in the terminal alt-screen and uses an Ink/React multi-panel layout:

- `[1] Status`: scan totals and recoverable bytes.
- `[2] Breakdown`: artifact/category distribution.
- `[3] Disk`: animated disk art at the design-system frame rate.
- `[4] Actions`: command shortcuts.
- `[0] Main`: scan results, detail, clean, watch, status, analyze, sweep, history, or uninstall.

Global shortcuts:

| Key | Action |
|---|---|
| `1`-`4` | Focus a left-side panel. |
| `0` / `Tab` | Focus or cycle to the main panel. |
| `s` | Scan. |
| `c` | Clean. |
| `w` | Watch. |
| `x` | System status. |
| `a` | Analyze large files. |
| `e` | Sweep caches/logs/trash. |
| `h` | History. |
| `u` | Uninstall preview. |
| `?` | Help overlay. |
| `q` | Quit. |

Scan view shortcuts include `↑/↓` to navigate, `Enter` for detail, `c` to clean an
auto-cleanable selected entry, `s` to cycle sort mode, `f` to toggle artifact/all scope,
`/` to filter by size, and `r` to rescan. Clean view supports `Space` toggle, `a` select all,
`n` select none, `p` preview, and `Enter` confirm.

### macOS Utility Commands

| Command | Description |
|---|---|
| `disky sweep` | Reclaim space from `~/Library/Caches`, `~/Library/Logs`, CrashReporter data, and Trash. |
| `disky sweep --dry-run` | Preview sweep results and write dry-run audit records. |
| `disky installer` | Find and remove `.dmg`, `.pkg`, and `.iso` files in Downloads, Desktop, and Homebrew downloads. |
| `disky installer --dry-run` | Preview installer cleanup. |
| `disky analyze [path]` | Read-only disk overview plus largest files under a path. Defaults to home. |
| `disky analyze --min <size>` | Minimum large-file size. Defaults to `100MB`. |
| `disky analyze --top <n>` | Limit large-file output. |
| `disky status` | CPU, memory, disk, battery, GPU, network, top processes, and health score. |
| `disky uninstall <app>` | Preview a macOS app bundle and associated remnants. Defaults to dry-run. |
| `disky uninstall <app> --execute` | Confirm and remove the app bundle and remnants. |
| `disky optimize` | Preview macOS maintenance steps such as DNS, Launch Services, and cache resets. |
| `disky optimize --execute` | Confirm and run selected maintenance steps. |
| `disky optimize --skip <keys...>` | Skip specific optimization steps. |
| `disky history` | Show the operation audit log. |
| `disky history --limit <n>` | Limit audit-log records. |
| `disky whitelist` | List protected cleanup patterns. |
| `disky whitelist add <category> <pattern>` | Persist a protected pattern. |
| `disky whitelist remove <category> <pattern>` | Remove a protected pattern. |
| `disky touchid enable\|disable` | Manage Touch ID for sudo via `/etc/pam.d/sudo_local`. |
| `disky completion zsh\|bash\|fish` | Print shell completion script. |
| `disky update` | Install `@ishk9/disky@latest` globally through npm. |
| `disky update --nightly` | Install `@ishk9/disky@next`. |

Most utility commands support `--json`; many auto-enable JSON when stdout is piped. `scan`
uses explicit `--json`. `clean` is intentionally interactive and does not expose JSON output.

## Safety Model

disky classifies every entry before offering deletion:

| Policy | Meaning |
|---|---|
| `auto` | Known rebuildable artifact or cache. Eligible for default cleanup. |
| `inspect` | Useful to review, but not safe enough for automatic deletion. |
| `locked` | Protected path or likely toolchain/global install content. Skipped unless a targeted `--force` is used where supported. |

Important protections:

- `disky clean` only removes `auto` entries by default.
- `scan --all` entries and arbitrary large files from `analyze` are inspect-only.
- The running disky package, known Node/toolchain managers, and global package prefixes are
  protected.
- Destructive flows require confirmation unless they are dry runs.
- `--dry-run` previews without deleting files.
- Operation records are appended to `~/.disky/operations.log`. Set `DISKY_NO_OPLOG=1` to disable
  audit logging.
- The last scan cache is stored at `~/.disky/last-scan.json` for ID lookup.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the full safety model.

## Configuration

Persistent config lives at `~/.disky/config.json`.

```json
{
  "exclude": ["~/work/active-project", "~/important/node_modules"],
  "whitelist": {
    "all": ["~/Library/Caches/important-app"],
    "app": ["com.example.App"],
    "artifact": ["~/projects/keep-this-cache"]
  }
}
```

- `exclude` stores absolute or `~`-relative paths skipped during cleanup.
- `whitelist` stores protected patterns by category. `all` applies globally.
- CLI `--exclude` and `--whitelist` flags are merged with config values for that run.
- `disky whitelist list|add|remove` is the preferred way to edit whitelist entries.

Common whitelist categories include `all`, `artifact`, `system-cache`, `log`, `trash`,
`installer`, `large-file`, `app`, `docker`, and `optimize`.

## Detected Artifact Types

| Type | Pattern or Source | Default Cleanup |
|---|---|---|
| `node_modules` | `**/node_modules` | Auto when tied to a project; locked in protected toolchain/global prefixes. |
| `.next` | `**/.next` | Auto when tied to a project. |
| `.nuxt` | `**/.nuxt` | Auto when tied to a project. |
| `dist` | `**/dist` | Auto when tied to a project. |
| `build` | `**/build` | Auto when tied to a project. |
| `out` | `**/out` | Auto when tied to a project. |
| `.turbo` | `**/.turbo` | Auto when tied to a project. |
| `.cache` | `**/.cache` | Auto when tied to a project. |
| `.gradle` | `~/.gradle/caches` | Auto. |
| `.m2` | `~/.m2/repository` | Auto. |
| `Docker` | Reclaimable Docker images/containers/build cache | Auto. |
| `Xcode DerivedData` | `~/Library/Developer/Xcode/DerivedData` | Auto. |
| `CocoaPods` | `**/Pods` | Auto when tied to a project. |
| `pnpm store` | `~/.pnpm-store`, `~/.local/share/pnpm/store` | Auto. |
| `bun cache` | `~/.bun/install/cache` | Auto. |
| System/app caches | `~/Library/Caches/*` via `disky sweep` | Auto. |
| Logs and CrashReporter | `~/Library/Logs`, `~/Library/Application Support/CrashReporter` via `disky sweep` | Auto. |
| Trash | `~/.Trash` via `disky sweep` | Auto. |
| Installers | `.dmg`, `.pkg`, `.iso` in Downloads, Desktop, Homebrew downloads | Auto through `disky installer`. |
| Large directories | `disky scan --all`, 50MB+ under home | Inspect-only. |
| Large files | `disky analyze`, 100MB+ by default | Inspect-only. |

## Output and Design

The CLI/TUI follows [DESIGN.md](DESIGN.md):

- Sizes and recoverable-byte callouts are amber/yellow.
- Successful cleanup and freed space are green.
- Red is reserved for actual errors or genuinely stale age indicators, not large file sizes.
- Active panel borders are cyan; inactive borders are gray.
- TUI disk art is capped at 4fps.

## Architecture

```text
src/
├── commands/          Commander actions and command-specific orchestration
├── core/              config, scan cache, clean policy, formatting, operation log
├── clean/             cleaner strategies and CleanService
├── scan/              scan providers, orchestrator, entry builder, sweep sources
├── strategies/        artifact detector strategies and registry
├── platform/          interfaces for OS/shell dependencies
│   └── macos/         macOS implementations for du/find/docker/apps/sudo/metrics
├── system/            system metrics and disk usage helpers
├── insights/          large-file insight labels
├── renderers/         CLI string renderers and color helpers
├── tui/               Ink/React TUI, worker-backed scanner, views, panels, art
├── interfaces/        shared contracts
└── types/             DiskEntry, clean policy, artifact, and insight types
```

Key boundaries:

- `DiskScanner` is a facade over scan providers.
- `ScanOrchestrator` composes providers and assigns stable result ordering.
- Known artifacts use the detector registry and strategy pattern.
- Disk, Docker, app registry, sudo, and metrics calls live behind `src/platform/` interfaces.
- TUI scanning runs in `src/tui/workers/scanWorker.ts` so synchronous disk work does not move
  back onto the main TUI thread.
- `PanelLayout.tsx` owns shared TUI state; view components receive data as props.
- Alt-screen handling lives in `src/tui/App.tsx`.

## Development

```bash
npm install
npm run build          # compile TypeScript to dist/
npm test               # run Vitest
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run check          # typecheck + lint + format:check + tests
```

Useful manual checks:

```bash
node dist/index.js scan --top 5
node dist/index.js scan --json --top 5
node dist/index.js clean --dry-run
node dist/index.js tui
```

The package is TypeScript ESM (`"type": "module"`, `"module": "nodenext"`), uses Ink v4.4.1
with React 18 for the TUI, and ships compiled files from `dist/`.

## Project Docs

- [DESIGN.md](DESIGN.md): visual system and TUI design rules.
- [SECURITY.md](SECURITY.md): safety model and vulnerability reporting.
- [CONTRIBUTING.md](CONTRIBUTING.md): local setup, quality gate, and architecture conventions.
- [CHANGELOG.md](CHANGELOG.md): release history and unreleased changes.
