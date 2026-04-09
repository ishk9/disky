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
exports.DetailCommand = void 0;
const readline = __importStar(require("readline"));
const path = __importStar(require("path"));
const DiskScanner_1 = require("../core/DiskScanner");
const ScanCache_1 = require("../core/ScanCache");
const DetailRenderer_1 = require("../renderers/DetailRenderer");
const Colors_1 = require("../renderers/Colors");
/**
 * Handles `disky <id>` and `disky <path>`.
 * Tries to resolve from the scan cache first; falls back to a live scan.
 */
class DetailCommand {
    constructor(options, scanner) {
        this.options = options;
        this.scanner = scanner ?? new DiskScanner_1.DiskScanner();
        this.cache = new ScanCache_1.ScanCache();
        this.renderer = new DetailRenderer_1.DetailRenderer();
    }
    async execute() {
        const entry = await this.resolveEntry();
        if (!entry) {
            const target = this.options.id !== undefined
                ? `ID ${this.options.id}`
                : (this.options.targetPath ?? 'unknown');
            console.log(`\n  ${Colors_1.Colors.error(`No entry found for ${target}`)}\n`);
            return;
        }
        console.log(this.renderer.render(entry));
        if (!entry.isDockerEntry) {
            const confirmed = await this.promptDelete(entry);
            if (confirmed) {
                await this.removeEntry(entry);
            }
        }
    }
    async resolveEntry() {
        // 1. Try cache first (fast path)
        if (this.options.id !== undefined) {
            const cached = this.cache.findById(this.options.id);
            if (cached) {
                // Re-scan to get full entry with top offenders
                const entries = await this.scanner.scan(true);
                this.cache.save(entries);
                return entries.find((e) => e.absolutePath === cached.absolutePath) ?? null;
            }
        }
        if (this.options.targetPath) {
            const absPath = this.expandPath(this.options.targetPath);
            const cached = this.cache.findByPath(absPath);
            if (cached) {
                const entries = await this.scanner.scan(true);
                this.cache.save(entries);
                return entries.find((e) => e.absolutePath === absPath) ?? null;
            }
        }
        // 2. Fall back to a live scan
        const entries = await this.scanner.scan(true);
        this.cache.save(entries);
        if (this.options.id !== undefined) {
            return entries.find((e) => e.id === this.options.id) ?? null;
        }
        if (this.options.targetPath) {
            const absPath = this.expandPath(this.options.targetPath);
            return entries.find((e) => e.absolutePath === absPath) ?? null;
        }
        return null;
    }
    expandPath(p) {
        if (p.startsWith('~/')) {
            return path.join(process.env.HOME ?? '', p.slice(2));
        }
        return path.resolve(p);
    }
    promptDelete(entry) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            const label = entry.artifactType.label;
            const loc = entry.project ?? entry.displayPath;
            rl.question(`  ${Colors_1.Colors.prompt(`Delete ${label} at ${loc}? [y/N]`)} `, (answer) => {
                rl.close();
                resolve(answer.trim().toLowerCase() === 'y');
            });
        });
    }
    async removeEntry(entry) {
        const { execFileSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        try {
            execFileSync('rm', ['-rf', entry.absolutePath], { stdio: 'pipe' });
            console.log(`\n  ${Colors_1.Colors.success('✓')} Removed ${Colors_1.Colors.artifact(entry.artifactType.color)(entry.artifactType.label)} ` +
                `${Colors_1.Colors.dim(entry.displayPath)}\n`);
        }
        catch {
            console.log(`\n  ${Colors_1.Colors.error('✗')} Failed to remove ${entry.displayPath}\n`);
        }
    }
}
exports.DetailCommand = DetailCommand;
//# sourceMappingURL=DetailCommand.js.map