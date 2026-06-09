import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { getRuntimeRoot, isProtectedPath } from '../src/core/ProtectedPaths';

describe('ProtectedPaths', () => {
  it('protects disky runtime artifacts from cleanup', () => {
    const root = getRuntimeRoot();

    expect(isProtectedPath(path.join(root, 'dist'))).toBe(true);
    expect(isProtectedPath(path.join(root, 'node_modules'))).toBe(true);
  });

  it('protects parent directories that contain the runtime package', () => {
    const root = getRuntimeRoot();

    expect(isProtectedPath(path.dirname(root))).toBe(true);
  });

  it('does not protect other project artifacts', () => {
    expect(isProtectedPath(path.join(path.sep, 'tmp', 'some-project', 'dist'))).toBe(false);
    expect(isProtectedPath('__docker__')).toBe(false);
  });
});
