import * as os from 'os';
import * as path from 'path';
import { ICommand } from '../interfaces/ICommand.js';
import { InstallerScanProvider } from '../scan/InstallerScanProvider.js';
import { runScanCleanFlow, ScanCleanOptions } from './scanCleanFlow.js';

/**
 * `disky installer` — finds and removes installer files (.dmg/.pkg/.iso) left
 * in Downloads, Desktop, and the Homebrew download cache. Mirrors `mo installer`.
 */
export class InstallerCommand implements ICommand {
  constructor(private readonly options: ScanCleanOptions = {}) {}

  async execute(): Promise<void> {
    const home = os.homedir();
    const dirs = [
      path.join(home, 'Downloads'),
      path.join(home, 'Desktop'),
      path.join(home, 'Library', 'Caches', 'Homebrew', 'downloads'),
    ];
    await runScanCleanFlow([new InstallerScanProvider(dirs)], this.options, {
      title: '📦 disky installer',
      subtitle: 'Downloads · Desktop · Homebrew',
      op: 'installer',
      verb: 'Remove',
      emptyMessage: 'No installer files found.',
    });
  }
}
