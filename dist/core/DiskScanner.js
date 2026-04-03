"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiskScanner = void 0;
exports.formatBytes = formatBytes;
exports.formatAge = formatAge;
exports.abbreviateHome = abbreviateHome;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const ProjectDetector_1 = require("./ProjectDetector");
const DockerScanner_1 = require("./DockerScanner");
const ArtifactDetectorRegistry_1 = require("../strategies/artifact/ArtifactDetectorRegistry");
/** Directories skipped when walking the filesystem to avoid infinite loops / system noise. */
const SKIP_DIRS = new Set([
    'node_modules', // descend into project roots, not into node_modules
    '.git',
    'Library', // macOS system libraries — handled separately
    'System',
    'Applications',
    'Volumes',
    'proc',
    'sys',
    'dev',
]);
/** Minimum directory size (bytes) to include in `--all` mode. */
const ALL_MODE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
/** How deep to walk when looking for artifact directories. */
const ARTIFACT_SCAN_DEPTH = 6;
/** How deep to walk in `--all` mode. */
const ALL_SCAN_DEPTH = 3;
/** Number of top offenders to show in the detail view. */
const TOP_OFFENDERS_LIMIT = 5;
class DiskScanner {
    constructor() {
        this.projectDetector = new ProjectDetector_1.ProjectDetector();
        this.dockerScanner = new DockerScanner_1.DockerScanner();
        this.registry = ArtifactDetectorRegistry_1.ArtifactDetectorRegistry.getInstance();
    }
    async scan(artifactOnly) {
        const entries = [];
        let idCounter = 1;
        if (artifactOnly) {
            const artifactPaths = this.findArtifactPaths();
            for (const absPath of artifactPaths) {
                const sizeBytes = this.getDirSizeBytes(absPath);
                if (sizeBytes === 0)
                    continue;
                const entry = this.buildEntry(absPath, sizeBytes, idCounter++);
                if (entry)
                    entries.push(entry);
            }
            const dockerEntry = this.buildDockerEntry(idCounter++);
            if (dockerEntry)
                entries.push(dockerEntry);
        }
        else {
            const largeDirs = this.findAllLargeDirs();
            for (const [absPath, sizeBytes] of largeDirs) {
                const entry = this.buildEntry(absPath, sizeBytes, idCounter++);
                if (entry)
                    entries.push(entry);
            }
        }
        return entries.sort((a, b) => b.sizeBytes - a.sizeBytes);
    }
    // ─── Artifact-mode scanning ──────────────────────────────────────────────
    /**
     * Uses `find` to locate known artifact directory names under the home directory.
     * Uses spawnSync with an explicit args array to avoid shell quoting issues with
     * the `(` `)` grouping operators.
     */
    findArtifactPaths() {
        const names = this.registry.getKnownDirNames();
        if (names.length === 0)
            return [];
        const home = os.homedir();
        // Build args array: find HOME -maxdepth N -type d ( -name A -o -name B ... ) -prune
        const args = [home, '-maxdepth', String(ARTIFACT_SCAN_DEPTH), '-type', 'd', '('];
        for (let i = 0; i < names.length; i++) {
            if (i > 0)
                args.push('-o');
            args.push('-name', names[i]);
        }
        args.push(')', '-prune');
        const result = (0, child_process_1.spawnSync)('find', args, {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
        });
        if (result.status !== 0 && !result.stdout)
            return [];
        return (result.stdout ?? '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
    }
    // ─── All-mode scanning ───────────────────────────────────────────────────
    /**
     * Returns all directories above the size threshold by running `du` up to ALL_SCAN_DEPTH.
     */
    findAllLargeDirs() {
        const home = os.homedir();
        const results = [];
        try {
            const raw = (0, child_process_1.execSync)(`du -d ${ALL_SCAN_DEPTH} -k "${home}" 2>/dev/null | sort -rn`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
            for (const line of raw.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const tab = trimmed.indexOf('\t');
                if (tab === -1)
                    continue;
                const kb = parseInt(trimmed.slice(0, tab), 10);
                const dirPath = trimmed.slice(tab + 1);
                const sizeBytes = kb * 1024;
                if (sizeBytes < ALL_MODE_THRESHOLD_BYTES)
                    continue;
                if (!dirPath || dirPath === home)
                    continue;
                results.push([dirPath, sizeBytes]);
            }
        }
        catch {
            // du unavailable
        }
        return results;
    }
    // ─── Entry construction ──────────────────────────────────────────────────
    buildEntry(absPath, sizeBytes, id) {
        const dirName = path.basename(absPath);
        const artifactType = this.registry.resolve(dirName, absPath) ?? this.unknownArtifact();
        const projectInfo = this.projectDetector.resolve(path.dirname(absPath));
        const ageMs = this.getAgeMs(absPath);
        return {
            id,
            sizeBytes,
            sizeHuman: formatBytes(sizeBytes),
            artifactType,
            absolutePath: absPath,
            displayPath: abbreviateHome(absPath),
            project: projectInfo.project,
            directory: projectInfo.directory,
            gitBranch: projectInfo.gitBranch,
            ageMs,
            ageHuman: formatAge(ageMs),
            isDockerEntry: false,
            dockerSummary: null,
            topOffenders: this.getTopOffenders(absPath),
        };
    }
    buildDockerEntry(id) {
        const stats = this.dockerScanner.scan();
        if (!stats || stats.reclaimableBytes === 0)
            return null;
        const dockerArtifact = {
            label: 'Docker',
            color: 'blue',
            safeToClean: true,
        };
        return {
            id,
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
    // ─── Helpers ─────────────────────────────────────────────────────────────
    /** Returns size of a directory in bytes using `du -sk`. */
    getDirSizeBytes(dirPath) {
        try {
            const raw = (0, child_process_1.execSync)(`du -sk "${dirPath}" 2>/dev/null`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const kb = parseInt(raw.split('\t')[0] ?? '0', 10);
            return kb * 1024;
        }
        catch {
            return 0;
        }
    }
    /** Returns mtime age in milliseconds, or 0 on error. */
    getAgeMs(dirPath) {
        try {
            const stat = fs.statSync(dirPath);
            return Date.now() - stat.mtimeMs;
        }
        catch {
            return 0;
        }
    }
    /**
     * Finds the largest immediate subdirectories or files within an artifact directory.
     * Skipped for Docker entries.
     */
    getTopOffenders(dirPath) {
        try {
            const raw = (0, child_process_1.execSync)(`du -sk "${dirPath}"/* 2>/dev/null | sort -rn | head -${TOP_OFFENDERS_LIMIT + 1}`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const offenders = [];
            for (const line of raw.split('\n').slice(0, TOP_OFFENDERS_LIMIT)) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const tab = trimmed.indexOf('\t');
                if (tab === -1)
                    continue;
                const kb = parseInt(trimmed.slice(0, tab), 10);
                const fullPath = trimmed.slice(tab + 1);
                const sizeBytes = kb * 1024;
                offenders.push({
                    name: path.basename(fullPath),
                    sizeBytes,
                    sizeHuman: formatBytes(sizeBytes),
                });
            }
            return offenders;
        }
        catch {
            return [];
        }
    }
    unknownArtifact() {
        return { label: 'unknown', color: 'gray', safeToClean: false };
    }
}
exports.DiskScanner = DiskScanner;
// ─── Pure formatting utilities ────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes >= 1024 ** 3)
        return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2)
        return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
    if (bytes >= 1024)
        return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}
function formatAge(ms) {
    if (ms <= 0)
        return '–';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ago`;
    if (hours > 0)
        return `${hours}h ago`;
    if (minutes > 0)
        return `${minutes}m ago`;
    return 'just now';
}
function abbreviateHome(absPath) {
    const home = os.homedir();
    if (absPath.startsWith(home)) {
        return '~' + absPath.slice(home.length);
    }
    return absPath;
}
//# sourceMappingURL=DiskScanner.js.map