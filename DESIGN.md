# Design System — disky

## Product Context
- **What this is:** Zero-config CLI/TUI that surfaces disk hogs (node_modules, .next, dist, Docker images, build caches) with one-command cleanup.
- **Who it's for:** Developers who live in the terminal. Not scared of large files — want the satisfaction of a clean sweep.
- **Space/industry:** Developer tooling / disk management. Peers: lazygit, btop, dust, ncdu.
- **Project type:** TUI (terminal UI) — Ink + React, multi-panel lazygit-style layout.

## Aesthetic Direction
- **Direction:** Industrial-Clean with a warm accent
- **Decoration level:** Intentional (spinning disk art as brand anchor, braille art for logo)
- **Mood:** A surgical tool that's also a pleasure to use. Precise, calm, satisfying. The emotional arc is: "oh wow I have 8GB of build artifacts" → "this is satisfying to clean up" → "my machine is fast again."
- **Key insight:** Every disk tool uses red to signal large = dangerous. disky uses amber. The psychological shift is real — users feel like they're auditing, not firefighting.

## Color System

| Token | Hex | Usage |
|---|---|---|
| Cyan (primary active) | `#00D4E8` | Active panel borders/labels, cursor row indicator, key hints, progress |
| Amber (sizes) | `#F5A623` | File sizes, recoverable bytes callout — attention without alarm |
| Green (success) | `#4ADE80` | Freed space results, selected items in clean view, new watcher entries |
| Red (errors only) | `#F87171` | Actual failures, stale items (>90d), nothing else |
| Purple (projects) | `#C084FC` | Project name column — differentiates from path |
| Gray (inactive) | `#4B5563` | Inactive panel borders/labels, secondary metadata, scroll indicators |
| Near-white (text) | `#E5E7EB` | Primary text, paths, cursor row content |
| Surface | `#1F2937` | Cursor row highlight, confirm dialog backgrounds |
| Background | `#0D1117` | Terminal background (usually set by terminal emulator) |

**Critical rule:** Red is reserved for actual errors and genuinely stale (>90 day) items. Never use red for file sizes — that's amber's job.

**Age color mapping:**
- Fresh (<30d): green
- Warning (30–90d): amber
- Stale (>90d): red

## Typography

Monospace throughout — it's a terminal.

- **Primary font:** JetBrains Mono (widely installed by developers; excellent tabular-nums support; best terminal readability)
- **Fallback:** Geist Mono, then system monospace

**Hierarchy via weight + color (terminals don't do font size):**

| Role | Weight | Color | Usage |
|---|---|---|---|
| Panel labels | Normal | Cyan | `─ [1] Status`, `─ [0] Scan Results` |
| Table headers | Bold | Cyan | ID, SIZE, TYPE, PATH, PROJECT, AGE |
| Cursor row | Bold | Near-white | The selected entry |
| File sizes | Bold | Amber | All size values everywhere |
| Paths | Normal | Near-white | `displayPath` column |
| Project names | Normal | Purple | Project column |
| Metadata | Normal | Gray | Age, git branch, secondary info |
| Dimmed | Dim modifier | Gray | Inactive panel content, scroll indicators |
| Errors | Bold | Red | Failure messages only |
| Success | Bold | Green | "✓ Freed 4.2 GB" |

## Spacing

- **Base unit:** 1 terminal cell
- **Panel inner padding:** `paddingX={1}` (1 char each side)
- **Panel gap:** 0 — borders touch, no gap between panels
- **Status bar:** flush to bottom edge of outer frame, no extra padding

## Panel Borders

```
Active panel:    borderStyle="single"  borderColor="cyan"
Inactive panel:  borderStyle="single"  borderColor="gray"  (+ dimColor)
Outer AppFrame:  borderStyle="round"   borderColor="cyan"
```

Active state must be immediately obvious — the cyan single-line border is the focus indicator. Gray borders should feel clearly subordinate (use `dimColor` prop).

## Layout

- **Structure:** Two-column. Left column (~32% width) has 4 stacked panels. Right panel (`flexGrow=1`) shows the current main content.
- **Left panel height allocation:** Status ~32%, Breakdown ~28%, Disk ~22%, Actions remaining (~18%)
- **Main panel label:** Always `─ [0] {ContentName}` as first text child inside border.
- **Status bar:** Single line at bottom, below the panel row. Left = content stats (amber). Right = keyboard hints (gray, cyan keys).

## Semantic Color Rules

These must be applied consistently — violating them trains users to distrust the color system:

1. **Amber = size/quantity.** If it's measuring how much space something takes, it's amber.
2. **Green = good outcome.** If an action succeeded or space was freed, it's green.
3. **Red = failure or genuinely stale.** If a clean operation failed OR an entry hasn't been touched in 90+ days, it's red. Never for file sizes.
4. **Cyan = focus + action.** Active borders, cursor indicators, key hints, progress.
5. **Gray = inactive + metadata.** Anything secondary to the current action.
6. **Purple = project identity.** Project names only.

## Motion / Animation

- **Disk art (panel [3]):** 4 fps. Low enough not to fight cursor-move redraws and avoid flicker. This is disky's brand signature — no other terminal disk tool has persistent animated art.
- **Scan loading:** ArtCanvas `mode="scan"` animation. 8 fps max.
- **No other animation.** State transitions are instant — terminal rendering doesn't support smooth transitions.

## Design Risks (intentional departures from category norms)

1. **Amber for sizes, not red.** Every other disk tool screams red at large files. We treat large files as information, not emergencies. Amber draws attention without alarm.

2. **Green celebration on clean success.** When space is freed, the result gets full bright green + bold freed-bytes total. Other tools just show a plain list. This makes the cleanup moment feel satisfying — which keeps users coming back.

3. **The spinning disk as brand anchor.** Persistent animated art in panel [3] is unusual in terminal tools. lazygit doesn't do it. btop doesn't do it. It's disky's signature. Keep it at 4fps to avoid fighting redraws.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-10 | Initial design system created | Created by /design-consultation. Industrial-Clean aesthetic. Amber replaces red for file sizes. Cyan primary accent preserved from existing code. |
| 2026-04-10 | JetBrains Mono as primary font | Best tabular-nums support, widely installed on developer machines, excellent terminal readability. |
| 2026-04-10 | 4fps disk art animation | Reduces flicker during cursor-move redraws. Balances animation presence with UI responsiveness. |
| 2026-04-10 | Purple for project names | Gives project column its own identity, distinct from cyan (focus) and gray (metadata). |
