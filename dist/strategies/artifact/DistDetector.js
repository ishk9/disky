"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistDetector = void 0;
class DistDetector {
    constructor() {
        this.detectorName = 'DistDetector';
    }
    canDetect(dirName) {
        return dirName === 'dist';
    }
    detect() {
        return { label: 'dist', color: 'yellow', safeToClean: true };
    }
}
exports.DistDetector = DistDetector;
//# sourceMappingURL=DistDetector.js.map