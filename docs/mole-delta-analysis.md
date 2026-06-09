# disky vs. mole — Delta Analysis

> Comparison of [disky](https://github.com/) against [tw93/mole](https://github.com/tw93/mole)
> (v1.41.0, 55k★, Go + Shell single binary). Captured 2026-06-09.

## Framing

These are **not the same product**.

- **mole** is a macOS *system-maintenance suite* — a single-binary replacement for
  CleanMyMac + AppCleaner + DaisyDisk + iStat Menus. Broad scope, macOS-only.
- **disky** is a focused, cross-platform *dev build-artifact* cleaner
  (`node_modules`, `.next`, `dist`, Docker layers, package-manager caches).

So not every mole feature is something disky *should* chase. But mole's
**engineering discipline** is worth copying wholesale, and several of its UX
patterns fit disky's niche directly.

The single most important finding: **disky's `tests/` directory is gitignored**
(`.gitignore` contains `tests/`). The "96 tests, must stay green" guardrail in
`CLAUDE.md` is invisible to anyone who clones the repo, and there is **no CI** to
enforce it. That frames most of the engineering-practices gap below.

---

## 1. Features mole has that disky doesn't

| Feature | mole | disky | Adopt? |
|---|:---:|:---:|---|
| App uninstaller (app + launch agents, prefs, plists, WebKit storage, remnants) | ✅ | ❌ | Out of scope — different product |
| System optimize (rebuild DBs, reset network, clear diagnostics) | ✅ | ❌ | Out of scope |
| Live system dashboard (`mo status`: CPU/GPU/mem/disk/net/battery, health score 1–100, process monitoring) | ✅ | ❌ | Out of scope (disky's `watch` is just a re-scan) |
| Browser/app caches, system logs, Trash, installer-file cleanup | ✅ | ❌ | Adjacent — possible expansion |
| **Universal `--dry-run`** across *every* command | ✅ | clean-only | **Yes — cheap win** |
| **Auto-JSON when piped** (detects non-TTY) | ✅ | requires `--json` | **Yes — cheap win** |
| **Operation log / audit trail** (`~/Library/Logs/.../operations.log`, `mo history`, opt-out env var) | ✅ | ❌ | **Yes — high value for a destructive tool** |
| Whitelist management UX (`--whitelist` subcommand) | ✅ | manual JSON edit | **Yes** |
| Self-update (`mo update`, `--nightly`) | ✅ | ❌ | Maybe (npm handles this) |
| Shell completions generator (`mo completion`) | ✅ | ❌ | **Yes — cheap win** |
| `fd` integration for faster file discovery | ✅ | `du` only | Worth benchmarking |
| Multi-select checkboxes in interactive mode | ✅ | single/bulk | Maybe in TUI |
| Raycast / Alfred launchers | ✅ | ❌ | Nice-to-have |
| Semantic "insight" tagging in analyze (e.g. `Old Downloads (90d+)`, `Xcode Simulators`, `pip Cache`) | ✅ | raw dirs only | **Yes — strong UX win** |

**Cheap wins that fit disky's current scope:** universal `--dry-run`,
auto-JSON-on-pipe, an operation/audit log, a `--whitelist` subcommand, and shell
completions. None expand the product surface — they make the existing one safer
and more scriptable.

---

## 2. Engineering practices mole does better

mole's repo is a model of release discipline; disky has gaps that will bite as
it grows.

| Practice | mole | disky | Severity |
|---|:---:|---|:---:|
| **Tests committed & visible** | `/tests` in repo | **`tests/` is gitignored** — ~96 tests exist locally, invisible to clones/CI | 🔴 High |
| **CI/CD** | GitHub Actions | **None** — nothing enforces "tests stay green" | 🔴 High |
| **Linting in CI** | golangci-lint, ShellCheck | `lint` = `tsc --noEmit`, run manually; no ESLint | 🟠 Medium |
| **Secret scanning** | gitleaks (`.gitleaks.toml`) | ❌ | 🟠 Medium |
| **Pre-commit hooks** | `.githooks` | ❌ | 🟡 Low |
| **Security policy** | `SECURITY.md` + `SECURITY_AUDIT.md` | ❌ (a tool that runs `rm -rf` warrants one) | 🟠 Medium |
| **Contributor docs** | `CONTRIBUTING.md`, `AGENTS.md` | `CLAUDE.md` only | 🟡 Low |
| **Release discipline** | 46 tagged releases + changelog | v1.0.2, no CHANGELOG, no git tags | 🟡 Low |
| **node_modules hygiene** | clean | was **committed to git** (current `git status` is the cleanup removing it) | 🟡 Low (in progress) |
| **Distribution** | Homebrew + `install.sh` + version pinning, single binary (no runtime) | npm only (needs Node) | 🟡 Low (npm fits the audience) |

### The three that actually matter

1. **Gitignored tests + no CI.** The headline. `CLAUDE.md` treats "96 tests must
   stay green" as a guardrail, but the tests aren't in the repo and nothing runs
   them. A contributor (or you on a fresh machine) clones disky and gets *zero*
   coverage. **Fix:** remove `tests/` from `.gitignore`, commit them, add a
   GitHub Actions workflow (`npm ci && npm run build && npm test`). ~20 minutes,
   closes the single biggest gap.

2. **No audit trail for destructive operations.** disky deletes `node_modules`,
   `.next`, Docker layers — irreversible, no undo, no record. mole logs every
   operation to a file with structured output and an opt-out
   (`MO_NO_OPLOG=1`) and surfaces it via `mo history`. For a tool whose whole job
   is deletion, an append-only op-log (what, size, timestamp) is the cheapest
   insurance available and a genuine trust signal.

3. **Safety is asserted, not universal.** mole's posture is "dry-run everywhere,
   refuse when uncertain, log everything." disky has `--dry-run` on `clean` only
   and a `--force` escape hatch. Making `--dry-run` available on every
   destructive path and auto-switching to JSON when piped would match mole's
   "safe by default" ergonomics.

---

## 3. Where disky is already ahead (don't lose these)

- **Cleaner architecture for its scope.** Strategy-pattern detector registry
  (`ArtifactDetectorRegistry` + 14 typed detectors), `interfaces/` contracts,
  worker-thread scanning. mole is 82% shell — far less structured. Adding a
  detector in disky is trivial and type-safe.
- **Cross-platform by design.** mole is macOS-only (Windows is an experimental
  branch). disky's `du`-based core is more portable — though the `du`/`statfs`
  assumptions in `DiskScanner`/`DockerScanner` should be verified on Windows.
- **Richer per-entry reasoning.** disky's JSON explains *why* an entry is locked
  (`cleanPolicy` + `cleanReason`) and lists `topOffenders` and `gitBranch` per
  entry. mole's whitelist is coarser. This is a real disky advantage — see the
  UX guide for how to surface it better.
- **Tighter niche.** "dev artifacts in my projects" is a sharper value prop than
  "everything CleanMyMac does."

---

## 4. Recommended priority order

1. 🔴 **Un-ignore + commit tests, add a CI workflow** (closes the credibility gap).
2. 🔴 **Add an operation/audit log** for all deletions.
3. 🟠 **Universal `--dry-run` + auto-JSON-on-pipe.**
4. 🟠 **`SECURITY.md` + gitleaks** (disky is an `npm i -g` binary that runs `rm`).
5. 🟡 Shell completions, `--whitelist` subcommand, CHANGELOG + git tags.

See [`ux-improvement-guide.md`](ux-improvement-guide.md) for UX-specific findings
from running both tools live.
