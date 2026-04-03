"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CocoaPodsDetector = void 0;
class CocoaPodsDetector {
    constructor() {
        this.detectorName = 'CocoaPodsDetector';
    }
    canDetect(dirName) {
        return dirName === 'Pods';
    }
    detect() {
        return { label: 'CocoaPods', color: 'red', safeToClean: true };
    }
}
exports.CocoaPodsDetector = CocoaPodsDetector;
//# sourceMappingURL=CocoaPodsDetector.js.map