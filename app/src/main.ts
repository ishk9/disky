import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, nativeTheme, shell, systemPreferences } from 'electron';
import { execFile } from 'child_process';
import { statfs } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { scan } from './scanner';
import { TrashList } from './trash';

const list = new TrashList();
let scanning: AbortController | null = null;

const PRIVACY_PANES = {
  fullDisk: 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
  files: 'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders',
};

function createWindow(): void {
  const mac = process.platform === 'darwin';
  const win = new BrowserWindow({
    width: 1040,
    height: 700,
    minWidth: 820,
    minHeight: 540,
    show: false,
    title: 'Disky',
    autoHideMenuBar: true,
    // macOS: translucent sidebar under a unified toolbar, like Finder and System Settings.
    ...(mac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 18, y: 18 },
          vibrancy: 'sidebar' as const,
          visualEffectState: 'followWindow' as const,
          backgroundColor: '#00000000',
        }
      : { backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#f3f3f3' }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('did-finish-load', () => {
    const accent = systemAccent();
    if (accent) win.webContents.insertCSS(`:root { --system-accent: ${accent}; }`);
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

/** The user's chosen accent colour (System Settings › Appearance), so Disky matches their Mac or PC. */
function systemAccent(): string | null {
  try {
    const hex = systemPreferences.getAccentColor(); // RRGGBBAA
    return /^[0-9a-f]{6}/i.test(hex) ? `#${hex.slice(0, 6)}` : null;
  } catch {
    return null;
  }
}

/** Progress events are best-effort: the window may have been closed mid-scan. */
function send(e: IpcMainInvokeEvent, channel: string, ...args: unknown[]): void {
  if (!e.sender.isDestroyed()) e.sender.send(channel, ...args);
}

/** Registers an IPC handler that only answers our own bundled page. */
function handle<A extends unknown[], R>(channel: string, fn: (e: IpcMainInvokeEvent, ...args: A) => R): void {
  ipcMain.handle(channel, (e, ...args) => {
    const url = e.senderFrame?.url;
    if (!url || new URL(url).protocol !== 'file:') throw new Error('Blocked IPC from unexpected sender');
    return fn(e, ...(args as A));
  });
}

handle('diskSpace', async (): Promise<DiskSpace> => {
  const s = await statfs(os.homedir());
  return { free: s.bavail * s.bsize, total: s.blocks * s.bsize };
});

handle('scan', async (e): Promise<ScanResult | null> => {
  scanning?.abort();
  const controller = (scanning = new AbortController());
  try {
    const result = await scan({
      signal: controller.signal,
      onProgress: (category) => send(e, 'scan:progress', category),
    });
    // Cancel may land after the last check inside the scan.
    return controller.signal.aborted ? null : list.load(result);
  } catch (err) {
    if (controller.signal.aborted) return null;
    throw err;
  } finally {
    if (scanning === controller) scanning = null;
  }
});

handle('scan:cancel', () => scanning?.abort());

handle('trash', (e, ids: unknown) => {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) throw new Error('Invalid ids');
  return list.trash(ids, (p) => shell.trashItem(p), (done, total, name) =>
    send(e, 'trash:progress', done, total, name),
  );
});

handle('reveal', (_e, id: unknown) => {
  const p = typeof id === 'string' ? list.pathOf(id) : undefined;
  if (p) shell.showItemInFolder(p);
});

handle('openTrash', async () => {
  if (process.platform === 'win32') execFile('explorer.exe', ['shell:RecycleBinFolder']);
  else await shell.openPath(path.join(os.homedir(), '.Trash'));
});

handle('openPrivacySettings', async (_e, pane: unknown) => {
  if (process.platform !== 'darwin') return;
  await shell.openExternal(pane === 'files' ? PRIVACY_PANES.files : PRIVACY_PANES.fullDisk);
});

app.setName('Disky');
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
