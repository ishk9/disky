/**
 * Platform abstraction barrel. Interfaces here isolate every OS/shell call so
 * the domain layer depends on contracts, not on `du`/`find`/`docker`. macOS
 * implementations live in `./macos`. See CONTRIBUTING.md (architecture).
 */
export type { IDirSizer, ChildSize } from './IDirSizer.js';
export type { IFileFinder, FindDirsOptions, LargeDirsOptions } from './IFileFinder.js';
export type { IDockerClient, DockerStats } from './IDockerClient.js';
