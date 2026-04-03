export interface ProjectInfo {
    directory: string | null;
    project: string | null;
    gitBranch: string | null;
}
/**
 * Walks up from a given path to find the nearest project root.
 * Recognises package.json, go.mod, Cargo.toml, and .git as project markers.
 */
export declare class ProjectDetector {
    private static readonly MARKERS;
    /**
     * Resolves the project root starting from `startPath` (which may be the
     * artifact directory itself or its parent).
     */
    resolve(startPath: string): ProjectInfo;
    private findProjectRoot;
    private detectProjectName;
    private getGitBranch;
}
//# sourceMappingURL=ProjectDetector.d.ts.map