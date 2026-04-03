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
exports.ScanCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Persists the last scan result to ~/.disky/last-scan.json so that
 * `disky clean <id>` and `disky <id>` can resolve entries without re-scanning.
 */
class ScanCache {
    save(entries) {
        try {
            fs.mkdirSync(ScanCache.CACHE_DIR, { recursive: true });
            const cached = entries.map((e) => ({
                id: e.id,
                absolutePath: e.absolutePath,
                isDockerEntry: e.isDockerEntry,
                sizeHuman: e.sizeHuman,
                artifactLabel: e.artifactType.label,
                project: e.project,
            }));
            fs.writeFileSync(ScanCache.CACHE_FILE, JSON.stringify(cached, null, 2), 'utf8');
        }
        catch {
            // cache writes are best-effort; never crash the main flow
        }
    }
    load() {
        try {
            if (!fs.existsSync(ScanCache.CACHE_FILE))
                return [];
            const raw = fs.readFileSync(ScanCache.CACHE_FILE, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    /** Returns the cached entry matching the given numeric ID, or null. */
    findById(id) {
        return this.load().find((e) => e.id === id) ?? null;
    }
    /** Returns the cached entry matching the given absolute path, or null. */
    findByPath(absolutePath) {
        const normalised = path.resolve(absolutePath);
        return this.load().find((e) => e.absolutePath === normalised) ?? null;
    }
}
exports.ScanCache = ScanCache;
ScanCache.CACHE_DIR = path.join(os.homedir(), '.disky');
ScanCache.CACHE_FILE = path.join(ScanCache.CACHE_DIR, 'last-scan.json');
//# sourceMappingURL=ScanCache.js.map