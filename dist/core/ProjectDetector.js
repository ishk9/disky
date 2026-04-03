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
exports.ProjectDetector = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Walks up from a given path to find the nearest project root.
 * Recognises package.json, go.mod, Cargo.toml, and .git as project markers.
 */
class ProjectDetector {
    /**
     * Resolves the project root starting from `startPath` (which may be the
     * artifact directory itself or its parent).
     */
    resolve(startPath) {
        const root = this.findProjectRoot(startPath);
        if (!root) {
            return { directory: null, project: null, gitBranch: null };
        }
        return {
            directory: root,
            project: this.detectProjectName(root),
            gitBranch: this.getGitBranch(root),
        };
    }
    findProjectRoot(startPath) {
        let current = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
            ? startPath
            : path.dirname(startPath);
        const home = process.env.HOME ?? '/';
        for (let depth = 0; depth < 8; depth++) {
            for (const marker of ProjectDetector.MARKERS) {
                if (fs.existsSync(path.join(current, marker))) {
                    return current;
                }
            }
            const parent = path.dirname(current);
            // Stop at home directory or filesystem root
            if (parent === current || current === home)
                break;
            current = parent;
        }
        return null;
    }
    detectProjectName(dir) {
        const pkgPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (typeof pkg.name === 'string' && pkg.name.trim()) {
                    return pkg.name.trim();
                }
            }
            catch {
                // malformed — fall through
            }
        }
        return path.basename(dir) || null;
    }
    getGitBranch(dir) {
        try {
            const branch = (0, child_process_1.execSync)(`git -C "${dir}" branch --show-current 2>/dev/null`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
            return branch || null;
        }
        catch {
            return null;
        }
    }
}
exports.ProjectDetector = ProjectDetector;
ProjectDetector.MARKERS = [
    'package.json',
    'go.mod',
    'Cargo.toml',
    'pyproject.toml',
    '.git',
];
//# sourceMappingURL=ProjectDetector.js.map