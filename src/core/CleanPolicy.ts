import * as os from 'os';
import * as path from 'path';
import { ArtifactTypeInfo, CleanPolicy, DiskEntry } from '../types/index.js';
import { isProtectedPath } from './ProtectedPaths.js';

const AUTO_CACHE_LABELS = new Set([
  '.gradle',
  '.m2',
  'Xcode DerivedData',
  'pnpm store',
  'bun cache',
  'Docker',
]);

function isSameOrInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function inside(candidate: string, parent: string): boolean {
  return isSameOrInside(path.resolve(parent), path.resolve(candidate));
}

function toolchainReason(absPath: string): string | null {
  if (absPath === '__docker__') return null;

  const home = os.homedir();
  const checks: Array<[string, string]> = [
    [path.join(home, '.npm', '_npx'), 'npx cache package tree'],
    [path.join(home, '.nvm'), 'nvm-managed Node installation'],
    [path.join(home, '.fnm'), 'fnm-managed Node installation'],
    [path.join(home, '.local', 'share', 'fnm'), 'fnm-managed Node installation'],
    [path.join(home, 'Library', 'Application Support', 'fnm'), 'fnm-managed Node installation'],
    [path.join(home, '.volta'), 'Volta-managed toolchain'],
    [path.join(home, '.npm-global'), 'user-level npm global install prefix'],
    [path.join(home, 'npm-global'), 'user-level npm global install prefix'],
    [path.join(home, '.local', 'share', 'npm'), 'user-level npm global install prefix'],
    [path.join(home, '.local', 'share', 'pnpm', 'global'), 'user-level pnpm global install prefix'],
    [path.join(home, 'Library', 'pnpm', 'global'), 'user-level pnpm global install prefix'],
    [path.join(home, '.config', 'yarn', 'global'), 'user-level Yarn global install prefix'],
  ];

  for (const [prefix, reason] of checks) {
    if (inside(absPath, prefix)) return reason;
  }

  return null;
}

export function classifyCleanPolicy(
  artifact: ArtifactTypeInfo,
  absPath: string,
  projectDirectory: string | null,
  mode: 'artifact' | 'all',
): ArtifactTypeInfo {
  if (mode === 'all') {
    return withPolicy(artifact, 'inspect', 'All-mode entries are broad directories for inspection.');
  }

  if (artifact.label === 'unknown' || artifact.label === 'large dir') {
    return withPolicy(artifact, 'inspect', 'disky does not recognize this as a safe cleanup artifact.');
  }

  const lockedReason =
    isProtectedPath(absPath)
      ? 'This path belongs to the running disky package or contains it.'
      : toolchainReason(absPath);

  if (lockedReason) {
    return withPolicy(artifact, 'locked', lockedReason);
  }

  if (AUTO_CACHE_LABELS.has(artifact.label)) {
    return withPolicy(artifact, 'auto');
  }

  if (projectDirectory) {
    return withPolicy(artifact, 'auto');
  }

  return withPolicy(
    artifact,
    'locked',
    'No project root was found, so this may belong to an installed toolchain or package manager.',
  );
}

export function getCleanPolicy(artifact: ArtifactTypeInfo): CleanPolicy {
  return artifact.cleanPolicy ?? (artifact.safeToClean ? 'auto' : 'inspect');
}

export function isAutoCleanable(entry: DiskEntry): boolean {
  return getCleanPolicy(entry.artifactType) === 'auto';
}

export function canForceClean(entry: DiskEntry): boolean {
  return getCleanPolicy(entry.artifactType) === 'locked';
}

export function cleanPolicyLabel(entry: DiskEntry): string {
  const policy = getCleanPolicy(entry.artifactType);
  return policy === 'auto' ? entry.artifactType.label : `${entry.artifactType.label} ${policy}`;
}

function withPolicy(
  artifact: ArtifactTypeInfo,
  cleanPolicy: CleanPolicy,
  cleanReason?: string,
): ArtifactTypeInfo {
  return {
    ...artifact,
    cleanPolicy,
    cleanReason,
    safeToClean: cleanPolicy === 'auto',
  };
}
