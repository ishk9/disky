import * as path from 'path';
import * as fs from 'fs';

export interface ProjectInfo {
  directory: string | null;
  project: string | null;
  gitBranch: string | null;
}

export type ProjectInfoCache = Map<string, ProjectInfo>;

/**
 * Walks up from a given path to find the nearest project root.
 * Recognises package.json, go.mod, Cargo.toml, and .git as project markers.
 */
export class ProjectDetector {
  private static readonly MARKERS = [
    'package.json',
    'go.mod',
    'Cargo.toml',
    'pyproject.toml',
    '.git',
  ];

  /**
   * Resolves the project root starting from `startPath` (which may be the
   * artifact directory itself or its parent).
   */
  resolve(startPath: string, cache?: ProjectInfoCache): ProjectInfo {
    const root = this.findProjectRoot(startPath);
    if (!root) {
      return { directory: null, project: null, gitBranch: null };
    }

    const cached = cache?.get(root);
    if (cached) return cached;

    const info = {
      directory: root,
      project: this.detectProjectName(root),
      gitBranch: this.getGitBranch(root),
    };

    cache?.set(root, info);
    return info;
  }

  private findProjectRoot(startPath: string): string | null {
    let current =
      fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
        ? startPath
        : path.dirname(startPath);

    const home = process.env.HOME ?? '/';

    for (let depth = 0; depth < 8; depth++) {
      for (const marker of ProjectDetector.MARKERS) {
        if (fs.existsSync(path.join(current, marker))) {
          return current;
        }
      }

      const parent = path.dirname(current);
      // Stop at home directory or filesystem root
      if (parent === current || current === home) break;
      current = parent;
    }

    return null;
  }

  private detectProjectName(dir: string): string | null {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
        if (typeof pkg.name === 'string' && pkg.name.trim()) {
          return pkg.name.trim();
        }
      } catch {
        // malformed — fall through
      }
    }
    return path.basename(dir) || null;
  }

  private getGitBranch(dir: string): string | null {
    const gitDir = this.findGitDir(dir);
    if (!gitDir) return null;

    try {
      const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      const branchPrefix = 'ref: refs/heads/';
      if (!head.startsWith(branchPrefix)) return null;
      return head.slice(branchPrefix.length) || null;
    } catch {
      return null;
    }
  }

  private findGitDir(startPath: string): string | null {
    let current =
      fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
        ? startPath
        : path.dirname(startPath);

    const home = process.env.HOME ?? '/';

    while (true) {
      const dotGit = path.join(current, '.git');

      try {
        const stat = fs.statSync(dotGit);
        if (stat.isDirectory()) return dotGit;
        if (stat.isFile()) return this.resolveGitFile(dotGit, current);
      } catch {
        // No .git entry at this level.
      }

      const parent = path.dirname(current);
      if (parent === current || current === home) break;
      current = parent;
    }

    return null;
  }

  private resolveGitFile(dotGitPath: string, ownerDir: string): string | null {
    try {
      const contents = fs.readFileSync(dotGitPath, 'utf8').trim();
      const match = contents.match(/^gitdir:\s*(.+)$/i);
      if (!match) return null;

      const gitDir = match[1].trim();
      return path.isAbsolute(gitDir) ? gitDir : path.resolve(ownerDir, gitDir);
    } catch {
      return null;
    }
  }
}
