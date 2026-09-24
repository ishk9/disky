import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import { TrashList } from './trash';
import type { FoundResult } from './scanner';

const result = (...items: Array<[string, string]>): FoundResult => ({
  needsFullDiskAccess: false,
  deniedFolders: [],
  categories: [
    {
      id: 'large',
      bytes: 0,
      items: items.map(([id, p]) => ({ id, path: p, name: path.basename(p), location: 'Home', bytes: 1, modified: 0 })),
    },
  ],
});

test('renderer copy has no paths', () => {
  const list = new TrashList();
  const safe = list.load(result(['1', '/home/a.mov']));
  assert.equal('path' in safe.categories[0].items[0], false);
  assert.equal(list.pathOf('1'), '/home/a.mov');
});

test('unknown ids and ids from an earlier scan are refused', async () => {
  const list = new TrashList();
  list.load(result(['1', '/home/a.mov']));
  list.load(result(['2', '/home/b.mov']));
  const trashed: string[] = [];
  const out = await list.trash(['1', '99', '2'], async (p) => void trashed.push(p));
  assert.deepEqual(trashed, [path.resolve('/home/b.mov')]);
  assert.deepEqual(out.map((o) => o.ok), [false, false, true]);
});

test('one failing item does not stop the rest', async () => {
  const list = new TrashList();
  list.load(result(['1', '/a'], ['2', '/b'], ['3', '/c']));
  const out = await list.trash(['1', '2', '3'], async (p) => {
    if (p.endsWith('b')) throw new Error('EBUSY: resource busy or locked');
  });
  assert.deepEqual(out.map((o) => o.ok), [true, false, true]);
  assert.match(out[1].error!, /in use/);
});

test('an item cannot be trashed twice', async () => {
  const list = new TrashList();
  list.load(result(['1', '/a']));
  let calls = 0;
  await list.trash(['1'], async () => void calls++);
  const again = await list.trash(['1'], async () => void calls++);
  assert.equal(calls, 1);
  assert.equal(again[0].ok, false);
});

test('progress reports each item then completion', async () => {
  const list = new TrashList();
  list.load(result(['1', '/a.mov'], ['2', '/b.mov']));
  const seen: string[] = [];
  await list.trash(['1', '2'], async () => {}, (done, total, name) => seen.push(`${done}/${total} ${name}`));
  assert.deepEqual(seen, ['0/2 a.mov', '1/2 b.mov', '2/2 ']);
});
