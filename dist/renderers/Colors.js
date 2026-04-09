"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colors = void 0;
const chalk_1 = __importDefault(require("chalk"));
/**
 * Centralised color palette — single place to change the entire visual theme.
 */
exports.Colors = {
    // Table columns
    id: chalk_1.default.dim,
    size: chalk_1.default.yellow,
    path: chalk_1.default.white,
    project: chalk_1.default.magenta,
    age: chalk_1.default.green,
    ageWarn: chalk_1.default.yellow,
    ageStale: chalk_1.default.red.bold,
    header: chalk_1.default.cyan.bold,
    dim: chalk_1.default.dim,
    // Branding
    brand: chalk_1.default.cyan.bold,
    tagline: chalk_1.default.dim,
    watching: chalk_1.default.dim,
    // Status / feedback
    success: chalk_1.default.green.bold,
    error: chalk_1.default.red.bold,
    prompt: chalk_1.default.yellow,
    // Detail view
    directory: chalk_1.default.magenta,
    sectionLabel: chalk_1.default.dim,
    treeGlyph: chalk_1.default.gray,
    removeCommand: chalk_1.default.cyan,
    removePath: chalk_1.default.red,
    removeId: chalk_1.default.yellow,
    // Watch mode flash
    newEntry: chalk_1.default.green.bold,
    removedEntry: chalk_1.default.red.bold,
    /** Returns the chalk instance for a given ArtifactColorKey. */
    artifact(color) {
        const map = {
            green: chalk_1.default.green,
            cyan: chalk_1.default.cyan,
            blue: chalk_1.default.blue,
            yellow: chalk_1.default.yellow,
            gray: chalk_1.default.gray,
            red: chalk_1.default.red,
            magenta: chalk_1.default.magenta,
        };
        return map[color] ?? chalk_1.default.white;
    },
};
//# sourceMappingURL=Colors.js.map