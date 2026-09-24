import { lstat, readdir, readFile } from 'fs/promises';
import type { Stats } from 'fs';
import { execFile } from 'child_process';
import * as os from 'os';
import * as path from 'path';

const DAY = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;

/** Scanner item before the path is stripped for the renderer. */
export interface FoundItem extends ScanItem {
  path: string;
}

export interface FoundCategory {
  id: CategoryId;
  bytes: number | null;
  items: FoundItem[];
}

export interface FoundResult {
  categories: FoundCategory[];
  needsFullDiskAccess: boolean;
  deniedFolders: string[];
}

export interface ScanOptions {
  home?: string;
  platform?: NodeJS.Platform;
  tmpdir?: string;
  env?: NodeJS.ProcessEnv;
  now?: number;
  largeThreshold?: number;
  signal?: AbortSignal;
  onProgress?: (category: CategoryId) => void;
}

type Ctx = Required<Omit<ScanOptions, 'signal' | 'onProgress' | 'platform'>> & {
  signal?: AbortSignal;
  win: boolean;
  nextId: () => string;
  limit: <T>(fn: () => Promise<T>) => Promise<T>;
};

// Opening a package (app, photo library) and trashing a file inside it breaks it.
const PACKAGE_EXT = new Set([
  '.app', '.photoslibrary', '.musiclibrary', '.imovielibrary', '.fcpbundle',
  '.bundle', '.pkg', '.tvlibrary', '.photolibrary', '.aplibrary',
]);

// ─── Sizing ─────────────────────────────────────────────────────────────────

/** Allocated bytes; iCloud-only ("dataless") and sparse files count as what they really occupy. */
function onDisk(st: Stats, win: boolean): number {
  return win ? st.size : st.blocks * 512;
}

function limiter(max: number) {
  let active = 0;
  let head = 0;
  const waiting: Array<(() => void) | undefined> = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    while (active >= max) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      // Index-based dequeue: Array.shift() is O(n) and huge folders queue many waiters.
      const next = waiting[head];
      if (next) {
        waiting[head++] = undefined;
        if (head > 1024 && head * 2 > waiting.length) {
          waiting.splice(0, head);
          head = 0;
        }
        next();
      }
    }
  };
}

/** Like Promise.all(items.map(fn)) but in batches, so a folder with 500k entries doesn't create 500k promises at once. */
async function mapBatched<T, R>(items: T[], fn: (item: T) => Promise<R>, size = 256): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

async function safeLstat(p: string, ctx: Ctx): Promise<Stats | null> {
  try {
    return await ctx.limit(() => lstat(p));
  } catch {
    return null;
  }
}

async function safeReaddir(p: string, ctx: Ctx) {
  try {
    return await ctx.limit(() => readdir(p, { withFileTypes: true }));
  } catch {
    return [];
  }
}

/** Total size of a file or folder. Never follows links; unreadable parts count as 0. */
async function sizeOf(p: string, ctx: Ctx, st?: Stats | null): Promise<number> {
  ctx.signal?.throwIfAborted();
  st ??= await safeLstat(p, ctx);
  if (!st || st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return onDisk(st, ctx.win);
  const entries = await safeReaddir(p, ctx);
  const sizes = await mapBatched(entries, (e) => sizeOf(path.join(p, e.name), ctx));
  return sizes.reduce((a, b) => a + b, onDisk(st, ctx.win));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function friendlyLocation(p: string, home: string): string {
  const parent = path.dirname(p);
  const rel = path.relative(home, parent);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return parent;
  return rel === '' ? 'Home' : rel.split(path.sep).join(' › ');
}

function item(p: string, st: Stats, bytes: number, ctx: Ctx, name = path.basename(p)): FoundItem {
  return {
    id: ctx.nextId(),
    name,
    path: p,
    location: friendlyLocation(p, ctx.home),
    bytes,
    modified: st.mtimeMs,
  };
}

/** Sizes each direct child of `dir` as one item. */
async function childrenAsItems(
  dir: string,
  ctx: Ctx,
  keep: (name: string, st: Stats) => boolean = () => true,
  minBytes = 0,
): Promise<FoundItem[]> {
  const entries = await safeReaddir(dir, ctx);
  const found = await mapBatched(entries, async (e) => {
    const p = path.join(dir, e.name);
    const st = await safeLstat(p, ctx);
    if (!st || st.isSymbolicLink() || !keep(e.name, st)) return null;
    const bytes = await sizeOf(p, ctx, st);
    return bytes >= minBytes ? item(p, st, bytes, ctx) : null;
  });
  return found.filter((i): i is FoundItem => i !== null);
}

function isPermissionError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === 'EPERM' || code === 'EACCES';
}

async function canRead(dir: string): Promise<boolean> {
  try {
    await readdir(dir);
    return true;
  } catch (err) {
    return !isPermissionError(err);
  }
}

function cloudRoots(ctx: Ctx): string[] {
  const { home, env } = ctx;
  if (!ctx.win) {
    return [path.join(home, 'Library', 'Mobile Documents'), path.join(home, 'Library', 'CloudStorage')];
  }
  return [env.OneDrive, env.OneDriveCommercial, env.OneDriveConsumer].filter((p): p is string => !!p);
}

// ─── Categories ─────────────────────────────────────────────────────────────

const isHidden = (name: string) => name.startsWith('.') || name === 'desktop.ini' || name === 'Thumbs.db';

async function oldDownloads(ctx: Ctx): Promise<FoundItem[]> {
  const cutoff = ctx.now - 90 * DAY;
  return childrenAsItems(
    path.join(ctx.home, 'Downloads'),
    ctx,
    (name, st) => !isHidden(name) && st.mtimeMs < cutoff,
  );
}

async function largeFiles(ctx: Ctx, alreadyListed: Set<string>): Promise<FoundItem[]> {
  const { home, win } = ctx;
  const skip = new Set([
    ...cloudRoots(ctx),
    ...alreadyListed,
    path.join(home, win ? 'AppData' : 'Library'),
    path.join(home, 'Apple'), // Windows iTunes backups, reported separately
  ]);
  const skipName = (name: string) =>
    isHidden(name) || PACKAGE_EXT.has(path.extname(name).toLowerCase()) || (win && name.startsWith('OneDrive'));

  const found: FoundItem[] = [];
  const walk = async (dir: string): Promise<void> => {
    ctx.signal?.throwIfAborted();
    const entries = await safeReaddir(dir, ctx);
    await mapBatched(entries, async (e) => {
      const p = path.join(dir, e.name);
      if (skipName(e.name) || skip.has(p) || e.isSymbolicLink()) return;
      if (e.isDirectory()) return walk(p);
      if (!e.isFile()) return;
      const st = await safeLstat(p, ctx);
      if (!st) return;
      const bytes = onDisk(st, win);
      if (bytes >= ctx.largeThreshold) found.push(item(p, st, bytes, ctx));
    });
  };
  await walk(home);
  return found;
}

async function appCaches(ctx: Ctx): Promise<FoundItem[]> {
  if (!ctx.win) {
    return childrenAsItems(path.join(ctx.home, 'Library', 'Caches'), ctx, () => true, MB);
  }
  const local = ctx.env.LOCALAPPDATA ?? path.join(ctx.home, 'AppData', 'Local');
  const browsers: Array<[string, string]> = [
    ['Chrome', path.join(local, 'Google', 'Chrome', 'User Data')],
    ['Edge', path.join(local, 'Microsoft', 'Edge', 'User Data')],
  ];
  const found: FoundItem[] = [];
  for (const [browser, userData] of browsers) {
    for (const profile of await safeReaddir(userData, ctx)) {
      if (!profile.isDirectory() || !/^(Default|Profile \d+)$/.test(profile.name)) continue;
      for (const cache of ['Cache', 'Code Cache', 'GPUCache']) {
        const p = path.join(userData, profile.name, cache);
        const st = await safeLstat(p, ctx);
        if (!st?.isDirectory()) continue;
        const bytes = await sizeOf(p, ctx, st);
        if (bytes >= MB) found.push(item(p, st, bytes, ctx, `${browser} ${cache.toLowerCase()} (${profile.name})`));
      }
    }
  }
  return found;
}

async function tempFiles(ctx: Ctx): Promise<FoundItem[]> {
  // Anything touched in the last day may belong to an app that is running right now.
  const cutoff = ctx.now - DAY;
  return childrenAsItems(
    ctx.tmpdir,
    ctx,
    (_name, st) => (st.isFile() || st.isDirectory()) && st.mtimeMs < cutoff,
    MB,
  );
}

async function backupName(dir: string): Promise<string> {
  try {
    const plist = await readFile(path.join(dir, 'Info.plist'), 'utf8');
    const match = plist.match(/<key>Device Name<\/key>\s*<string>([^<]+)<\/string>/);
    if (match) return `${match[1]} backup`;
  } catch {
    // Unreadable or binary plist: fall back to a generic name.
  }
  return 'iPhone or iPad backup';
}

async function deviceBackups(ctx: Ctx): Promise<FoundItem[]> {
  const roots = ctx.win
    ? [
        path.join(ctx.env.APPDATA ?? path.join(ctx.home, 'AppData', 'Roaming'), 'Apple Computer', 'MobileSync', 'Backup'),
        path.join(ctx.home, 'Apple', 'MobileSync', 'Backup'),
      ]
    : [path.join(ctx.home, 'Library', 'Application Support', 'MobileSync', 'Backup')];
  const found: FoundItem[] = [];
  for (const root of roots) {
    for (const backup of await childrenAsItems(root, ctx, (_n, st) => st.isDirectory())) {
      backup.name = await backupName(backup.path);
      found.push(backup);
    }
  }
  return found;
}

function recycleBinBytes(): Promise<number | null> {
  const script =
    '$s=(New-Object -ComObject Shell.Application).NameSpace(10);' +
    "($s.Items() | ForEach-Object { $_.ExtendedProperty('Size') } | Measure-Object -Sum).Sum";
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 20_000 }, (err, out) => {
      const n = Number(out.trim() || 0);
      resolve(err || Number.isNaN(n) ? null : n);
    });
  });
}

async function trashBytes(ctx: Ctx, readable: boolean): Promise<number | null> {
  if (ctx.win) return recycleBinBytes();
  return readable ? sizeOf(path.join(ctx.home, '.Trash'), ctx) : null;
}

// ─── Entry point ────────────────────────────────────────────────────────────

const byBytes = (a: FoundItem, b: FoundItem) => b.bytes - a.bytes;
const total = (items: FoundItem[]) => items.reduce((sum, i) => sum + i.bytes, 0);

export async function scan(options: ScanOptions = {}): Promise<FoundResult> {
  let counter = 0;
  const platform = options.platform ?? process.platform;
  const ctx: Ctx = {
    home: options.home ?? os.homedir(),
    tmpdir: options.tmpdir ?? os.tmpdir(),
    env: options.env ?? process.env,
    now: options.now ?? Date.now(),
    largeThreshold: options.largeThreshold ?? 500 * MB,
    signal: options.signal,
    win: platform === 'win32',
    nextId: () => String(++counter),
    limit: limiter(64),
  };
  const progress = options.onProgress ?? (() => {});

  // macOS gates these behind Full Disk Access / per-folder consent. Probing them
  // up front also makes macOS show its consent prompts before the long walk.
  let needsFullDiskAccess = false;
  const deniedFolders: string[] = [];
  if (platform === 'darwin') {
    needsFullDiskAccess = !(await canRead(path.join(ctx.home, '.Trash')));
    for (const folder of ['Desktop', 'Documents', 'Downloads']) {
      if (!(await canRead(path.join(ctx.home, folder)))) deniedFolders.push(folder);
    }
  }

  const categories: FoundCategory[] = [];
  const add = (id: CategoryId, items: FoundItem[]) => {
    categories.push({ id, bytes: total(items), items: items.sort(byBytes) });
  };

  progress('downloads');
  const downloads = await oldDownloads(ctx);
  add('downloads', downloads);

  progress('large');
  add('large', await largeFiles(ctx, new Set(downloads.map((d) => d.path))));

  progress('caches');
  add('caches', await appCaches(ctx));

  progress('temp');
  add('temp', await tempFiles(ctx));

  progress('backups');
  add('backups', await deviceBackups(ctx));

  progress('trash');
  categories.push({ id: 'trash', bytes: await trashBytes(ctx, !needsFullDiskAccess), items: [] });

  return { categories, needsFullDiskAccess, deniedFolders };
}
