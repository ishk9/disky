"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurboDetector = void 0;
class TurboDetector {
    constructor() {
        this.detectorName = 'TurboDetector';
    }
    canDetect(dirName) {
        return dirName === '.turbo';
    }
    detect() {
        return { label: '.turbo', color: 'gray', safeToClean: true };
    }
}
exports.TurboDetector = TurboDetector;
//# sourceMappingURL=TurboDetector.js.map