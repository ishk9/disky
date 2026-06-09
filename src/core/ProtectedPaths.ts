import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function normalizeExistingPath(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function isSameOrInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

const runtimeRoot = normalizeExistingPath(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'),
);

export function getRuntimeRoot(): string {
  return runtimeRoot;
}

export function isProtectedPath(targetPath: string): boolean {
  if (targetPath === '__docker__') return false;

  const resolved = path.resolve(targetPath);
  const normalized = normalizeExistingPath(targetPath);

  return (
    isSameOrInside(runtimeRoot, resolved) ||
    isSameOrInside(runtimeRoot, normalized) ||
    isSameOrInside(resolved, runtimeRoot) ||
    isSameOrInside(normalized, runtimeRoot)
  );
}
