import * as os from 'os';

/** Formats a byte count as a human-readable string (e.g. "4.2 GB"). */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Formats a millisecond age as a relative string (e.g. "3d ago"). */
export function formatAge(ms: number): string {
  if (ms <= 0) return '–';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/** Abbreviates the home directory prefix to `~`. */
export function abbreviateHome(absPath: string): string {
  const home = os.homedir();
  if (absPath.startsWith(home)) {
    return '~' + absPath.slice(home.length);
  }
  return absPath;
}
