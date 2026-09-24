import { lstat } from 'fs/promises';
import * as path from 'path';
import type { FoundResult } from './scanner';

interface Entry {
  path: string;
  ino: number;
  name: string;
}

/**
 * Remembers which paths the last scan found. The renderer only ever sends item
 * IDs back, so it can never ask us to trash a path the scan did not report.
 */
export class TrashList {
  private entries = new Map<string, Entry>();

  /** Stores the scan's paths and returns the result without them, for the renderer. */
  load(result: FoundResult): ScanResult {
    this.entries.clear();
    return {
      ...result,
      categories: result.categories.map((c) => ({
        ...c,
        items: c.items.map(({ path: p, ino, ...rest }) => {
          this.entries.set(rest.id, { path: p, ino, name: rest.name });
          return rest;
        }),
      })),
    };
  }

  pathOf(id: string): string | undefined {
    return this.entries.get(id)?.path;
  }

  /** Moves each item to the OS trash, one at a time, reporting every outcome. */
  async trash(
    ids: string[],
    trashItem: (p: string) => Promise<void>,
    onProgress: (done: number, total: number, name: string) => void = () => {},
  ): Promise<TrashOutcome[]> {
    const outcomes: TrashOutcome[] = [];
    for (const [i, id] of ids.entries()) {
      const entry = this.entries.get(id);
      onProgress(i, ids.length, entry?.name ?? '');
      if (!entry) {
        outcomes.push({ id, ok: false, error: 'This item is no longer in the list. Scan again.' });
        continue;
      }
      try {
        const p = path.resolve(entry.path);
        // Something else may now live at this path; only trash what the user saw.
        if ((await lstat(p)).ino !== entry.ino) {
          outcomes.push({ id, ok: false, error: 'It changed since the scan. Scan again to see it.' });
          continue;
        }
        await trashItem(p);
        this.entries.delete(id);
        outcomes.push({ id, ok: true });
      } catch (err) {
        outcomes.push({ id, ok: false, error: friendlyError(err) });
      }
    }
    onProgress(ids.length, ids.length, '');
    return outcomes;
  }
}

function friendlyError(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  if (/busy|in use|being used|EBUSY|sharing violation/i.test(msg)) return 'It’s in use. Close the app using it and try again.';
  if (/permission|denied|EPERM|EACCES/i.test(msg)) return 'Disky isn’t allowed to move this.';
  if (/no such file|ENOENT|cannot find/i.test(msg)) return 'It was already moved or deleted.';
  return 'It couldn’t be moved to the Trash.';
}
