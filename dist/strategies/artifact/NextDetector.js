"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextDetector = void 0;
class NextDetector {
    constructor() {
        this.detectorName = 'NextDetector';
    }
    canDetect(dirName) {
        return dirName === '.next';
    }
    detect() {
        return { label: '.next', color: 'cyan', safeToClean: true };
    }
}
exports.NextDetector = NextDetector;
//# sourceMappingURL=NextDetector.js.map