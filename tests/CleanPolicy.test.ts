import { describe, expect, it } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { classifyCleanPolicy, getCleanPolicy } from '../src/core/CleanPolicy';
import { getRuntimeRoot } from '../src/core/ProtectedPaths';
import { ArtifactTypeInfo } from '../src/types';

const nodeModules: ArtifactTypeInfo = {
  label: 'node_modules',
  color: 'green',
  safeToClean: true,
};

describe('CleanPolicy', () => {
  it('allows project-owned node_modules in artifact mode', () => {
    const projectRoot = path.join(os.homedir(), 'dev', 'project');
    const artifact = classifyCleanPolicy(
      nodeModules,
      path.join(projectRoot, 'node_modules'),
      projectRoot,
      'artifact',
    );

    expect(getCleanPolicy(artifact)).toBe('auto');
    expect(artifact.safeToClean).toBe(true);
  });

  it('locks npx package trees even when they look like node_modules', () => {
    const artifact = classifyCleanPolicy(
      nodeModules,
      path.join(os.homedir(), '.npm', '_npx', 'abc123', 'node_modules'),
      path.join(os.homedir(), '.npm', '_npx', 'abc123'),
      'artifact',
    );

    expect(getCleanPolicy(artifact)).toBe('locked');
    expect(artifact.safeToClean).toBe(false);
  });

  it('locks common user-level Node toolchain installs', () => {
    const roots = [
      path.join(os.homedir(), '.nvm', 'versions', 'node', 'v20.0.0', 'lib', 'node_modules'),
      path.join(
        os.homedir(),
        '.fnm',
        'node-versions',
        'v20.0.0',
        'installation',
        'lib',
        'node_modules',
      ),
      path.join(os.homedir(), '.volta', 'tools', 'image', 'packages', 'typescript'),
      path.join(os.homedir(), '.npm-global', 'lib', 'node_modules'),
      path.join(os.homedir(), '.local', 'share', 'pnpm', 'global', '5', 'node_modules'),
      path.join(os.homedir(), '.config', 'yarn', 'global', 'node_modules'),
    ];

    for (const root of roots) {
      const artifact = classifyCleanPolicy(nodeModules, root, root, 'artifact');
      expect(getCleanPolicy(artifact)).toBe('locked');
      expect(artifact.safeToClean).toBe(false);
    }
  });

  it('locks disky runtime paths and parents', () => {
    const runtimeRoot = getRuntimeRoot();

    expect(
      getCleanPolicy(
        classifyCleanPolicy(
          nodeModules,
          path.join(runtimeRoot, 'node_modules'),
          runtimeRoot,
          'artifact',
        ),
      ),
    ).toBe('locked');
    expect(
      getCleanPolicy(
        classifyCleanPolicy(nodeModules, path.dirname(runtimeRoot), runtimeRoot, 'artifact'),
      ),
    ).toBe('locked');
  });

  it('keeps known global caches auto-cleanable', () => {
    const gradle: ArtifactTypeInfo = {
      label: '.gradle',
      color: 'gray',
      safeToClean: true,
    };

    const artifact = classifyCleanPolicy(
      gradle,
      path.join(os.homedir(), '.gradle', 'caches'),
      null,
      'artifact',
    );

    expect(getCleanPolicy(artifact)).toBe('auto');
    expect(artifact.safeToClean).toBe(true);
  });

  it('marks all-mode large directories as inspect-only', () => {
    const largeDir: ArtifactTypeInfo = {
      label: 'large dir',
      color: 'gray',
      safeToClean: false,
    };

    const artifact = classifyCleanPolicy(largeDir, path.join(os.homedir(), 'Library'), null, 'all');

    expect(getCleanPolicy(artifact)).toBe('inspect');
    expect(artifact.safeToClean).toBe(false);
  });
});
