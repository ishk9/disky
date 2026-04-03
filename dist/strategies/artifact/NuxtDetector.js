"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuxtDetector = void 0;
class NuxtDetector {
    constructor() {
        this.detectorName = 'NuxtDetector';
    }
    canDetect(dirName) {
        return dirName === '.nuxt';
    }
    detect() {
        return { label: '.nuxt', color: 'cyan', safeToClean: true };
    }
}
exports.NuxtDetector = NuxtDetector;
//# sourceMappingURL=NuxtDetector.js.map