import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TrashList } from './trash';
import type { FoundResult } from './scanner';

/** Real files, so the identity check before trashing has something to compare. */
function setup(...names: string[]) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'disky-trash-'));
  const paths = names.map((n) => {
    const p = path.join(dir, n);
    writeFileSync(p, n);
    return p;
  });
  return { paths, done: () => rmSync(dir, { recursive: true, force: true }) };
}

const result = (...items: Array<[string, string]>): FoundResult => ({
  needsFullDiskAccess: false,
  deniedFolders: [],
  categories: [
    {
      id: 'large',
      bytes: 0,
      preselect: false,
      items: items.map(([id, p]) => ({
        id,
        path: p,
        ino: lstatSync(p).ino,
        name: path.basename(p),
        location: 'Home',
        bytes: 1,
        modified: 0,
      })),
    },
  ],
});

test('renderer copy has no paths', () => {
  const f = setup('a.mov');
  try {
    const list = new TrashList();
    const safe = list.load(result(['1', f.paths[0]]));
    assert.equal('path' in safe.categories[0].items[0], false);
    assert.equal('ino' in safe.categories[0].items[0], false);
    assert.equal(list.pathOf('1'), f.paths[0]);
  } finally {
    f.done();
  }
});

test('unknown ids and ids from an earlier scan are refused', async () => {
  const f = setup('a.mov', 'b.mov');
  try {
    const list = new TrashList();
    list.load(result(['1-1', f.paths[0]]));
    list.load(result(['2-1', f.paths[1]]));
    const trashed: string[] = [];
    const out = await list.trash(['1-1', '99', '2-1'], async (p) => void trashed.push(p));
    assert.deepEqual(trashed, [f.paths[1]]);
    assert.deepEqual(out.map((o) => o.ok), [false, false, true]);
  } finally {
    f.done();
  }
});

test('one failing item does not stop the rest', async () => {
  const f = setup('a', 'b', 'c');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]], ['2', f.paths[1]], ['3', f.paths[2]]));
    const out = await list.trash(['1', '2', '3'], async (p) => {
      if (p.endsWith('b')) throw new Error('EBUSY: resource busy or locked');
    });
    assert.deepEqual(out.map((o) => o.ok), [true, false, true]);
    assert.match(out[1].error!, /in use/);
  } finally {
    f.done();
  }
});

test('failure reasons are explained in plain words', async () => {
  const f = setup('a', 'b', 'c');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]], ['2', f.paths[1]], ['3', f.paths[2]]));
    const errors: Record<string, string> = {
      a: 'EACCES: permission denied',
      b: 'ENOENT: no such file or directory',
      c: 'Failed to create FileOperation instance',
    };
    const out = await list.trash(['1', '2', '3'], async (p) => {
      throw new Error(errors[path.basename(p)]);
    });
    assert.match(out[0].error!, /isn’t allowed/);
    assert.match(out[1].error!, /already moved/);
    assert.match(out[2].error!, /couldn’t be moved/);
  } finally {
    f.done();
  }
});

test('an item replaced since the scan is not trashed', async () => {
  const f = setup('a.mov');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]]));
    rmSync(f.paths[0]);
    writeFileSync(path.join(path.dirname(f.paths[0]), 'filler'), 'x'); // keep the old inode from being reused
    writeFileSync(f.paths[0], 'someone else’s file');
    let calls = 0;
    const out = await list.trash(['1'], async () => void calls++);
    assert.equal(calls, 0);
    assert.match(out[0].error!, /changed since the scan/);
  } finally {
    f.done();
  }
});

test('an item that vanished is reported, not an error', async () => {
  const f = setup('a.mov');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]]));
    rmSync(f.paths[0]);
    const out = await list.trash(['1'], async () => {});
    assert.match(out[0].error!, /already moved or deleted/);
  } finally {
    f.done();
  }
});

test('an item cannot be trashed twice', async () => {
  const f = setup('a');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]]));
    let calls = 0;
    await list.trash(['1'], async () => void calls++);
    const again = await list.trash(['1'], async () => void calls++);
    assert.equal(calls, 1);
    assert.equal(again[0].ok, false);
  } finally {
    f.done();
  }
});

test('progress reports each item then completion', async () => {
  const f = setup('a.mov', 'b.mov');
  try {
    const list = new TrashList();
    list.load(result(['1', f.paths[0]], ['2', f.paths[1]]));
    const seen: string[] = [];
    await list.trash(['1', '2'], async () => {}, (done, total, name) => seen.push(`${done}/${total} ${name}`));
    assert.deepEqual(seen, ['0/2 a.mov', '1/2 b.mov', '2/2 ']);
  } finally {
    f.done();
  }
});
