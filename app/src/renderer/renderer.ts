/// <reference path="../shared.d.ts" />
// Renderer for Disky. Plain script (no modules) — types come from ../shared.d.ts.

const api = window.disky;
const isMac = api.platform === 'darwin';
const trashName = isMac ? 'Trash' : 'Recycle Bin';

interface CategoryInfo {
  title: string;
  description: string;
  caution?: string;
  icon: string;
}

// Static, trusted SVG markup (never user data).
const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  large: {
    title: 'Large files',
    description: 'Files over 500 MB in your folders.',
    caution: 'These are your own files. Check you don’t need them before moving them.',
    icon: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  },
  downloads: {
    title: 'Old downloads',
    description: 'Things in Downloads you haven’t touched in 3 months.',
    caution: 'Installers and zips are usually safe to remove. Look over documents first.',
    icon: '<path d="M12 3.5v11m0 0-4.5-4.5M12 14.5l4.5-4.5"/><path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
  },
  caches: {
    title: 'App & browser caches',
    description: 'Temporary data apps rebuild on their own. Safe to clear.',
    icon: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  },
  temp: {
    title: 'Temporary files',
    description: 'Leftovers apps no longer need.',
    icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  },
  backups: {
    title: 'iPhone & iPad backups',
    description: 'Copies of your devices saved on this computer.',
    caution: 'Keep the newest backup of any device you still use.',
    icon: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  },
  trash: {
    title: trashName,
    description: 'Already deleted, but still taking up space until you empty it.',
    icon: '<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/>',
  },
};

const ORDER: CategoryId[] = ['caches', 'temp', 'downloads', 'large', 'backups', 'trash'];

// ─── State ──────────────────────────────────────────────────────────────────

let result: ScanResult | null = null;
const selected = new Set<string>();
const expanded = new Set<CategoryId>();
const itemsById = new Map<string, ScanItem>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Builds an element. Text children are always inserted as text, never HTML. */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: Array<Node | string | null>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (typeof value === 'boolean') value ? el.setAttribute(key, '') : el.removeAttribute(key);
    else el.setAttribute(key, value);
  }
  for (const child of children) if (child !== null) el.append(child);
  return el;
}

function icon(paths: string, cls = 'icon'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths; // trusted constant
  return svg;
}

// Match how each OS reports sizes: Finder uses 1000, Explorer uses 1024.
const UNIT = isMac ? 1000 : 1024;
function formatBytes(bytes: number): string {
  if (bytes < UNIT) return `${bytes} bytes`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let n = bytes / UNIT;
  let i = 0;
  while (n >= UNIT && i < units.length - 1) {
    n /= UNIT;
    i++;
  }
  const digits = n >= 100 || i < 2 ? 0 : 1;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: digits })} ${units[i]}`;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function formatAge(ms: number): string {
  const days = Math.round((ms - Date.now()) / 86_400_000);
  if (days > -1) return 'today';
  if (days > -30) return relative.format(days, 'day');
  if (days > -365) return relative.format(Math.round(days / 30), 'month');
  return relative.format(Math.round(days / 365), 'year');
}

// "com.spotify.client" → "Spotify": app caches are named after reverse-DNS app IDs.
const GENERIC = new Set(['client', 'app', 'helper', 'desktop', 'mac', 'macos', 'osx', 'shipit', 'agent', 'plist']);
function friendlyName(raw: string): string {
  const parts = raw.split('.');
  if (parts.length < 3 || !/^(com|org|net|io|app|co|me|dev)$/i.test(parts[0])) return raw;
  const words = parts.slice(1).filter((w) => !GENERIC.has(w.toLowerCase()) && !/\d{4,}/.test(w));
  const pretty = [...new Set(words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)))].join(' ');
  return pretty || raw;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ─── Views ──────────────────────────────────────────────────────────────────

type View = 'welcome' | 'scanning' | 'results' | 'cleaning' | 'done' | 'error';

function show(view: View): void {
  for (const el of document.querySelectorAll<HTMLElement>('.view')) el.hidden = el.id !== `view-${view}`;
  $('actionbar').hidden = view !== 'results' || isTidy();
  const heading = $(`view-${view}`).querySelector<HTMLElement>('h1, .hero-number');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function loadDiskSpace(): Promise<DiskSpace | null> {
  try {
    const space = await api.diskSpace();
    const used = space.total - space.free;
    $('disk').hidden = false;
    $('disk-used').style.setProperty('--used', String(used / space.total));
    $('disk-bar').setAttribute('aria-label', `${formatBytes(used)} used of ${formatBytes(space.total)}`);
    $('disk-label').textContent = `${formatBytes(space.free)} free of ${formatBytes(space.total)}`;
    return space;
  } catch {
    return null;
  }
}

// ─── Scanning ───────────────────────────────────────────────────────────────

const SCAN_STEPS: CategoryId[] = ['downloads', 'large', 'caches', 'temp', 'backups', 'trash'];

function renderSteps(current: CategoryId | null): void {
  const index = current ? SCAN_STEPS.indexOf(current) : -1;
  $('steps').replaceChildren(
    ...SCAN_STEPS.map((id, i) => {
      const state = i < index ? 'done' : i === index ? 'current' : 'pending';
      return h('li', { class: `step step-${state}` }, h('span', { class: 'step-dot', 'aria-hidden': 'true' }), CATEGORIES[id].title);
    }),
  );
  if (current) $('scan-status').textContent = `Checking ${CATEGORIES[current].title.toLowerCase()}`;
}

async function startScan(): Promise<void> {
  $('error-title').textContent = 'Something went wrong while scanning.';
  renderSteps(SCAN_STEPS[0]);
  show('scanning');
  try {
    const found = await api.scan();
    if (!found) {
      show('welcome');
      return;
    }
    result = found;
    selected.clear();
    itemsById.clear();
    cacheIds.clear();
    expanded.clear();
    for (const c of found.categories) {
      for (const item of c.items) {
        itemsById.set(item.id, item);
        if (c.id === 'caches') cacheIds.add(item.id);
        if (c.preselect) selected.add(item.id);
      }
    }
    renderResults();
    show('results');
  } catch {
    show('error');
  }
}

// ─── Results ────────────────────────────────────────────────────────────────

const visibleCategories = () =>
  ORDER.map((id) => result!.categories.find((c) => c.id === id)!).filter(
    (c) => c && (c.items.length > 0 || (c.id === 'trash' && c.bytes !== 0)),
  );

const isTidy = () => !!result && result.categories.every((c) => c.items.length === 0);

function selectionBytes(): number {
  let sum = 0;
  for (const id of selected) sum += itemsById.get(id)?.bytes ?? 0;
  return sum;
}

function renderResults(): void {
  const r = result!;
  const tidy = isTidy();
  $('hero').hidden = tidy;
  $('tidy').hidden = !tidy;

  // Permission notice (macOS)
  const denied = r.deniedFolders;
  const notice = $('permission-notice');
  notice.hidden = !r.needsFullDiskAccess && denied.length === 0;
  if (denied.length) {
    const alsoFda = r.needsFullDiskAccess ? ' Full Disk Access also lets it include your Trash and iPhone backups.' : '';
    $('permission-text').textContent = `Disky wasn’t allowed to look in ${denied.join(', ')}. Allow access in System Settings, then reopen Disky.${alsoFda}`;
    $('permission-btn').dataset.pane = r.needsFullDiskAccess ? 'fullDisk' : 'files';
  } else if (r.needsFullDiskAccess) {
    $('permission-text').textContent = 'Give Disky Full Disk Access to include your Trash and iPhone backups. After allowing it, reopen Disky.';
    $('permission-btn').dataset.pane = 'fullDisk';
  }

  const found = r.categories.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.bytes, 0), 0);
  const count = r.categories.reduce((sum, c) => sum + c.items.length, 0);
  $('hero-sub').textContent = `Found ${formatBytes(found)} across ${plural(count, 'item')}. We’ve ticked the ones that are safe to clear.`;

  $('categories').replaceChildren(...visibleCategories().map(renderCategory));
  updateSelection();
}

function renderCategory(c: ScanCategory): HTMLLIElement {
  const info = CATEGORIES[c.id];
  const listId = `items-${c.id}`;
  const isInfo = c.id === 'trash';
  const open = expanded.has(c.id);

  const header = h(
    'div',
    { class: 'cat-header' },
    isInfo
      ? h('span', { class: 'cat-check-spacer' })
      : h('input', {
          type: 'checkbox',
          class: 'check',
          id: `check-${c.id}`,
          'aria-label': `Select all ${info.title.toLowerCase()}`,
          onchange: (e) => {
            const on = (e.target as HTMLInputElement).checked;
            for (const item of c.items) on ? selected.add(item.id) : selected.delete(item.id);
            refreshCategory(c.id);
          },
        }),
    h('span', { class: 'cat-icon' }, icon(info.icon)),
    h('div', { class: 'cat-text' }, h('h2', { class: 'cat-title' }, info.title), h('p', { class: 'cat-desc' }, info.description)),
    h('span', { class: 'cat-size' }, c.bytes === null ? 'Needs permission' : formatBytes(c.bytes)),
    isInfo
      ? h('button', { class: 'btn btn-small btn-secondary', type: 'button', onclick: () => api.openTrash() }, `Open ${trashName}`)
      : h(
          'button',
          {
            class: 'disclosure',
            type: 'button',
            'aria-expanded': String(open),
            'aria-controls': listId,
            onclick: () => toggleCategory(c.id),
          },
          h('span', { class: 'visually-hidden' }, `Show ${plural(c.items.length, 'item')} in ${info.title}`),
          icon('<path d="m9 6 6 6-6 6"/>', 'chevron'),
        ),
  );

  const li = h('li', { class: `cat${open ? ' is-open' : ''}`, id: `cat-${c.id}` }, header);
  if (!isInfo) {
    const panel = h(
      'div',
      { class: 'cat-panel', id: listId, role: 'region', 'aria-label': info.title, hidden: !open },
      info.caution ? h('p', { class: 'caution' }, info.caution) : null,
      h('ul', { class: 'items' }, ...c.items.map(renderItem)),
    );
    li.append(panel);
  }
  return li;
}

const cacheIds = new Set<string>();
const displayName = (item: ScanItem) => (cacheIds.has(item.id) ? friendlyName(item.name) : item.name);

function renderItem(item: ScanItem): HTMLLIElement {
  const checkId = `item-${item.id}`;
  return h(
    'li',
    { class: 'item' },
    h('input', {
      type: 'checkbox',
      class: 'check',
      id: checkId,
      checked: selected.has(item.id),
      onchange: (e) => {
        (e.target as HTMLInputElement).checked ? selected.add(item.id) : selected.delete(item.id);
        updateSelection();
      },
    }),
    h(
      'label',
      { for: checkId, class: 'item-text' },
      h('span', { class: 'item-name', title: item.name }, displayName(item)),
      h('span', { class: 'item-meta' }, `${item.location} · changed ${formatAge(item.modified)}`),
    ),
    h('span', { class: 'item-size' }, formatBytes(item.bytes)),
    h(
      'button',
      {
        class: 'reveal',
        type: 'button',
        title: isMac ? 'Show in Finder' : 'Show in File Explorer',
        onclick: () => api.reveal(item.id),
      },
      h('span', { class: 'visually-hidden' }, `Show ${item.name} in ${isMac ? 'Finder' : 'File Explorer'}`),
      icon('<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>'),
    ),
  );
}

function toggleCategory(id: CategoryId): void {
  expanded.has(id) ? expanded.delete(id) : expanded.add(id);
  const li = $(`cat-${id}`);
  const open = expanded.has(id);
  li.classList.toggle('is-open', open);
  li.querySelector('.disclosure')?.setAttribute('aria-expanded', String(open));
  const panel = li.querySelector<HTMLElement>('.cat-panel');
  if (panel) panel.hidden = !open;
}

function refreshCategory(id: CategoryId): void {
  const c = result!.categories.find((x) => x.id === id)!;
  for (const item of c.items) {
    const box = document.getElementById(`item-${item.id}`) as HTMLInputElement | null;
    if (box) box.checked = selected.has(item.id);
  }
  updateSelection();
}

let shownBytes = 0;
let animation = 0;
function animateHero(target: number): void {
  cancelAnimationFrame(animation);
  const el = $('hero-number');
  if (reducedMotion.matches) {
    shownBytes = target;
    el.textContent = formatBytes(target);
    return;
  }
  const from = shownBytes;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 420);
    const eased = 1 - Math.pow(1 - t, 3);
    shownBytes = Math.round(from + (target - from) * eased);
    el.textContent = formatBytes(shownBytes);
    if (t < 1) animation = requestAnimationFrame(step);
  };
  animation = requestAnimationFrame(step);
}

function updateSelection(): void {
  const r = result!;
  for (const c of r.categories) {
    const box = document.getElementById(`check-${c.id}`) as HTMLInputElement | null;
    if (!box) continue;
    const n = c.items.filter((i) => selected.has(i.id)).length;
    box.checked = n > 0 && n === c.items.length;
    box.indeterminate = n > 0 && n < c.items.length;
  }
  const bytes = selectionBytes();
  animateHero(bytes);
  $('selection-summary').textContent = selected.size
    ? `${plural(selected.size, 'item')} selected · ${formatBytes(bytes)}`
    : 'Nothing selected';
  $<HTMLButtonElement>('clean-btn').disabled = selected.size === 0;
}

// ─── Confirm & clean ────────────────────────────────────────────────────────

function confirmClean(): void {
  const dialog = $<HTMLDialogElement>('confirm');
  $('confirm-title').textContent = `Move ${plural(selected.size, 'item')} to the ${trashName}?`;
  $('confirm-body').textContent = `This frees ${formatBytes(selectionBytes())} once you empty the ${trashName}. Until then you can put anything back.`;
  dialog.showModal();
}

async function clean(): Promise<void> {
  $<HTMLDialogElement>('confirm').close();
  const ids = [...selected];
  $('clean-bar').style.setProperty('--progress', '0');
  $('clean-current').textContent = '';
  show('cleaning');

  let outcomes: TrashOutcome[];
  try {
    outcomes = await api.trash(ids);
  } catch {
    // Some items may have moved before the failure; a fresh scan shows the truth.
    $('error-title').textContent = `Something went wrong while moving files to the ${trashName}.`;
    result = null;
    show('error');
    return;
  }
  const moved = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const freed = moved.reduce((sum, o) => sum + (itemsById.get(o.id)?.bytes ?? 0), 0);

  if (moved.length === 0) {
    $('done-title').textContent = 'Nothing could be moved.';
    $('done-sub').textContent = 'Your files are unchanged. See why below.';
  } else {
    $('done-title').textContent = `${formatBytes(freed)} moved to the ${trashName}.`;
    $('done-sub').textContent = `Empty the ${trashName} to get the space back. Changed your mind? You can still put things back from there.`;
  }

  $('failures').hidden = failed.length === 0;
  $('failures-title').textContent = `${plural(failed.length, 'item')} couldn’t be moved`;
  $('failure-list').replaceChildren(
    ...failed.map((o) => {
      const item = itemsById.get(o.id);
      return h(
        'li',
        {},
        h('span', { class: 'item-name' }, item ? displayName(item) : 'Unknown item'),
        h('span', { class: 'item-meta' }, `${item?.location ?? ''} · ${o.error ?? ''}`),
      );
    }),
  );
  document.querySelector('.done-mark')?.classList.toggle('is-muted', moved.length === 0);
  result = null;
  show('done');
}

// ─── Wiring ─────────────────────────────────────────────────────────────────

function init(): void {
  document.documentElement.classList.add(`platform-${api.platform}`);
  for (const el of document.querySelectorAll('[data-trash-name]')) el.textContent = trashName;
  $('scan-btn').textContent = isMac ? 'Scan my Mac' : 'Scan my PC';

  api.onScanProgress(renderSteps);
  api.onTrashProgress((done, total, name) => {
    $('clean-bar').style.setProperty('--progress', String(total ? done / total : 1));
    $('clean-current').textContent = done < total ? `${done + 1} of ${total} · ${name}` : 'Finishing up…';
  });

  $('scan-btn').addEventListener('click', startScan);
  $('retry-btn').addEventListener('click', startScan);
  $('rescan-btn').addEventListener('click', startScan);
  $('rescan-results-btn').addEventListener('click', startScan);
  $('cancel-btn').addEventListener('click', () => api.cancelScan());
  $('clean-btn').addEventListener('click', confirmClean);
  $('confirm-ok').addEventListener('click', clean);
  $('confirm-cancel').addEventListener('click', () => $<HTMLDialogElement>('confirm').close());
  $('open-trash-btn').addEventListener('click', () => api.openTrash());
  $('permission-btn').addEventListener('click', (e) => {
    const pane = (e.currentTarget as HTMLElement).dataset.pane === 'files' ? 'files' : 'fullDisk';
    api.openPrivacySettings(pane);
  });

  loadDiskSpace();
  show('welcome');
}

init();
