import { ICommand } from '../interfaces/ICommand.js';
import { DiskEntry, ArtifactTypeInfo } from '../types/index.js';
import { MacAppRegistry } from '../platform/macos/MacAppRegistry.js';
import type { IAppRegistry } from '../platform/IAppRegistry.js';
import type { IDirSizer } from '../platform/IDirSizer.js';
import { macosPlatform } from '../platform/macos/index.js';
import { isSystemPath } from '../clean/AppUninstaller.js';
import { makeEntry } from '../scan/makeEntry.js';
import { CleanService } from '../clean/CleanService.js';
import type { RemovalResult } from '../clean/ICleaner.js';
import { promptConfirm } from '../core/EntryResolver.js';
import { Colors } from '../renderers/Colors.js';
import { formatBytes } from '../core/format.js';

interface UninstallCommandOptions {
  query: string;
  dryRun?: boolean;
  json?: boolean;
  force?: boolean;
  execute?: boolean;
}

const APP_ARTIFACT: ArtifactTypeInfo = {
  label: 'app',
  color: 'magenta',
  safeToClean: true,
  cleanPolicy: 'auto',
};

/**
 * `disky uninstall <app>` — removes an app bundle plus its remnants (caches,
 * preferences, containers, launch agents, …). Mirrors `mo uninstall`. Refuses
 * system-owned apps and requires explicit confirmation.
 */
export class UninstallCommand implements ICommand {
  constructor(
    private readonly options: UninstallCommandOptions,
    private readonly registry: IAppRegistry = new MacAppRegistry(),
    private readonly cleanService: Pick<CleanService, 'clean'> = new CleanService(),
    private readonly dirSizer: IDirSizer = macosPlatform().dirSizer,
  ) {}

  async execute(): Promise<void> {
    const dryRun = this.options.dryRun ?? !this.options.execute;
    const app = this.registry.find(this.options.query);
    if (!app) {
      console.log(`\n  ${Colors.error(`No installed app matching "${this.options.query}".`)}\n`);
      return;
    }
    if (isSystemPath(app.appPath)) {
      console.log(`\n  ${Colors.error(`Refusing to uninstall system app at ${app.appPath}.`)}\n`);
      return;
    }

    const remnants = this.registry.remnants(app);
    const paths = [app.appPath, ...remnants.map((r) => r.path)];
    const sizes = await this.dirSizer.sizes(paths);

    const entries: DiskEntry[] = [
      makeEntry({
        absPath: app.appPath,
        sizeBytes: sizes.get(app.appPath) ?? 0,
        category: 'app',
        artifactType: { ...APP_ARTIFACT, label: app.name },
      }),
      ...remnants.map((r) =>
        makeEntry({
          absPath: r.path,
          sizeBytes: sizes.get(r.path) ?? 0,
          category: 'app',
          artifactType: { ...APP_ARTIFACT, label: r.kind, color: 'gray' },
        }),
      ),
    ];
    entries.forEach((e, i) => {
      e.id = i + 1;
    });
    const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);

    const json = this.options.json ?? !process.stdout.isTTY;
    if (dryRun) {
      for (const entry of entries) {
        this.cleanService.clean(entry, { force: this.options.force, dryRun: true }, 'uninstall');
      }
      if (json) {
        process.stdout.write(JSON.stringify({ dryRun, app, totalBytes, entries }, null, 2) + '\n');
        return;
      }
    }

    if (!json) {
      console.log(`\n  ${Colors.brand('🗑️  disky uninstall')}  ${Colors.directory(app.name)}`);
      console.log(`  ${Colors.dim(app.bundleId ?? app.appPath)}\n`);
      for (const e of entries) {
        console.log(
          `  ${Colors.size(e.sizeHuman.padStart(9))}  ${Colors.dim(e.artifactType.label.padEnd(20))} ${e.displayPath}`,
        );
      }
      console.log(
        `\n  ${Colors.dim(`${entries.length} items · ${formatBytes(totalBytes)} total`)}\n`,
      );
    }

    if (dryRun) {
      console.log(
        `  ${Colors.prompt('[DRY RUN]')} Would remove the above. No files were modified.\n`,
      );
      return;
    }

    if (!json) {
      const confirmed = await promptConfirm(
        `  ${Colors.error(`Permanently remove ${app.name} and ${remnants.length} associated ${remnants.length === 1 ? 'file' : 'files'}? [y/N]`)} `,
      );
      if (!confirmed) {
        console.log(`\n  ${Colors.dim('Aborted.')}\n`);
        return;
      }
    }

    let freed = 0;
    let failed = 0;
    const results: RemovalResult[] = [];
    for (const entry of entries) {
      const result = this.cleanService.clean(entry, { force: this.options.force }, 'uninstall');
      results.push(result);
      if (result.success) freed += result.bytesFreed;
      else failed++;
    }

    if (json) {
      process.stdout.write(
        JSON.stringify(
          {
            dryRun: false,
            app,
            totalBytes,
            entries,
            results,
            freedBytes: freed,
            failedCount: failed,
          },
          null,
          2,
        ) + '\n',
      );
      return;
    }

    console.log(`\n  ${Colors.success(`✓ Removed ${app.name} · freed ${formatBytes(freed)}`)}`);
    if (failed > 0) {
      console.log(
        `  ${Colors.error(`✗ ${failed} ${failed === 1 ? 'item' : 'items'} could not be removed (may need admin rights)`)}`,
      );
    }
    console.log('');
  }
}
