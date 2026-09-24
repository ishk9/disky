import * as path from 'path';
import type { FoundResult } from './scanner';

/**
 * Remembers which paths the last scan found. The renderer only ever sends item
 * IDs back, so it can never ask us to trash a path the scan did not report.
 */
export class TrashList {
  private paths = new Map<string, string>();
  private names = new Map<string, string>();

  /** Stores the scan's paths and returns the result without them, for the renderer. */
  load(result: FoundResult): ScanResult {
    this.paths.clear();
    this.names.clear();
    return {
      ...result,
      categories: result.categories.map((c) => ({
        ...c,
        items: c.items.map(({ path: p, ...rest }) => {
          this.paths.set(rest.id, p);
          this.names.set(rest.id, rest.name);
          return rest;
        }),
      })),
    };
  }

  pathOf(id: string): string | undefined {
    return this.paths.get(id);
  }

  /** Moves each item to the OS trash, one at a time, reporting every outcome. */
  async trash(
    ids: string[],
    trashItem: (p: string) => Promise<void>,
    onProgress: (done: number, total: number, name: string) => void = () => {},
  ): Promise<TrashOutcome[]> {
    const outcomes: TrashOutcome[] = [];
    for (const [i, id] of ids.entries()) {
      const p = this.paths.get(id);
      onProgress(i, ids.length, this.names.get(id) ?? '');
      if (!p) {
        outcomes.push({ id, ok: false, error: 'This item is no longer in the list. Scan again.' });
        continue;
      }
      try {
        await trashItem(path.resolve(p));
        this.paths.delete(id);
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
