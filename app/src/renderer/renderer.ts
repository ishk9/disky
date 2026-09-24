/// <reference path="../shared.d.ts" />
// Renderer for Disky. Plain script (no modules) — types come from ../shared.d.ts.

const api = window.disky;
const isMac = api.platform === 'darwin';
const trashName = isMac ? 'Trash' : 'Recycle Bin';
const machine = isMac ? 'Mac' : 'PC';

// 20×20 line glyphs drawn white on a coloured tile, in the style of System Settings.
// Static, trusted markup (never user data).
const GLYPH = {
  overview:
    '<path d="M3.5 11.5h13M3.5 11.5l1.7-5.6A1.5 1.5 0 0 1 6.6 5h6.8a1.5 1.5 0 0 1 1.4.9l1.7 5.6v2.8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M13.5 13.7h.01"/>',
  caches:
    '<ellipse cx="10" cy="5.5" rx="6" ry="2.3"/><path d="M4 5.5v9c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3v-9"/><path d="M4 10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3"/>',
  temp: '<circle cx="10" cy="10" r="6.8"/><path d="M10 6.3V10l2.6 1.6"/>',
  downloads:
    '<path d="M10 3.5v8.5m0 0-3.3-3.3M10 12l3.3-3.3"/><path d="M4 13.5v1.5a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-1.5"/>',
  large: '<path d="M6 2.8h5.2L15 6.6V16a1.4 1.4 0 0 1-1.4 1.4H6A1.4 1.4 0 0 1 4.6 16V4.2A1.4 1.4 0 0 1 6 2.8z"/><path d="M11 3v3.8h3.8"/>',
  backups: '<rect x="5.8" y="2.8" width="8.4" height="14.4" rx="1.8"/><path d="M9 14.6h2"/>',
  trash:
    '<path d="M3.8 5.6h12.4M8 5.6V4.3a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8v1.3M5.5 5.6l.8 10.4a1.4 1.4 0 0 0 1.4 1.3h4.6a1.4 1.4 0 0 0 1.4-1.3l.8-10.4"/>',
  warning: '<path d="M10 3.6 17 16H3z"/><path d="M10 8.4v3.4M10 14.1h.01"/>',
  check: '<path d="m5 10.4 3.2 3.1L15 6.6"/>',
  chevron: '<path d="m7.5 4.8 5.2 5.2-5.2 5.2"/>',
  reveal: '<circle cx="10" cy="10" r="6.8"/><path d="m8.8 7 3 3-3 3"/>',
};

interface CategoryInfo {
  title: string;
  description: string;
  caution?: string;
  /** Tile colour; also used for this category's slice of the storage bar. */
  color: string;
  glyph: keyof typeof GLYPH;
}

const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  caches: {
    title: 'App Caches',
    description: 'Temporary data apps and browsers rebuild on their own.',
    color: '#30B0C7',
    glyph: 'caches',
  },
  temp: {
    title: 'Temporary Files',
    description: 'Leftovers from apps that haven’t been touched in over a day.',
    color: '#5E5CE6',
    glyph: 'temp',
  },
  downloads: {
    title: 'Old Downloads',
    description: 'Items in Downloads you haven’t opened in three months.',
    caution: 'Installers and archives are usually safe to remove. Check documents before moving them.',
    color: '#FF9500',
    glyph: 'downloads',
  },
  large: {
    title: 'Large Files',
    description: 'Files over 500 MB in your folders.',
    caution: 'These are your own files. Make sure you don’t need them before moving them.',
    color: '#AF52DE',
    glyph: 'large',
  },
  backups: {
    title: 'Device Backups',
    description: 'iPhone and iPad backups stored on this computer.',
    caution: 'Keep the most recent backup of any device you still use.',
    color: '#FF2D55',
    glyph: 'backups',
  },
  trash: {
    title: trashName,
    description: 'Deleted items still take up space until you empty it.',
    color: '#8E8E93',
    glyph: 'trash',
  },
};

const NAV_ORDER: CategoryId[] = ['caches', 'temp', 'downloads', 'large', 'backups', 'trash'];
/** Order the scanner reports progress in. */
const SCAN_STEPS: CategoryId[] = ['downloads', 'large', 'caches', 'temp', 'backups', 'trash'];

// ─── State ──────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'scanning' | 'results' | 'error';
type Page = 'overview' | CategoryId;

let phase: Phase = 'idle';
let page: Page = 'overview';
let result: ScanResult | null = null;
let space: DiskSpace | null = null;
let scanStep: CategoryId | null = null;
const selected = new Set<string>();
const itemsById = new Map<string, ScanItem>();
const cacheIds = new Set<string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type Props = Record<string, string | boolean | ((e: Event) => void)>;

/** Builds an element. Text children are always inserted as text, never HTML. */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Array<Node | string | null | false>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (typeof value === 'boolean') value ? el.setAttribute(key, '') : el.removeAttribute(key);
    else el.setAttribute(key, value);
  }
  for (const child of children) if (child !== null && child !== false) el.append(child);
  return el;
}

function glyph(name: keyof typeof GLYPH, cls = 'glyph'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = GLYPH[name]; // trusted constant
  return svg;
}

function tile(name: keyof typeof GLYPH, color: string, size: 'small' | 'large' = 'small'): HTMLElement {
  const el = h('span', { class: `tile tile-${size}`, 'aria-hidden': 'true' }, glyph(name));
  el.style.setProperty('--tile', color);
  return el;
}

const spinner = () => h('span', { class: 'spinner', 'aria-hidden': 'true' });

// Match how each OS reports sizes: Finder uses 1000, Explorer uses 1024.
const UNIT = isMac ? 1000 : 1024;
function formatBytes(bytes: number): string {
  if (bytes < UNIT) return bytes === 0 ? 'Zero KB' : `${bytes} bytes`;
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

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function formatDate(ms: number): string {
  const days = Math.round((ms - Date.now()) / 86_400_000);
  if (days > -1) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days > -7) return relative.format(days, 'day').replace(/^\w/, (c) => c.toUpperCase());
  return dateFormat.format(ms);
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
const displayName = (item: ScanItem) => (cacheIds.has(item.id) ? friendlyName(item.name) : item.name);

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const categoryOf = (id: CategoryId) => result?.categories.find((c) => c.id === id) ?? null;
const hasItems = () => !!result && result.categories.some((c) => c.items.length > 0);

function selectedIn(c: ScanCategory): ScanItem[] {
  return c.items.filter((i) => selected.has(i.id));
}

function selectionBytes(): number {
  let sum = 0;
  for (const id of selected) sum += itemsById.get(id)?.bytes ?? 0;
  return sum;
}

function announce(text: string): void {
  $('announcer').textContent = text;
}

// ─── Render ─────────────────────────────────────────────────────────────────

function render(): void {
  renderSidebar();
  renderToolbar();
  renderContent();
  renderSelectionBar();
}

function renderSidebar(): void {
  const stepIndex = scanStep ? SCAN_STEPS.indexOf(scanStep) : -1;

  const trailing = (id: CategoryId): Node | string | null => {
    if (phase === 'scanning') {
      const i = SCAN_STEPS.indexOf(id);
      if (i === stepIndex) return spinner();
      if (i < stepIndex) return glyph('check', 'nav-check');
      return null;
    }
    const c = categoryOf(id);
    return c?.bytes ? formatBytes(c.bytes) : null;
  };

  const item = (id: Page, label: string, icon: HTMLElement, trail: Node | string | null, enabled: boolean) =>
    h(
      'button',
      {
        class: 'nav-item',
        type: 'button',
        disabled: !enabled,
        ...(page === id ? { 'aria-current': 'page' } : {}),
        onclick: () => go(id),
      },
      icon,
      h('span', { class: 'nav-label' }, label),
      h('span', { class: 'nav-trailing' }, trail ?? ''),
    );

  const browsable = phase === 'results' || (phase === 'scanning' && !!result);
  $('nav').replaceChildren(
    item('overview', 'Overview', tile('overview', '#8E8E93'), null, true),
    h('p', { class: 'nav-heading' }, 'Clean Up'),
    ...NAV_ORDER.map((id) => item(id, CATEGORIES[id].title, tile(CATEGORIES[id].glyph, CATEGORIES[id].color), trailing(id), browsable)),
  );

  if (space) {
    const used = space.total - space.free;
    $('disk-foot').hidden = false;
    $('disk-foot-bar').style.setProperty('--fill', String(used / space.total));
    $('disk-foot-label').textContent = `${formatBytes(space.free)} available of ${formatBytes(space.total)}`;
  }
}

function renderToolbar(): void {
  $('page-title').textContent = page === 'overview' ? 'Overview' : CATEGORIES[page].title;
  $('toolbar-progress').hidden = phase !== 'scanning';

  const actions: Node[] = [];
  if (phase === 'scanning') {
    actions.push(
      h('span', { class: 'toolbar-status' }, scanStep ? `Checking ${CATEGORIES[scanStep].title.toLowerCase()}…` : 'Scanning…'),
      h('button', { class: 'button', type: 'button', onclick: () => api.cancelScan() }, 'Stop'),
    );
  } else if (phase === 'results' || phase === 'error') {
    actions.push(h('button', { class: 'button', type: 'button', onclick: startScan }, 'Scan Again'));
  }
  $('toolbar-actions').replaceChildren(...actions);
}

function renderContent(): void {
  const content = $('content');
  let body: Array<Node | string>;
  if (phase === 'error') body = [errorView()];
  else if (page === 'overview') body = overview();
  else body = categoryPage(page);
  content.replaceChildren(h('div', { class: 'content-inner' }, ...body));
}

function renderSelectionBar(): void {
  const show = phase === 'results' && hasItems();
  $('selection-bar').hidden = !show;
  if (!show) return;
  const n = selected.size;
  $('selection-summary').textContent = n ? `${plural(n, 'item')} selected · ${formatBytes(selectionBytes())}` : 'No items selected';
  const button = $<HTMLButtonElement>('clean-btn');
  button.textContent = `Move to ${trashName}…`;
  button.disabled = n === 0;
}

/** Light update after ticking boxes: avoids rebuilding the page under the pointer. */
function refreshSelection(): void {
  for (const box of document.querySelectorAll<HTMLInputElement>('input[data-item]')) {
    box.checked = selected.has(box.dataset.item!);
  }
  const all = document.querySelector<HTMLInputElement>('input[data-all]');
  const c = page !== 'overview' ? categoryOf(page) : null;
  if (all && c) {
    const n = selectedIn(c).length;
    all.checked = n > 0 && n === c.items.length;
    all.indeterminate = n > 0 && n < c.items.length;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-selected-for]')) {
    const cat = categoryOf(el.dataset.selectedFor as CategoryId);
    if (cat) el.textContent = selectedLabel(cat);
  }
  const heroSelected = document.getElementById('overview-selected');
  if (heroSelected) heroSelected.textContent = `${formatBytes(selectionBytes())} selected`;
  renderSelectionBar();
}

function go(target: Page): void {
  page = target;
  renderSidebar();
  renderToolbar();
  renderContent();
  $('content').scrollTop = 0;
  $('content').focus({ preventScroll: true });
}

// ─── Overview ───────────────────────────────────────────────────────────────

function storageSection(): HTMLElement {
  if (!space) return h('section', { class: 'storage' });
  const used = space.total - space.free;
  const pct = (bytes: number) => `${Math.max((bytes / space!.total) * 100, bytes > 0 ? 0.4 : 0)}%`;

  const reclaim = (result?.categories ?? []).filter((c) => (c.bytes ?? 0) > 0);
  const reclaimBytes = reclaim.reduce((sum, c) => sum + (c.bytes ?? 0), 0);
  const segments = [
    ...reclaim.map((c) => {
      const seg = h('span', { class: 'segment', title: `${CATEGORIES[c.id].title}: ${formatBytes(c.bytes!)}` });
      seg.style.setProperty('--seg', CATEGORIES[c.id].color);
      seg.style.width = pct(c.bytes!);
      return seg;
    }),
  ];
  const other = h('span', { class: 'segment segment-other', title: `Everything else: ${formatBytes(used - reclaimBytes)}` });
  other.style.width = pct(Math.max(used - reclaimBytes, 0));

  const legend = reclaim.length
    ? reclaim.map((c) => legendItem(CATEGORIES[c.id].color, CATEGORIES[c.id].title, c.bytes!))
    : [legendItem('var(--bar-other)', 'Used', used)];
  legend.push(legendItem('var(--bar-free)', 'Available', space.free));

  return h(
    'section',
    { class: 'storage', 'aria-label': 'Storage' },
    h(
      'div',
      { class: 'storage-head' },
      h('h2', { class: 'section-title' }, `This ${machine}`),
      h('p', { class: 'storage-figure' }, h('strong', {}, formatBytes(space.free)), ` available of ${formatBytes(space.total)}`),
    ),
    h('div', { class: 'bar', role: 'img', 'aria-label': `${formatBytes(used)} used, ${formatBytes(space.free)} available` }, ...segments, other),
    h('ul', { class: 'legend' }, ...legend),
  );
}

function legendItem(color: string, label: string, bytes: number): HTMLLIElement {
  const dot = h('span', { class: 'dot', 'aria-hidden': 'true' });
  dot.style.setProperty('--dot', color);
  return h('li', {}, dot, h('span', {}, label), h('span', { class: 'legend-size' }, formatBytes(bytes)));
}

function selectedLabel(c: ScanCategory): string {
  const n = selectedIn(c).length;
  if (c.id === 'trash') return c.bytes === null ? 'Needs access' : '';
  if (n === 0) return plural(c.items.length, 'item');
  return n === c.items.length ? 'All selected' : `${n} of ${c.items.length} selected`;
}

function overview(): Array<Node | string> {
  const nodes: Array<Node | string> = [storageSection()];

  if (phase === 'idle' || (phase === 'scanning' && !result)) {
    const scanning = phase === 'scanning';
    nodes.push(
      h(
        'section',
        { class: 'intro' },
        h('h2', { class: 'intro-title' }, scanning ? `Scanning your ${machine}…` : `Find what’s taking up space`),
        h(
          'p',
          { class: 'intro-body' },
          `Disky checks your downloads, large files, app caches, temporary files and device backups. You choose what to remove, and everything goes to the ${trashName} first.`,
        ),
        scanning
          ? h('div', { class: 'intro-progress' }, spinner(), h('span', {}, scanStep ? `Checking ${CATEGORIES[scanStep].title.toLowerCase()}` : 'Starting'))
          : h('button', { class: 'button button-primary', type: 'button', onclick: startScan }, 'Scan'),
      ),
    );
    return nodes;
  }

  const r = result!;
  nodes.push(permissionNotice());

  const rows = NAV_ORDER.map((id) => r.categories.find((c) => c.id === id)!).filter(
    (c) => c.items.length > 0 || (c.id === 'trash' && c.bytes !== 0),
  );

  if (!hasItems()) {
    nodes.push(
      h(
        'section',
        { class: 'empty' },
        glyph('check', 'empty-mark'),
        h('h2', { class: 'empty-title' }, 'Nothing to clean up'),
        h('p', { class: 'empty-body' }, `Your ${machine} has no old downloads, large files or leftovers worth removing right now.`),
      ),
    );
  }

  if (rows.length) {
    const found = r.categories.reduce((sum, c) => sum + (c.id === 'trash' ? 0 : c.bytes ?? 0), 0);
    nodes.push(
      h(
        'div',
        { class: 'section-head' },
        h('h2', { class: 'section-title' }, 'Recommendations'),
        hasItems() && h('p', { class: 'section-meta' }, `${formatBytes(found)} found · `, h('span', { id: 'overview-selected' }, `${formatBytes(selectionBytes())} selected`)),
      ),
      h(
        'ul',
        { class: 'group' },
        ...rows.map((c) =>
          h(
            'li',
            {},
            h(
              'button',
              { class: 'row row-link', type: 'button', onclick: () => go(c.id) },
              tile(CATEGORIES[c.id].glyph, CATEGORIES[c.id].color, 'large'),
              h(
                'span',
                { class: 'row-text' },
                h('span', { class: 'row-title' }, CATEGORIES[c.id].title),
                h('span', { class: 'row-subtitle' }, CATEGORIES[c.id].description),
              ),
              h(
                'span',
                { class: 'row-meta' },
                h('span', { class: 'row-size' }, c.bytes === null ? '—' : formatBytes(c.bytes)),
                h('span', { class: 'row-note', 'data-selected-for': c.id }, selectedLabel(c)),
              ),
              glyph('chevron', 'row-chevron'),
            ),
          ),
        ),
      ),
    );
  }
  return nodes;
}

function permissionNotice(): Node | string {
  const r = result!;
  if (!r.needsFullDiskAccess && r.deniedFolders.length === 0) return '';
  const folders = r.deniedFolders.join(', ');
  const text = r.deniedFolders.length
    ? `Disky couldn’t look in ${folders}.${r.needsFullDiskAccess ? ` Full Disk Access also lets it measure your ${trashName} and device backups.` : ''}`
    : `Give Disky Full Disk Access to include your ${trashName} and device backups.`;
  const pane = r.needsFullDiskAccess ? 'fullDisk' : 'files';
  return h(
    'div',
    { class: 'notice', role: 'status' },
    tile('warning', '#FF9500'),
    h('div', { class: 'notice-text' }, h('p', { class: 'notice-title' }, text), h('p', { class: 'notice-body' }, 'After allowing access, quit and reopen Disky.')),
    h('button', { class: 'button', type: 'button', onclick: () => api.openPrivacySettings(pane) }, 'Open Settings…'),
  );
}

// ─── Category page ──────────────────────────────────────────────────────────

function categoryPage(id: CategoryId): Node[] {
  const info = CATEGORIES[id];
  const c = categoryOf(id);
  if (!c) return [];

  const header = h(
    'header',
    { class: 'page-head' },
    tile(info.glyph, info.color, 'large'),
    h('div', { class: 'page-head-text' }, h('h2', { class: 'page-title' }, info.title), h('p', { class: 'page-subtitle' }, info.description)),
    h('p', { class: 'page-size' }, c.bytes === null ? '—' : formatBytes(c.bytes)),
  );

  if (id === 'trash') return [header, trashPanel(c)];

  if (c.items.length === 0) {
    return [header, h('section', { class: 'empty' }, glyph('check', 'empty-mark'), h('p', { class: 'empty-body' }, 'Nothing here right now.'))];
  }

  const nodes: Node[] = [header];
  if (info.caution) nodes.push(h('p', { class: 'caution' }, glyph('warning', 'caution-glyph'), info.caution));
  nodes.push(itemTable(c));
  return nodes;
}

function trashPanel(c: ScanCategory): HTMLElement {
  const needsAccess = c.bytes === null;
  return h(
    'ul',
    { class: 'group' },
    h(
      'li',
      {},
      h(
        'div',
        { class: 'row' },
        h(
          'span',
          { class: 'row-text' },
          h('span', { class: 'row-title' }, needsAccess ? `Disky can’t see inside the ${trashName}` : `Empty the ${trashName} to get this space back`),
          h(
            'span',
            { class: 'row-subtitle' },
            needsAccess
              ? 'Turn on Full Disk Access for Disky in System Settings, then reopen it.'
              : `Disky never empties it for you, so you can still put things back.`,
          ),
        ),
        needsAccess
          ? h('button', { class: 'button', type: 'button', onclick: () => api.openPrivacySettings('fullDisk') }, 'Open Settings…')
          : h('button', { class: 'button', type: 'button', onclick: () => api.openTrash() }, `Open ${trashName}`),
      ),
    ),
  );
}

function itemTable(c: ScanCategory): HTMLElement {
  const n = selectedIn(c).length;
  const all = h('input', {
    type: 'checkbox',
    class: 'check',
    'data-all': 'true',
    'aria-label': `Select all ${CATEGORIES[c.id].title.toLowerCase()}`,
    onchange: (e) => {
      const on = (e.target as HTMLInputElement).checked;
      for (const item of c.items) on ? selected.add(item.id) : selected.delete(item.id);
      refreshSelection();
    },
  });
  all.checked = n > 0 && n === c.items.length;
  all.indeterminate = n > 0 && n < c.items.length;

  const rows = c.items.map((item) => {
    const box = h('input', {
      type: 'checkbox',
      class: 'check',
      'data-item': item.id,
      'aria-label': displayName(item),
      checked: selected.has(item.id),
      onchange: (e) => {
        (e.target as HTMLInputElement).checked ? selected.add(item.id) : selected.delete(item.id);
        refreshSelection();
      },
    });
    const tr = h(
      'tr',
      {
        // Clicking anywhere on the row toggles it, like a native list.
        onclick: (e) => {
          const target = e.target as HTMLElement;
          if (target.closest('input, button')) return;
          box.click();
        },
      },
      h('td', { class: 'col-check' }, box),
      h('td', { class: 'col-name', title: item.name }, displayName(item)),
      h('td', { class: 'col-location', title: item.location }, item.location),
      h('td', { class: 'col-date' }, formatDate(item.modified)),
      h('td', { class: 'col-size' }, formatBytes(item.bytes)),
      h(
        'td',
        { class: 'col-action' },
        h(
          'button',
          {
            class: 'reveal',
            type: 'button',
            title: isMac ? 'Show in Finder' : 'Show in File Explorer',
            'aria-label': `Show ${displayName(item)} in ${isMac ? 'Finder' : 'File Explorer'}`,
            onclick: () => api.reveal(item.id),
          },
          glyph('reveal'),
        ),
      ),
    );
    return tr;
  });

  return h(
    'div',
    { class: 'group table-wrap' },
    h(
      'table',
      { class: 'table' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', { class: 'col-check', scope: 'col' }, all),
          h('th', { class: 'col-name', scope: 'col' }, 'Name'),
          h('th', { class: 'col-location', scope: 'col' }, 'Location'),
          h('th', { class: 'col-date', scope: 'col' }, 'Last Changed'),
          h('th', { class: 'col-size', scope: 'col' }, 'Size'),
          h('th', { class: 'col-action', scope: 'col' }, h('span', { class: 'visually-hidden' }, 'Actions')),
        ),
      ),
      h('tbody', {}, ...rows),
    ),
  );
}

function errorView(): HTMLElement {
  return h(
    'section',
    { class: 'empty' },
    glyph('warning', 'empty-mark empty-mark-warning'),
    h('h2', { class: 'empty-title' }, 'The scan didn’t finish'),
    h('p', { class: 'empty-body' }, 'Nothing was changed. Try again, and if it keeps happening, restart Disky.'),
    h('button', { class: 'button button-primary', type: 'button', onclick: startScan }, 'Try Again'),
  );
}

// ─── Scanning ───────────────────────────────────────────────────────────────

async function startScan(): Promise<void> {
  phase = 'scanning';
  scanStep = SCAN_STEPS[0];
  render();
  announce(`Scanning your ${machine}`);
  loadDiskSpace();
  try {
    const found = await api.scan();
    scanStep = null;
    if (!found) {
      // Stopped: keep showing whatever was there before.
      phase = result ? 'results' : 'idle';
      render();
      return;
    }
    result = found;
    selected.clear();
    itemsById.clear();
    cacheIds.clear();
    for (const c of found.categories) {
      for (const item of c.items) {
        itemsById.set(item.id, item);
        if (c.id === 'caches') cacheIds.add(item.id);
        if (c.preselect) selected.add(item.id);
      }
    }
    phase = 'results';
    if (page !== 'overview' && !categoryOf(page)) page = 'overview';
    render();
    announce(`Scan finished. ${formatBytes(selectionBytes())} ready to clear.`);
  } catch {
    scanStep = null;
    phase = 'error';
    render();
  }
}

async function loadDiskSpace(): Promise<void> {
  try {
    space = await api.diskSpace();
    renderSidebar();
    if (page === 'overview' && phase !== 'error') renderContent();
  } catch {
    // Disk figures are a nicety; the rest of the app works without them.
  }
}

// ─── Sheet: confirm → moving → done ─────────────────────────────────────────

const sheet = () => $<HTMLDialogElement>('sheet');
let busy = false;
let progressHandler: ((done: number, total: number, name: string) => void) | null = null;

function openSheet(...children: Array<Node | string>): void {
  const s = sheet();
  s.replaceChildren(...children);
  if (!s.open) s.showModal();
  s.querySelector<HTMLElement>('[data-default]')?.focus();
}

function closeSheet(): void {
  sheet().close();
}

function sheetButtons(...buttons: HTMLElement[]): HTMLElement {
  return h('div', { class: 'sheet-buttons' }, ...buttons);
}

function confirmClean(): void {
  const groups = NAV_ORDER.map((id) => categoryOf(id))
    .filter((c): c is ScanCategory => !!c)
    .map((c) => ({ c, items: selectedIn(c) }))
    .filter((g) => g.items.length > 0);

  openSheet(
    h('h2', { class: 'sheet-title', id: 'sheet-title' }, `Move ${plural(selected.size, 'item')} to the ${trashName}?`),
    h('p', { class: 'sheet-body' }, `You can put them back from the ${trashName} until you empty it. Emptying it frees ${formatBytes(selectionBytes())}.`),
    h(
      'ul',
      { class: 'sheet-list' },
      ...groups.map(({ c, items }) =>
        h(
          'li',
          {},
          tile(CATEGORIES[c.id].glyph, CATEGORIES[c.id].color),
          h('span', {}, `${CATEGORIES[c.id].title}`),
          h('span', { class: 'sheet-list-meta' }, `${plural(items.length, 'item')} · ${formatBytes(items.reduce((s, i) => s + i.bytes, 0))}`),
        ),
      ),
    ),
    sheetButtons(
      h('button', { class: 'button', type: 'button', onclick: closeSheet }, 'Cancel'),
      h('button', { class: 'button button-primary', type: 'button', 'data-default': 'true', onclick: clean }, `Move to ${trashName}`),
    ),
  );
}

async function clean(): Promise<void> {
  const ids = [...selected];
  busy = true;
  const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(ids.length), 'aria-valuenow': '0' }, h('span', {}));
  const current = h('p', { class: 'sheet-body sheet-current' }, '');
  openSheet(h('h2', { class: 'sheet-title', id: 'sheet-title' }, `Moving to the ${trashName}…`), bar, current);

  progressHandler = (done, total, name) => {
    bar.setAttribute('aria-valuenow', String(done));
    (bar.firstElementChild as HTMLElement).style.width = `${total ? (done / total) * 100 : 100}%`;
    current.textContent = done < total ? `${done + 1} of ${total} — ${name}` : 'Finishing…';
  };

  let outcomes: TrashOutcome[];
  try {
    outcomes = await api.trash(ids);
  } catch {
    busy = false;
    progressHandler = null;
    openSheet(
      h('h2', { class: 'sheet-title', id: 'sheet-title' }, 'Something went wrong'),
      h('p', { class: 'sheet-body' }, `Some items may already be in the ${trashName}. Scan again to see what’s left.`),
      sheetButtons(h('button', { class: 'button button-primary', type: 'button', 'data-default': 'true', onclick: () => (closeSheet(), startScan()) }, 'Scan Again')),
    );
    return;
  }
  busy = false;
  progressHandler = null;

  const moved = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const freed = moved.reduce((sum, o) => sum + (itemsById.get(o.id)?.bytes ?? 0), 0);
  const failures = failed.map((o) => {
    const item = itemsById.get(o.id);
    return h('li', {}, h('span', { class: 'failure-name' }, item ? displayName(item) : 'Unknown item'), h('span', { class: 'failure-reason' }, o.error ?? ''));
  });

  removeMoved(new Set(moved.map((o) => o.id)), freed);

  openSheet(
    h(
      'h2',
      { class: 'sheet-title', id: 'sheet-title' },
      moved.length ? `Moved ${plural(moved.length, 'item')} to the ${trashName}` : 'Nothing was moved',
    ),
    h(
      'p',
      { class: 'sheet-body' },
      moved.length ? `Empty the ${trashName} to free ${formatBytes(freed)}.` : 'Your files are unchanged.',
    ),
    failed.length ? h('div', { class: 'failures' }, h('p', { class: 'failures-title' }, `${plural(failed.length, 'item')} couldn’t be moved`), h('ul', {}, ...failures)) : '',
    sheetButtons(
      h('button', { class: 'button', type: 'button', onclick: () => api.openTrash() }, `Open ${trashName}`),
      h('button', { class: 'button button-primary', type: 'button', 'data-default': 'true', onclick: closeSheet }, 'Done'),
    ),
  );
  render();
  announce(moved.length ? `${formatBytes(freed)} moved to the ${trashName}` : 'Nothing was moved');
}

/** Drops moved items from the results so the list matches the disk without a rescan. */
function removeMoved(ids: Set<string>, freed: number): void {
  if (!result) return;
  for (const c of result.categories) {
    if (c.id === 'trash') {
      if (c.bytes !== null) c.bytes += freed;
      continue;
    }
    c.items = c.items.filter((i) => !ids.has(i.id));
    c.bytes = c.items.reduce((sum, i) => sum + i.bytes, 0);
  }
  for (const id of ids) {
    selected.delete(id);
    itemsById.delete(id);
  }
}

// ─── Wiring ─────────────────────────────────────────────────────────────────

function init(): void {
  document.documentElement.classList.add(`platform-${api.platform}`);

  api.onScanProgress((category) => {
    scanStep = category;
    renderSidebar();
    renderToolbar();
    if (page === 'overview' && !result) renderContent();
    announce(`Checking ${CATEGORIES[category].title.toLowerCase()}`);
  });
  api.onTrashProgress((done, total, name) => progressHandler?.(done, total, name));

  $('clean-btn').addEventListener('click', confirmClean);
  // A move in progress can't be interrupted, so Escape does nothing then.
  sheet().addEventListener('cancel', (e) => {
    if (busy) e.preventDefault();
  });
  // However the sheet closes (button or Escape), return focus to where the user was.
  sheet().addEventListener('close', () => $('clean-btn').focus());

  render();
  loadDiskSpace();
}

init();
