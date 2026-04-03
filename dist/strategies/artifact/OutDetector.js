"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutDetector = void 0;
class OutDetector {
    constructor() {
        this.detectorName = 'OutDetector';
    }
    canDetect(dirName) {
        return dirName === 'out';
    }
    detect() {
        return { label: 'out', color: 'yellow', safeToClean: true };
    }
}
exports.OutDetector = OutDetector;
//# sourceMappingURL=OutDetector.js.map