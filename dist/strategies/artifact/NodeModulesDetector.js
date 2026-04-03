"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeModulesDetector = void 0;
class NodeModulesDetector {
    constructor() {
        this.detectorName = 'NodeModulesDetector';
    }
    canDetect(dirName) {
        return dirName === 'node_modules';
    }
    detect() {
        return { label: 'node_modules', color: 'green', safeToClean: true };
    }
}
exports.NodeModulesDetector = NodeModulesDetector;
//# sourceMappingURL=NodeModulesDetector.js.map