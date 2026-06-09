# disky UX Improvement Guide

> Grounded in a side-by-side live run of **disky** and **mole v1.41.0** on the
> same machine (MacBook Air M3, macOS 26.4.1), 2026-06-09.

This is the experiential companion to
[`mole-delta-analysis.md`](mole-delta-analysis.md). Where that doc covers
features and engineering, this one covers *what it feels like to use each tool*.

---

## What I actually ran

| Command | Wall time | Result |
|---|---|---|
| `disky scan --top 8` | **~29s** | 1.8 GB recoverable, 3 locked, ranked table |
| `mo purge --dry-run` | **~41s** | 1.45 GB across 109 items, summary only |
| `mo analyze --json` | ~3s | semantic disk overview with insight tags |
| `mo status --json` | <1s | full system dashboard + health score |

Both project-cleanup commands are in the same ballpark on speed. The
*difference is entirely in the experience around the wait and the output*.

---

## Finding 1 — disky has no progress feedback during the scan 🔴

**The biggest UX gap.** disky prints its splash and then **hangs for ~29 seconds**
with no spinner, no counter, no streaming:

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️ disky                                                       │
│  gobbling up your space...                                      │
└─────────────────────────────────────────────────────────────────┘
          ← 29 seconds of apparent freeze, then the table appears
```

mole shows live progress in a TTY while `du`/`fd` walk the tree. A 29-second
silent hang reads as "frozen" — users hit Ctrl+C.

**Why it's easy to fix:** the scanner already runs in a worker thread
(`src/tui/workers/scanWorker.ts`) and `DiskScanner` already does bounded
parallel `du` passes. The worker just needs to `postMessage` progress events
(dirs scanned / current path / running total), and the CLI path needs a spinner.

**Recommendation**
- CLI `scan`/`clean`: render a spinner with a live "scanned N dirs · X GB found"
  line (respect the 4fps cap from `DESIGN.md`).
- Stream results as they're sized rather than blocking on the full set, so the
  table fills top-down.
- Suppress all of this automatically when `!process.stdout.isTTY` (see Finding 4).

---

## Finding 2 — disky lists raw dirs; mole tags *meaningful* categories 🟠

mole's `analyze` doesn't just dump big directories — it flags **actionable,
human-named insights** (`"insight": true`):

```
Docker Data            1.95 GB   insight
Old Downloads (90d+)   1.03 GB   insight
Homebrew Cache         …         insight
System Logs            …         insight
pip Cache              …         insight
Xcode Simulators       …         insight
```

disky surfaces the same underlying data but as raw artifact rows
(`~/.cache`, `~/.npm/_npx/0726791833487271/node_modules`). disky *has* richer
per-entry data than mole (it knows `cleanReason`, `gitBranch`, `topOffenders`) —
it just doesn't translate it into a one-glance human verdict.

**Recommendation**
- Add age-aware insight tags disky is uniquely positioned to compute, e.g.
  `node_modules · stale 30d+` (project not touched in a month → safe bet),
  `.next · rebuildable`, `Docker · 2 stopped containers`.
- Promote `topOffenders` into the table for the top entry (you already collect
  it) so users see *what's inside* the hog without drilling in.

---

## Finding 3 — disky lacks whole-disk context; mole always shows it 🟡

mole's purge footer:

```
Would free: 1.45GB | Items: 109 | Free: 72.10GB
```

disky's footer:

```
1.8 GB recoverable · Run disky <id> for details · disky clean to free space · 3 locked
```

disky tells me what's recoverable but **not how much disk I have or how full it
is**. "1.8 GB recoverable" means something very different on a 90%-full disk
than on a 10%-full one. mole anchors every number against total free space.

**Recommendation**
- Add `X GB free of Y GB (Z% used)` to the disky footer/header. `statfs` /
  `df` already needed elsewhere; cheap to surface.

---

## Finding 4 — JSON/pipe behavior is inconsistent in *both* tools 🟠

- **mole:** auto-switches to JSON when piped (great), but `mo purge --json`
  errors with `Unknown option: --json` — purge has no JSON at all.
- **disky:** `scan --json` works and is well-structured, but `clean` has no
  `--json`, and the splash banner is still printed even when piping.

**disky's JSON, to its credit, is excellent** — `cleanPolicy`, `cleanReason`,
`topOffenders`, `gitBranch`, both byte and human sizes:

```json
{
  "id": 1, "sizeBytes": 2341113856, "sizeHuman": "2.2 GB",
  "artifactType": { "label": ".cache", "cleanPolicy": "locked",
    "cleanReason": "No project root was found, so this may belong to a toolchain…" },
  "topOffenders": [ { "name": "codex-runtimes", "sizeHuman": "1.3 GB" } ]
}
```

**Recommendation**
- Detect `!isTTY` and auto-emit JSON (drop the banner) — match mole's best
  behavior without requiring `--json`.
- Add `--json` to `clean` (and `clean --dry-run --json`) so cleanup is
  scriptable and CI-checkable.
- Make `--json` and `--dry-run` *universal* flags, registered once.

---

## Finding 5 — the "locked" UX is a disky win — lean into it ✅

This is where disky already beats mole. Live output:

```
1  2.2 GB  .cache locked        ~/.cache    …  No project root was found…
6  214 MB  node_modules locked  ~/.npm/_npx/0726791833487271/node_modules
```

disky refuses to delete things it can't prove are safe and **tells you why**.
mole's whitelist is coarser and less explanatory. Don't bury this — make it a
headline feature.

**Recommendation**
- In the table, show a short reason inline or on hover/`<id>` (you already store
  `cleanReason`).
- Add a `--explain <id>` or surface the reason in the footer:
  `3 locked — run disky <id> to see why`.

---

## Finding 6 — interactive cleanup granularity 🟡

mole's interactive mode uses **multi-select checkboxes** (space to toggle, then
confirm a batch). disky `clean` is all-or-one: bulk, or a single id/path. For a
scan that returns 8–100 entries, "pick these 5" is a common need.

**Recommendation**
- In the TUI (`CleanView`), add multi-select with a running "selected: 3 ·
  1.2 GB" tally before the confirm dialog. The state already lives in
  `PanelLayout.tsx`.

---

## Priority order (UX)

1. 🔴 **Live scan progress** (spinner + streaming) — kills the "is it frozen?" moment.
2. 🟠 **Auto-JSON-on-pipe + drop the banner** — one isTTY check, big scripting win.
3. 🟠 **Insight tags** (`stale 30d+`, `rebuildable`) — translate the data you
   already have into verdicts.
4. 🟡 **Whole-disk context** in the footer (`free of total`).
5. 🟡 **Surface `cleanReason`** for locked entries — your differentiator.
6. 🟡 **Multi-select** in the TUI cleanup view.

Items 1–4 are small, high-leverage, and stay entirely within disky's existing
scope and architecture.
