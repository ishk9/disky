import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scan, FoundResult } from './scanner';

const KB = 1024;
const MB = 1024 * KB;
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function fixture(): { home: string; tmp: string; done: () => void } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'disky-test-'));
  const home = path.join(root, 'home');
  const tmp = path.join(root, 'tmp');
  for (const d of ['Downloads', 'Desktop', 'Documents', '.Trash', 'Library/Caches']) {
    mkdirSync(path.join(home, d), { recursive: true });
  }
  mkdirSync(tmp);
  return { home, tmp, done: () => rmSync(root, { recursive: true, force: true }) };
}

function file(p: string, bytes: number, ageDays = 0): string {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, Buffer.alloc(bytes, 1));
  age(p, ageDays);
  return p;
}

function age(p: string, days: number): void {
  const t = new Date(NOW - days * DAY);
  utimesSync(p, t, t);
}

const run = (home: string, tmp: string, extra = {}) =>
  scan({ home, tmpdir: tmp, platform: 'darwin', now: NOW, largeThreshold: MB, ...extra });

const names = (r: FoundResult, id: CategoryId) => r.categories.find((c) => c.id === id)!.items.map((i) => i.name);
const category = (r: FoundResult, id: CategoryId) => r.categories.find((c) => c.id === id)!;

test('folder size is the sum of allocated file sizes', async () => {
  const f = fixture();
  try {
    const dir = path.join(f.home, 'Library/Caches/com.example.app');
    file(path.join(dir, 'a'), 2 * MB);
    file(path.join(dir, 'nested/b'), 3 * MB);
    const r = await run(f.home, f.tmp);
    const cache = category(r, 'caches').items[0];
    assert.equal(cache.name, 'com.example.app');
    // Allocated size rounds up to filesystem blocks and includes directory entries.
    assert.ok(cache.bytes >= 5 * MB && cache.bytes < 5 * MB + 64 * KB, `got ${cache.bytes}`);
  } finally {
    f.done();
  }
});

test('symlinks are neither followed nor counted', async () => {
  const f = fixture();
  try {
    const outside = file(path.join(f.tmp, '..', 'outside.bin'), 4 * MB);
    const dir = path.join(f.home, 'Library/Caches/linky');
    file(path.join(dir, 'real'), 2 * MB);
    symlinkSync(outside, path.join(dir, 'link'));
    symlinkSync(outside, path.join(f.home, 'Documents', 'big-link'));
    const r = await run(f.home, f.tmp);
    assert.ok(category(r, 'caches').items[0].bytes < 3 * MB);
    assert.deepEqual(names(r, 'large'), []);
  } finally {
    f.done();
  }
});

test('unreadable folders are skipped and the scan completes', async () => {
  const f = fixture();
  const locked = path.join(f.home, 'Documents', 'locked');
  try {
    file(path.join(locked, 'secret.bin'), 2 * MB);
    file(path.join(f.home, 'Documents', 'open.bin'), 2 * MB);
    chmodSync(locked, 0o000);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'large'), ['open.bin']);
  } finally {
    chmodSync(locked, 0o755);
    f.done();
  }
});

test('old downloads: 91 days old included, 89 days excluded', async () => {
  const f = fixture();
  try {
    file(path.join(f.home, 'Downloads', 'old.zip'), KB, 91);
    file(path.join(f.home, 'Downloads', 'recent.zip'), KB, 89);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'downloads'), ['old.zip']);
  } finally {
    f.done();
  }
});

test('large files: threshold compares allocated bytes', async () => {
  const f = fixture();
  try {
    file(path.join(f.home, 'Documents', 'exact.bin'), MB);
    file(path.join(f.home, 'Documents', 'under.bin'), MB - 8 * KB);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'large'), ['exact.bin']);
  } finally {
    f.done();
  }
});

test('sparse files count as the space they really use', async () => {
  const f = fixture();
  try {
    const p = path.join(f.home, 'Documents', 'sparse.bin');
    writeFileSync(p, '');
    truncateSync(p, 10 * MB);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'large'), []);
  } finally {
    f.done();
  }
});

test('large files inside packages and cloud folders are not reported', async () => {
  const f = fixture();
  try {
    file(path.join(f.home, 'Pictures', 'Photos Library.photoslibrary', 'originals', 'IMG.heic'), 2 * MB);
    file(path.join(f.home, 'Applications', 'Big.app', 'Contents', 'binary'), 2 * MB);
    file(path.join(f.home, 'Library', 'CloudStorage', 'Drive', 'video.mov'), 2 * MB);
    file(path.join(f.home, 'Movies', 'trip.mov'), 2 * MB);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'large'), ['trip.mov']);
  } finally {
    f.done();
  }
});

test('each download appears in exactly one category', async () => {
  const f = fixture();
  try {
    file(path.join(f.home, 'Downloads', 'new-installer.dmg'), 2 * MB, 1);
    file(path.join(f.home, 'Downloads', 'old-installer.dmg'), 2 * MB, 100);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'large'), ['new-installer.dmg']);
    assert.deepEqual(names(r, 'downloads'), ['old-installer.dmg']);
  } finally {
    f.done();
  }
});

test('temp files touched in the last day are left alone', async () => {
  const f = fixture();
  try {
    file(path.join(f.tmp, 'fresh.log'), 2 * MB);
    age(path.join(f.tmp, 'fresh.log'), 1 / 24);
    file(path.join(f.tmp, 'stale.log'), 2 * MB, 2);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'temp'), ['stale.log']);
  } finally {
    f.done();
  }
});

test('missing folders give empty categories, not errors', async () => {
  const f = fixture();
  try {
    rmSync(path.join(f.home, 'Library'), { recursive: true });
    rmSync(path.join(f.home, 'Downloads'), { recursive: true });
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'caches'), []);
    assert.deepEqual(names(r, 'downloads'), []);
    assert.deepEqual(names(r, 'backups'), []);
  } finally {
    f.done();
  }
});

test('device backups use the device name from Info.plist', async () => {
  const f = fixture();
  try {
    const b = path.join(f.home, 'Library/Application Support/MobileSync/Backup/00008030-ABC');
    file(path.join(b, 'data'), 2 * MB);
    writeFileSync(
      path.join(b, 'Info.plist'),
      '<plist><dict><key>Device Name</key>\n<string>Asha’s iPhone</string></dict></plist>',
    );
    const r = await run(f.home, f.tmp);
    assert.deepEqual(names(r, 'backups'), ['Asha’s iPhone backup']);
  } finally {
    f.done();
  }
});

test('unreadable Trash flags Full Disk Access and reports unknown size', async () => {
  const f = fixture();
  const trash = path.join(f.home, '.Trash');
  try {
    file(path.join(trash, 'x'), MB);
    let r = await run(f.home, f.tmp);
    assert.equal(r.needsFullDiskAccess, false);
    assert.ok((category(r, 'trash').bytes ?? 0) >= MB);

    chmodSync(trash, 0o000);
    r = await run(f.home, f.tmp);
    assert.equal(r.needsFullDiskAccess, true);
    assert.equal(category(r, 'trash').bytes, null);
  } finally {
    chmodSync(trash, 0o755);
    f.done();
  }
});

test('unreadable Downloads is reported as a denied folder', async () => {
  const f = fixture();
  const downloads = path.join(f.home, 'Downloads');
  try {
    chmodSync(downloads, 0o000);
    const r = await run(f.home, f.tmp);
    assert.deepEqual(r.deniedFolders, ['Downloads']);
  } finally {
    chmodSync(downloads, 0o755);
    f.done();
  }
});

test('aborting stops the scan', async () => {
  const f = fixture();
  try {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(run(f.home, f.tmp, { signal: controller.signal }), { name: 'AbortError' });
  } finally {
    f.done();
  }
});
