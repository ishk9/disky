# disky

> A zero-config CLI that surfaces disk hogs on your machine with one-command cleanup.

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️  disky                                                       │
│  gobbling up your space...                                      │
└─────────────────────────────────────────────────────────────────┘

  ID    SIZE      TYPE           PATH                                       PROJECT         AGE
  1     4.2 GB    node_modules   ~/projects/my-app/node_modules             my-app          3d ago
  2     3.1 GB    Docker         overlay2 (3 images, 2 stopped containers)  –               –
  3     1.8 GB    .next          ~/projects/blog/.next                      blog            1h ago

  10.8 GB recoverable  ·  Run disky <id> for details  ·  disky clean to free space
```

## Install

```bash
npm install -g .
```

Or link for local development:

```bash
npm link
```

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
| `disky watch` | Real-time monitor, refreshes every 5s (Ctrl+C to exit) |

## Development

```bash
# Build TypeScript
npm run build

# Run directly without build
npm run dev

# Type-check only
npm run lint
```

## Architecture

```
src/
├── types/            Shared TypeScript types (DiskEntry, ArtifactTypeInfo, TopOffender)
├── interfaces/       ICommand, IScanner, IArtifactDetector, IRenderer
├── core/             DiskScanner, ProjectDetector, DockerScanner, ScanCache
├── strategies/
│   └── artifact/    Per-artifact detectors + ArtifactDetectorRegistry (Singleton + Strategy)
├── renderers/        Colors, HeaderRenderer, TableRenderer, DetailRenderer, CleanRenderer
├── commands/         ListCommand, DetailCommand, CleanCommand, WatchCommand (Command pattern)
└── index.ts          CLI entry point (Commander.js)
```

**Design patterns used:** Command, Strategy, Registry (Singleton), Factory.

## Detected Artifact Types

| Type | Pattern | Auto-clean |
|---|---|---|
| `node_modules` | `**/node_modules` | ✓ |
| `.next` | `**/.next` | ✓ |
| `.nuxt` | `**/.nuxt` | ✓ |
| `dist` | `**/dist` | ✓ |
| `build` | `**/build` | ✓ |
| `out` | `**/out` | ✓ |
| `.turbo` | `**/.turbo` | ✓ |
| `.cache` | `**/.cache` | ✓ |
| `.gradle` | `**/.gradle/caches` | ✓ |
| `.m2` | `~/.m2/repository` | ✓ |
| `Docker` | stopped containers + dangling images | ✓ |
| `Xcode DerivedData` | `~/Library/Developer/Xcode/DerivedData` | ✓ |
| `CocoaPods` | `**/Pods` | ✓ |
