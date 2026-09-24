import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectInfo {
  directory: string | null;
  project: string | null;
  gitBranch: string | null;
}

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
  resolve(startPath: string): ProjectInfo {
    const root = this.findProjectRoot(startPath);
    if (!root) {
      return { directory: null, project: null, gitBranch: null };
    }

    return {
      directory: root,
      project: this.detectProjectName(root),
      gitBranch: this.getGitBranch(root),
    };
  }

  private findProjectRoot(startPath: string): string | null {
    let current = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
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
    try {
      const branch = execSync(`git -C "${dir}" branch --show-current 2>/dev/null`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      return branch || null;
    } catch {
      return null;
    }
  }
}
