import { DiskEntry } from '../types/index.js';
import { IDockerClient } from '../platform/IDockerClient.js';
import { MacDockerClient } from '../platform/macos/MacDockerClient.js';
import {
  ICleaner,
  CleanOptions,
  RemovalResult,
  removalFailure,
  removalSuccess,
} from './ICleaner.js';

/** Prunes reclaimable Docker resources for a Docker pseudo-entry. */
export class DockerCleaner implements ICleaner {
  readonly name = 'docker';

  constructor(private readonly docker: IDockerClient = new MacDockerClient()) {}

  canClean(entry: DiskEntry): boolean {
    return entry.isDockerEntry;
  }

  clean(entry: DiskEntry, _opts: CleanOptions): RemovalResult {
    return this.docker.prune() ? removalSuccess(entry) : removalFailure(entry);
  }
}
