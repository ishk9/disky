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
exports.CleanCommand = void 0;
const readline = __importStar(require("readline"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const DiskScanner_1 = require("../core/DiskScanner");
const ScanCache_1 = require("../core/ScanCache");
const Config_1 = require("../core/Config");
const TableRenderer_1 = require("../renderers/TableRenderer");
const CleanRenderer_1 = require("../renderers/CleanRenderer");
const Colors_1 = require("../renderers/Colors");
/**
 * Handles `disky clean`, `disky clean <id>`, and `disky clean <path>`.
 */
class CleanCommand {
    constructor(options = {}, scanner) {
        this.options = options;
        this.scanner = scanner ?? new DiskScanner_1.DiskScanner();
        this.cache = new ScanCache_1.ScanCache();
        this.config = new Config_1.Config();
        this.cleanRenderer = new CleanRenderer_1.CleanRenderer();
        this.tableRenderer = new TableRenderer_1.TableRenderer();
    }
    async execute() {
        if (this.options.id !== undefined || this.options.targetPath !== undefined) {
            await this.removeSpecific();
        }
        else {
            await this.removeBulk();
        }
    }
    // ─── Specific entry removal ───────────────────────────────────────────────
    async removeSpecific() {
        const entry = await this.resolveEntry();
        if (!entry) {
            const target = this.options.id !== undefined
                ? `ID ${this.options.id}`
                : (this.options.targetPath ?? 'unknown');
            console.log(`\n  ${Colors_1.Colors.error(`No entry found for ${target}`)}\n`);
            return;
        }
        console.log('\n' + this.tableRenderer.render([entry]));
        console.log('');
        const label = entry.artifactType.label;
        const loc = entry.project ?? entry.displayPath;
        const exclusions = this.getEffectiveExclusions();
        const excluded = this.isExcluded(entry, exclusions);
        if (this.options.dryRun) {
            if (excluded) {
                console.log(`  ${Colors_1.Colors.prompt('[DRY RUN]')} ${loc} is in your exclusion list — would be skipped`);
            }
            else {
                console.log(`  ${Colors_1.Colors.prompt('[DRY RUN]')} Would delete ${label} at ${loc} (${entry.sizeHuman})`);
            }
            console.log(`  ${Colors_1.Colors.dim('No files were modified.')}\n`);
            return;
        }
        let promptText = `Delete ${label} at ${loc}? [y/N]`;
        if (excluded) {
            promptText = `${loc} is in your exclusion list. Remove anyway? [y/N]`;
        }
        const confirmed = await this.prompt(`  ${Colors_1.Colors.prompt(promptText)} `);
        if (!confirmed) {
            console.log(`\n  ${Colors_1.Colors.dim('Aborted.')}\n`);
            return;
        }
        const result = this.remove(entry);
        if (result) {
            console.log(this.cleanRenderer.renderRemovalResults([result]));
        }
    }
    // ─── Bulk removal ─────────────────────────────────────────────────────────
    async removeBulk() {
        const entries = await this.scanner.scan(true);
        this.cache.save(entries);
        let safeEntries = entries.filter((e) => e.artifactType.safeToClean);
        // Apply exclusions
        const exclusions = this.getEffectiveExclusions();
        const excludedCount = safeEntries.filter((e) => this.isExcluded(e, exclusions)).length;
        safeEntries = safeEntries.filter((e) => !this.isExcluded(e, exclusions));
        process.stdout.write(this.cleanRenderer.render(safeEntries));
        if (excludedCount > 0) {
            console.log(`  ${Colors_1.Colors.dim(`Skipping ${excludedCount} excluded ${excludedCount === 1 ? 'entry' : 'entries'}`)}\n`);
        }
        if (safeEntries.length === 0)
            return;
        if (this.options.dryRun) {
            const totalBytes = safeEntries.reduce((sum, e) => sum + e.sizeBytes, 0);
            console.log(`  ${Colors_1.Colors.prompt('[DRY RUN]')} Would remove ${safeEntries.length} ${safeEntries.length === 1 ? 'entry' : 'entries'} totaling ${(0, DiskScanner_1.formatBytes)(totalBytes)}`);
            console.log(`  ${Colors_1.Colors.dim('No files were modified.')}\n`);
            return;
        }
        const confirmed = await this.prompt(`  ${Colors_1.Colors.prompt('Remove all? [y/N]')} `);
        if (!confirmed) {
            console.log(`\n  ${Colors_1.Colors.dim('Aborted.')}\n`);
            return;
        }
        const results = [];
        for (const entry of safeEntries) {
            const result = this.remove(entry);
            if (result) {
                results.push(result);
            }
            else {
                console.log(`  ${Colors_1.Colors.error('✗')} Failed to remove ${entry.displayPath}`);
            }
        }
        console.log(this.cleanRenderer.renderRemovalResults(results));
    }
    // ─── Helpers ─────────────────────────────────────────────────────────────
    async resolveEntry() {
        // Try cache first
        if (this.options.id !== undefined) {
            const cached = this.cache.findById(this.options.id);
            if (cached) {
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
        // Live scan fallback
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
    /**
     * Removes an entry from disk (or prunes Docker resources) and returns the result.
     * Returns null on failure.
     */
    remove(entry) {
        try {
            if (entry.isDockerEntry) {
                (0, child_process_1.execSync)('docker system prune -f 2>/dev/null', { stdio: 'pipe' });
            }
            else {
                (0, child_process_1.execSync)(`rm -rf "${entry.absolutePath}"`, { stdio: 'pipe' });
            }
            return {
                id: entry.id,
                label: entry.artifactType.label,
                displayPath: entry.displayPath,
                bytesFreed: entry.sizeBytes,
            };
        }
        catch {
            return null;
        }
    }
    getEffectiveExclusions() {
        const configExclusions = this.config.getExclusions();
        const cliExclusions = (this.options.excludePaths ?? []).map((p) => this.expandPath(p));
        return [...new Set([...configExclusions, ...cliExclusions])];
    }
    isExcluded(entry, exclusions) {
        if (entry.isDockerEntry)
            return false;
        return exclusions.some((ex) => entry.absolutePath === ex || entry.absolutePath.startsWith(ex + path.sep));
    }
    expandPath(p) {
        if (p.startsWith('~/')) {
            return path.join(process.env.HOME ?? '', p.slice(2));
        }
        return path.resolve(p);
    }
    prompt(question) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer.trim().toLowerCase() === 'y');
            });
        });
    }
}
exports.CleanCommand = CleanCommand;
//# sourceMappingURL=CleanCommand.js.map