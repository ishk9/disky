/** macOS implementations of the platform interfaces. */
import { DuDirSizer } from './DuDirSizer.js';
import { FindFileFinder } from './FindFileFinder.js';
import { MacDockerClient } from './MacDockerClient.js';
import { MacAppRegistry } from './MacAppRegistry.js';
import { MacSudoRunner } from './MacSudoRunner.js';
import type { IDirSizer } from '../IDirSizer.js';
import type { IFileFinder } from '../IFileFinder.js';
import type { IDockerClient } from '../IDockerClient.js';
import type { IAppRegistry } from '../IAppRegistry.js';
import type { ISudoRunner } from '../ISudoRunner.js';

export { DuDirSizer } from './DuDirSizer.js';
export { FindFileFinder } from './FindFileFinder.js';
export { MacDockerClient, parseDockerSize } from './MacDockerClient.js';
export { MacAppRegistry } from './MacAppRegistry.js';
export { MacSudoRunner } from './MacSudoRunner.js';

/** The platform services disky depends on, bundled for injection. */
export interface PlatformServices {
  dirSizer: IDirSizer;
  fileFinder: IFileFinder;
  dockerClient: IDockerClient;
  appRegistry: IAppRegistry;
  sudoRunner: ISudoRunner;
}

/** Default macOS platform services. */
export function macosPlatform(): PlatformServices {
  return {
    dirSizer: new DuDirSizer(),
    fileFinder: new FindFileFinder(),
    dockerClient: new MacDockerClient(),
    appRegistry: new MacAppRegistry(),
    sudoRunner: new MacSudoRunner(),
  };
}
