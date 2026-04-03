"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildDetector = void 0;
class BuildDetector {
    constructor() {
        this.detectorName = 'BuildDetector';
    }
    canDetect(dirName) {
        return dirName === 'build';
    }
    detect() {
        return { label: 'build', color: 'yellow', safeToClean: true };
    }
}
exports.BuildDetector = BuildDetector;
//# sourceMappingURL=BuildDetector.js.map