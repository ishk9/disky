/** macOS implementations of the platform interfaces. */
import { DuDirSizer } from './DuDirSizer.js';
import { FindFileFinder } from './FindFileFinder.js';
import { MacDockerClient } from './MacDockerClient.js';
import type { IDirSizer } from '../IDirSizer.js';
import type { IFileFinder } from '../IFileFinder.js';
import type { IDockerClient } from '../IDockerClient.js';

export { DuDirSizer } from './DuDirSizer.js';
export { FindFileFinder } from './FindFileFinder.js';
export { MacDockerClient, parseDockerSize } from './MacDockerClient.js';

/** The platform services disky depends on, bundled for injection. */
export interface PlatformServices {
  dirSizer: IDirSizer;
  fileFinder: IFileFinder;
  dockerClient: IDockerClient;
}

/** Default macOS platform services. */
export function macosPlatform(): PlatformServices {
  return {
    dirSizer: new DuDirSizer(),
    fileFinder: new FindFileFinder(),
    dockerClient: new MacDockerClient(),
  };
}
