"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactDetectorRegistry = void 0;
const NodeModulesDetector_1 = require("./NodeModulesDetector");
const NextDetector_1 = require("./NextDetector");
const NuxtDetector_1 = require("./NuxtDetector");
const DistDetector_1 = require("./DistDetector");
const BuildDetector_1 = require("./BuildDetector");
const OutDetector_1 = require("./OutDetector");
const TurboDetector_1 = require("./TurboDetector");
const CacheDetector_1 = require("./CacheDetector");
const GradleDetector_1 = require("./GradleDetector");
const MavenDetector_1 = require("./MavenDetector");
const XcodeDetector_1 = require("./XcodeDetector");
const CocoaPodsDetector_1 = require("./CocoaPodsDetector");
/**
 * Registry (Singleton) that holds all artifact detectors and applies the Strategy
 * pattern: the first detector whose canDetect() returns true wins.
 *
 * Ordering matters — more specific detectors (path-based like Gradle, Maven, Xcode)
 * must come before generic name-only ones to avoid false matches.
 */
class ArtifactDetectorRegistry {
    constructor() {
        this.detectors = [
            // Path-specific detectors first (they check both name + path)
            new GradleDetector_1.GradleDetector(),
            new MavenDetector_1.MavenDetector(),
            new XcodeDetector_1.XcodeDetector(),
            // Name-only detectors
            new NodeModulesDetector_1.NodeModulesDetector(),
            new NextDetector_1.NextDetector(),
            new NuxtDetector_1.NuxtDetector(),
            new DistDetector_1.DistDetector(),
            new BuildDetector_1.BuildDetector(),
            new OutDetector_1.OutDetector(),
            new TurboDetector_1.TurboDetector(),
            new CacheDetector_1.CacheDetector(),
            new CocoaPodsDetector_1.CocoaPodsDetector(),
        ];
    }
    static getInstance() {
        if (!ArtifactDetectorRegistry.instance) {
            ArtifactDetectorRegistry.instance = new ArtifactDetectorRegistry();
        }
        return ArtifactDetectorRegistry.instance;
    }
    /**
     * Prepends a custom detector at the front of the chain (highest priority).
     * Useful for extending the registry at runtime.
     */
    register(detector) {
        this.detectors.unshift(detector);
    }
    /**
     * Returns the first matching ArtifactTypeInfo or null if no detector matches.
     */
    resolve(dirName, fullPath) {
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
    getKnownDirNames() {
        const names = new Set();
        for (const detector of this.detectors) {
            // Query each detector with only a name (empty path) to see if it matches by name alone
            const probeNames = [
                'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
                '.turbo', '.cache', 'Pods', 'DerivedData',
                // Path-based ones need separate handling; include their target basenames too
                'caches', // Gradle
                'repository', // Maven
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
exports.ArtifactDetectorRegistry = ArtifactDetectorRegistry;
//# sourceMappingURL=ArtifactDetectorRegistry.js.map