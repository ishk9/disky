import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
import { NodeModulesDetector } from './NodeModulesDetector';
import { NextDetector } from './NextDetector';
import { NuxtDetector } from './NuxtDetector';
import { DistDetector } from './DistDetector';
import { BuildDetector } from './BuildDetector';
import { OutDetector } from './OutDetector';
import { TurboDetector } from './TurboDetector';
import { CacheDetector } from './CacheDetector';
import { GradleDetector } from './GradleDetector';
import { MavenDetector } from './MavenDetector';
import { XcodeDetector } from './XcodeDetector';
import { CocoaPodsDetector } from './CocoaPodsDetector';
import { PnpmStoreDetector } from './PnpmStoreDetector';
import { BunCacheDetector } from './BunCacheDetector';

/**
 * Registry (Singleton) that holds all artifact detectors and applies the Strategy
 * pattern: the first detector whose canDetect() returns true wins.
 *
 * Ordering matters — more specific detectors (path-based like Gradle, Maven, Xcode)
 * must come before generic name-only ones to avoid false matches.
 */
export class ArtifactDetectorRegistry {
  private static instance: ArtifactDetectorRegistry;
  private readonly detectors: IArtifactDetector[];

  private constructor() {
    this.detectors = [
      // Path-specific detectors first (they check both name + path)
      new GradleDetector(),
      new MavenDetector(),
      new XcodeDetector(),
      new PnpmStoreDetector(),
      new BunCacheDetector(),
      // Name-only detectors
      new NodeModulesDetector(),
      new NextDetector(),
      new NuxtDetector(),
      new DistDetector(),
      new BuildDetector(),
      new OutDetector(),
      new TurboDetector(),
      new CacheDetector(),
      new CocoaPodsDetector(),
    ];
  }

  static getInstance(): ArtifactDetectorRegistry {
    if (!ArtifactDetectorRegistry.instance) {
      ArtifactDetectorRegistry.instance = new ArtifactDetectorRegistry();
    }
    return ArtifactDetectorRegistry.instance;
  }

  /**
   * Prepends a custom detector at the front of the chain (highest priority).
   * Useful for extending the registry at runtime.
   */
  register(detector: IArtifactDetector): void {
    this.detectors.unshift(detector);
  }

  /**
   * Returns the first matching ArtifactTypeInfo or null if no detector matches.
   */
  resolve(dirName: string, fullPath: string): ArtifactTypeInfo | null {
    for (const detector of this.detectors) {
      if (detector.canDetect(dirName, fullPath)) {
        return detector.detect(dirName, fullPath);
      }
    }
    return null;
  }

  /**
   * Returns all directory basenames that name-only detectors recognise.
   * Used by DiskScanner to build the `find` command filter expression.
   */
  getKnownDirNames(): string[] {
    const names = new Set<string>();
    for (const detector of this.detectors) {
      // Query each detector with only a name (empty path) to see if it matches by name alone
      const probeNames: string[] = [
        'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
        '.turbo', '.cache', 'Pods', 'DerivedData',
        // Path-based ones need separate handling; include their target basenames too
        'caches',       // Gradle
        'repository',   // Maven
        // Note: pnpm (.pnpm-store, store) and bun (cache) are discovered via
        // explicit fs.existsSync checks in DiskScanner.findArtifactPaths() — their
        // basenames are too generic for the find filter and their path-based detectors
        // won't match name-only probes.
      ];
      for (const name of probeNames) {
        if (detector.canDetect(name, name)) {
          names.add(name);
        }
      }
    }
    return [...names];
  }
}
