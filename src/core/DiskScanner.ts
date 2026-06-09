import { IScanner, type ScanOptions } from '../interfaces/IScanner.js';
import { DiskEntry } from '../types/index.js';
import { macosPlatform, type PlatformServices } from '../platform/macos/index.js';
import { EntryBuilder } from '../scan/EntryBuilder.js';
import { ArtifactScanProvider } from '../scan/ArtifactScanProvider.js';
import { DockerScanProvider } from '../scan/DockerScanProvider.js';
import { LargeDirScanProvider } from '../scan/LargeDirScanProvider.js';
import { ScanOrchestrator } from '../scan/ScanOrchestrator.js';

/**
 * Facade over the scan providers. Preserves the historical `IScanner` surface:
 * `scan(true)` runs the artifact + Docker providers, `scan(false)` runs the
 * large-directory provider. All disk I/O lives behind injected platform
 * services, so the whole pipeline is unit-testable with fakes.
 */
export class DiskScanner implements IScanner {
  private readonly artifactProvider: ArtifactScanProvider;
  private readonly dockerProvider: DockerScanProvider;
  private readonly largeDirProvider: LargeDirScanProvider;

  constructor(platform: PlatformServices = macosPlatform()) {
    const builder = new EntryBuilder(platform.dirSizer);
    this.artifactProvider = new ArtifactScanProvider(
      platform.fileFinder,
      platform.dirSizer,
      builder,
    );
    this.dockerProvider = new DockerScanProvider(platform.dockerClient);
    this.largeDirProvider = new LargeDirScanProvider(platform.fileFinder, builder);
  }

  scan(artifactOnly: boolean, options: ScanOptions = {}): Promise<DiskEntry[]> {
    const providers = artifactOnly
      ? [this.artifactProvider, this.dockerProvider]
      : [this.largeDirProvider];
    return new ScanOrchestrator(providers).scan(options);
  }
}

// Re-exported for backward compatibility (renderers, commands, and tests import
// these from here). The implementations live in core/format.ts.
export { formatBytes, formatAge, abbreviateHome } from './format.js';
