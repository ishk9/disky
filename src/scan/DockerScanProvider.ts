import { DiskEntry, ArtifactTypeInfo } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import type { IDockerClient, DockerStats } from '../platform/IDockerClient.js';
import { formatBytes } from '../core/format.js';
import { IScanProvider } from './IScanProvider.js';

/** Surfaces reclaimable Docker resources as a single pseudo-entry. */
export class DockerScanProvider implements IScanProvider {
  readonly category = 'docker' as const;

  constructor(private readonly docker: IDockerClient) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    opts.onProgress?.({ phase: 'docker', scanned: 0, total: 0, found: 0 });
    const stats = this.docker.stats();
    if (!stats || stats.reclaimableBytes === 0) return [];
    return [buildDockerEntry(stats)];
  }
}

function buildDockerEntry(stats: DockerStats): DiskEntry {
  const dockerArtifact: ArtifactTypeInfo = {
    label: 'Docker',
    color: 'blue',
    safeToClean: true,
    cleanPolicy: 'auto',
  };

  return {
    id: 0,
    category: 'docker',
    sizeBytes: stats.reclaimableBytes,
    sizeHuman: formatBytes(stats.reclaimableBytes),
    artifactType: dockerArtifact,
    absolutePath: '__docker__',
    displayPath: `overlay2 (${stats.summary})`,
    project: null,
    directory: null,
    gitBranch: null,
    ageMs: 0,
    ageHuman: '–',
    isDockerEntry: true,
    dockerSummary: stats.summary,
    topOffenders: [],
  };
}
