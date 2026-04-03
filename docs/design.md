# disky — CLI Design Spec

## Overview

A zero-config CLI that surfaces disk hogs on your machine — node_modules, .next, dist, Docker images, build caches — with project context and one-command cleanup.

---

## Branding

```
🗑️  disky
gobbling up your space...
```

- Name: **disky**
- Tagline: `gobbling up your space...`
- Shown in a rounded border box at the top of every `disky` invocation

---

## Commands

| Command | Description |
|---|---|
| `disky` | List top disk hogs (known build artifacts & caches) |
| `disky --all` | List all large directories, no type filter |
| `disky <id>` | Show detailed breakdown for a specific entry by ID |
| `disky <path>` | Show detailed breakdown for a specific directory by path |
| `disky clean` | Interactively remove all detected hogs |
| `disky clean <id>` | Remove a specific entry by ID (interactive confirm) |
| `disky clean <path>` | Remove a specific directory by path (interactive confirm) |
| `disky watch` | Real-time monitor, refreshes on filesystem change |

---

## `disky` — Main View

Scans the home directory and common project roots for known artifact directories (node_modules, .next, dist, .turbo, .cache, build, out, Docker layers, Gradle/Maven caches, etc.).

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️  disky                                                       │
│  gobbling up your space...                                      │
└─────────────────────────────────────────────────────────────────┘

  ID    SIZE      TYPE           PATH                                       PROJECT         AGE
  1     4.2 GB    node_modules   ~/projects/my-app/node_modules             my-app          3d ago
  2     3.1 GB    Docker         overlay2 (3 images, 2 stopped containers)  –               –
  3     1.8 GB    .next          ~/projects/blog/.next                      blog            1h ago
  4     920 MB    dist           ~/projects/landing/dist                    landing         5d ago
  5     600 MB    .gradle        ~/.gradle/caches                           –               7d ago
  6     210 MB    .turbo         ~/projects/monorepo/.turbo                 monorepo        12h ago

  10.8 GB recoverable  ·  Run disky <id> for details  ·  disky clean to free space
```

### Column Specs

| Column | Color | Notes |
|---|---|---|
| ID | Dim white | sequential integer, resets each run |
| SIZE | Yellow / Gold | human-readable (MB / GB) |
| TYPE | Cyan | artifact type label (node_modules, .next, Docker, etc.) |
| PATH | White | full path, `~` abbreviated |
| PROJECT | Purple / Violet | inferred from parent directory name |
| AGE | Green | time since last modification |

### Footer
```
  N GB recoverable  ·  Run disky <id> for details  ·  disky clean to free space
```
Dim/muted color. Centered dots as separators.

---

## `disky <id>` / `disky <path>` — Detail View

Accepts either the numeric ID from the table (e.g. `disky 1`) or the full path.

```
  ID            1
  Type          node_modules
  Size          4.2 GB
  Path          ~/projects/my-app/node_modules
  Project       my-app
  Last Modified 3 days ago  (Apr 1, 2026, 9:14 AM)

  Location      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  Directory     /Users/username/projects/my-app
  Project       my-app
  Git Branch    main

  Top Offenders ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  → @next/swc-darwin-arm64      340 MB
  → webpack                     120 MB
  → typescript                   98 MB
  → esbuild                      80 MB
  → (1,403 more packages…)      3.6 GB

  Remove this directory: disky clean 1  or  disky clean ~/projects/my-app/node_modules

  Delete node_modules at ~/projects/my-app? [y/N]
```

### Field Colors

| Field | Color |
|---|---|
| Labels (ID, Type, Size…) | Dim white |
| ID value | Dim white |
| Values | Bright white |
| Size value | Yellow |
| Last Modified | Green |
| Directory | Purple / Violet |
| Section headers (Location, Top Offenders) | Dim, with dashed separator |
| Top offender sizes | Yellow |
| Top offender arrows | Gray |
| Remove hint — command | Cyan |
| Remove hint — ID | Yellow |
| Remove hint — path | Red |
| `[y/N]` prompt | Yellow |

---

## `disky --all` — Full Scan View

Same table as `disky` but includes every directory over a size threshold (default 50 MB), not filtered to known artifact types.

```
  ID    SIZE      TYPE       PATH                               PROJECT   AGE
  1     1.2 GB    .cache     ~/.cache/puppeteer                 –         14d ago
  2     980 MB    unknown    ~/Library/Caches/com.apple…        –         2d ago
  ...
  28.4 GB total large dirs found  ·  Run disky <id> for details
```

- TYPE shows `unknown` when directory doesn't match a known artifact pattern
- No `disky clean to free space` hint in footer (safety — unknown dirs not auto-cleaned)

---

## `disky clean` — Bulk Cleanup

Presents all detected known-safe artifact directories and asks for confirmation before removing.

```
  Scanning for disk hogs...

  Found 6 removable directories:

  ID    SIZE      TYPE           PATH
  1     4.2 GB    node_modules   ~/projects/my-app/node_modules
  2     3.1 GB    Docker         3 stopped containers + 2 dangling images
  3     1.8 GB    .next          ~/projects/blog/.next
  4     920 MB    dist           ~/projects/landing/dist
  5     600 MB    .gradle        ~/.gradle/caches
  6     210 MB    .turbo         ~/projects/monorepo/.turbo

  Total recoverable: 10.8 GB

  Remove all? [y/N]
```

Each removal shows a progress line:
```
  ✓ [1] Removed node_modules  ~/projects/my-app           (4.2 GB freed)
  ✓ [2] Pruned Docker images & containers                  (3.1 GB freed)
  ✓ [3] Removed .next         ~/projects/blog              (1.8 GB freed)
  ✓ [4] Removed dist          ~/projects/landing           (920 MB freed)
  ✓ [5] Removed .gradle       ~/.gradle/caches             (600 MB freed)
  ✓ [6] Removed .turbo        ~/projects/monorepo          (210 MB freed)

  10.8 GB freed.
```

---

## `disky clean <id>` / `disky clean <path>` — Remove Specific Entry

Accepts either the numeric ID from the table (e.g. `disky clean 3`) or the full path.

```
  ID    SIZE      TYPE           PATH                                PROJECT   AGE
  3     1.8 GB    .next          ~/projects/blog/.next               blog      1h ago

  Delete .next at ~/projects/blog? [y/N]
```

On confirm:
```
  ✓ [3] Removed .next  ~/projects/blog  (1.8 GB freed)
```

---

## `disky watch` — Real-time Monitor

Refreshes the table in-place (full terminal repaint) when artifact directories grow or shrink.

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️  disky                               watching · Ctrl+C exit │
└─────────────────────────────────────────────────────────────────┘

  ID    SIZE      TYPE           PATH                                       PROJECT         AGE
  1     4.2 GB    node_modules   ~/projects/my-app/node_modules             my-app          3d ago
  2     1.8 GB    .next          ~/projects/blog/.next                      blog            1h ago
  3     920 MB    dist           ~/projects/landing/dist                    landing         5d ago

  Last updated: 10:52:34 AM  ·  10.8 GB recoverable
```

- Header box gains `watching · Ctrl+C exit` label on the right
- Table refreshes every 5 seconds (disk I/O is heavier than port scanning)
- Newly grown directories flash briefly in yellow on update
- Newly removed directories flash briefly in green before disappearing
- Footer shows `Last updated: HH:MM:SS AM/PM`

---

## Artifact Type Registry

| Type Label | Matched Paths / Patterns | Safe to Auto-clean |
|---|---|---|
| `node_modules` | `**/node_modules` | Yes |
| `.next` | `**/.next` | Yes |
| `.nuxt` | `**/.nuxt` | Yes |
| `dist` | `**/dist` | Yes |
| `build` | `**/build` | Yes |
| `out` | `**/out` | Yes |
| `.turbo` | `**/.turbo` | Yes |
| `.cache` | `**/.cache` | Yes |
| `.gradle` | `**/.gradle/caches` | Yes |
| `.m2` | `~/.m2/repository` | Yes |
| `Docker` | dangling images, stopped containers | Yes (via `docker system prune`) |
| `Xcode DerivedData` | `~/Library/Developer/Xcode/DerivedData` | Yes |
| `CocoaPods` | `**/Pods` | Yes |
| `unknown` | anything else over threshold | No — shown in `--all` only |

---

## Colors & Typography

| Element | Color (ANSI) |
|---|---|
| Column headers | Cyan / `#00ffff` |
| IDs | Dim white |
| Sizes | Yellow / `#ffff00` |
| Project names | Magenta / Purple |
| Type: node_modules | Green |
| Type: Docker | Blue |
| Type: .next / .nuxt | Cyan |
| Type: dist / build | Orange / Yellow |
| Type: cache dirs | Gray |
| Age | Green |
| Dim separators / labels | Gray / dim |
| Remove hints — command | Cyan |
| Remove hints — path | Red |

---

## Technical Notes

- Runtime: **Node.js** (ships as a global npm package: `npm i -g disky`)
- Entry IDs: sequential integers assigned at scan time, 1-indexed; `disky clean <id>` resolves against the last scan result cached in `~/.disky/last-scan.json`
- Disk scanning: recursive `du -sh` or `fs.stat` walking with depth limits
- Artifact detection: path pattern matching against the Artifact Type Registry
- Project detection: resolve nearest `package.json`, `Cargo.toml`, `go.mod`, or git root from the artifact path
- Git branch: `git -C <dir> branch --show-current`
- Docker: `docker system df` + `docker ps -a` for stopped containers
- Age: `fs.stat().mtime` on the artifact directory
- Watch mode: polling interval 5s with terminal clear + redraw
- Install: single binary via `pkg` or distributed as npm global

---

## File Structure (planned)

```
disky-ui/
├── docs/
│   └── design.md
├── src/
│   ├── index.ts          # CLI entry, command routing
│   ├── scanner.ts        # recursive disk usage scanning
│   ├── detector.ts       # artifact type + project detection
│   ├── renderer.ts       # table + detail view rendering
│   ├── watcher.ts        # watch mode loop
│   └── cleaner.ts        # removal logic (rm -rf + docker prune)
├── package.json
├── tsconfig.json
└── README.md
```
