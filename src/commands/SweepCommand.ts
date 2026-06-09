import { ICommand } from '../interfaces/ICommand.js';
import { macosPlatform } from '../platform/macos/index.js';
import { sweepProviders } from '../scan/sweepSources.js';
import { runScanCleanFlow, ScanCleanOptions } from './scanCleanFlow.js';

/**
 * `disky sweep` — reclaims space from system/app caches, logs, and trash.
 * Mirrors `mo clean`, reusing disky's scan/clean/audit foundation.
 */
export class SweepCommand implements ICommand {
  constructor(private readonly options: ScanCleanOptions = {}) {}

  async execute(): Promise<void> {
    const platform = macosPlatform();
    await runScanCleanFlow(sweepProviders(platform.dirSizer), this.options, {
      title: '🧹 disky sweep',
      subtitle: 'caches · logs · trash',
      op: 'sweep',
      verb: 'Sweep',
      emptyMessage: 'Nothing to sweep.',
    });
  }
}
