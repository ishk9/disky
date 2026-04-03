"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheDetector = void 0;
class CacheDetector {
    constructor() {
        this.detectorName = 'CacheDetector';
    }
    canDetect(dirName) {
        return dirName === '.cache';
    }
    detect() {
        return { label: '.cache', color: 'gray', safeToClean: true };
    }
}
exports.CacheDetector = CacheDetector;
//# sourceMappingURL=CacheDetector.js.map