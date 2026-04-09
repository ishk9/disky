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
exports.Config = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Reads and manages ~/.disky/config.json for persistent user configuration.
 */
class Config {
    /**
     * Returns normalised absolute exclusion paths from the config file.
     * Returns an empty array if the config file is missing or malformed.
     */
    getExclusions() {
        const config = this.load();
        return config.exclude.map((p) => this.normalisePath(p));
    }
    load() {
        try {
            if (!fs.existsSync(Config.CONFIG_FILE))
                return { exclude: [] };
            const raw = fs.readFileSync(Config.CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.exclude)) {
                return { exclude: parsed.exclude.filter((p) => typeof p === 'string') };
            }
            return { exclude: [] };
        }
        catch {
            return { exclude: [] };
        }
    }
    normalisePath(p) {
        if (p.startsWith('~/')) {
            return path.join(os.homedir(), p.slice(2));
        }
        return path.resolve(p.replace(/\/+$/, ''));
    }
}
exports.Config = Config;
Config.CONFIG_DIR = path.join(os.homedir(), '.disky');
Config.CONFIG_FILE = path.join(Config.CONFIG_DIR, 'config.json');
//# sourceMappingURL=Config.js.map