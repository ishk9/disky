// Types shared by main, preload and renderer. Global (no imports/exports) so the
// renderer can use them as a plain script without a bundler.

type CategoryId = 'large' | 'downloads' | 'caches' | 'temp' | 'backups' | 'trash';

interface ScanItem {
  id: string;
  name: string;
  /** Friendly parent folder, e.g. "Movies › Trips". */
  location: string;
  bytes: number;
  /** Last modified, ms since epoch. */
  modified: number;
}

interface ScanCategory {
  id: CategoryId;
  /** null = could not be measured (e.g. missing permission). */
  bytes: number | null;
  items: ScanItem[];
}

interface ScanResult {
  categories: ScanCategory[];
  needsFullDiskAccess: boolean;
  /** Home folders macOS refused to let us read (Desktop, Documents, Downloads). */
  deniedFolders: string[];
}

interface TrashOutcome {
  id: string;
  ok: boolean;
  error?: string;
}

interface DiskSpace {
  free: number;
  total: number;
}

interface DiskyApi {
  platform: 'darwin' | 'win32' | 'linux';
  diskSpace(): Promise<DiskSpace>;
  scan(): Promise<ScanResult | null>;
  cancelScan(): Promise<void>;
  trash(ids: string[]): Promise<TrashOutcome[]>;
  reveal(id: string): Promise<void>;
  openTrash(): Promise<void>;
  openPrivacySettings(pane: 'fullDisk' | 'files'): Promise<void>;
  onScanProgress(cb: (category: CategoryId) => void): void;
  onTrashProgress(cb: (done: number, total: number, name: string) => void): void;
}

interface Window {
  disky: DiskyApi;
}
