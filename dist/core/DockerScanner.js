"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerScanner = void 0;
const child_process_1 = require("child_process");
/**
 * Queries Docker for reclaimable disk space from stopped containers and dangling images.
 * Returns null when Docker is not installed or not running.
 */
class DockerScanner {
    scan() {
        if (!this.isDockerAvailable())
            return null;
        try {
            const imageStats = this.getImageStats();
            const containerStats = this.getStoppedContainerStats();
            const reclaimableBytes = imageStats.danglingBytes + containerStats.reclaimableBytes;
            const summary = this.buildSummary(imageStats.total, imageStats.dangling, containerStats.stopped);
            return {
                imageSizeBytes: imageStats.totalBytes,
                imageCount: imageStats.total,
                danglingImageCount: imageStats.dangling,
                stoppedContainerCount: containerStats.stopped,
                reclaimableBytes,
                summary,
            };
        }
        catch {
            return null;
        }
    }
    isDockerAvailable() {
        try {
            (0, child_process_1.execSync)('docker info 2>/dev/null', {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 3000,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    getImageStats() {
        let total = 0;
        let dangling = 0;
        let totalBytes = 0;
        let danglingBytes = 0;
        try {
            const raw = (0, child_process_1.execSync)('docker images --format "{{.Size}}\t{{.Repository}}" 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
            for (const line of raw.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const [sizeStr, repo] = trimmed.split('\t');
                const bytes = this.parseDockerSize(sizeStr ?? '');
                total++;
                totalBytes += bytes;
                if (repo === '<none>') {
                    dangling++;
                    danglingBytes += bytes;
                }
            }
        }
        catch {
            // docker images unavailable
        }
        return { total, dangling, totalBytes, danglingBytes };
    }
    getStoppedContainerStats() {
        let stopped = 0;
        let reclaimableBytes = 0;
        try {
            const raw = (0, child_process_1.execSync)('docker ps -a --filter "status=exited" --filter "status=created" --format "{{.Size}}" 2>/dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
            for (const line of raw.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                stopped++;
                // docker ps --format "{{.Size}}" returns "virtual size / rw layer size"
                // Take the RW layer portion (after the slash) when present
                const parts = trimmed.split('/');
                const sizeStr = (parts[1] ?? parts[0] ?? '').trim();
                reclaimableBytes += this.parseDockerSize(sizeStr);
            }
        }
        catch {
            // docker ps unavailable
        }
        return { stopped, reclaimableBytes };
    }
    /** Parses Docker size strings like "1.5GB", "340MB", "512kB" into bytes. */
    parseDockerSize(s) {
        const match = s.trim().match(/^([\d.]+)\s*(B|kB|KB|MB|GB|TB)?$/i);
        if (!match)
            return 0;
        const value = parseFloat(match[1] ?? '0');
        const unit = (match[2] ?? 'B').toUpperCase();
        const multipliers = {
            B: 1,
            KB: 1024,
            MB: 1024 ** 2,
            GB: 1024 ** 3,
            TB: 1024 ** 4,
        };
        return Math.round(value * (multipliers[unit] ?? 1));
    }
    buildSummary(total, dangling, stopped) {
        const parts = [];
        if (total > 0) {
            parts.push(`${total} image${total !== 1 ? 's' : ''}`);
        }
        if (stopped > 0) {
            parts.push(`${stopped} stopped container${stopped !== 1 ? 's' : ''}`);
        }
        if (dangling > 0) {
            parts.push(`${dangling} dangling`);
        }
        return parts.join(', ') || 'no reclaimable Docker resources';
    }
}
exports.DockerScanner = DockerScanner;
//# sourceMappingURL=DockerScanner.js.map