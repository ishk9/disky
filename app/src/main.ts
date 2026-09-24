import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, nativeTheme, shell } from 'electron';
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
  const win = new BrowserWindow({
    width: 980,
    height: 740,
    minWidth: 720,
    minHeight: 560,
    show: false,
    title: 'Disky',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161618' : '#f6f6f4',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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
      onProgress: (category) => e.sender.send('scan:progress', category),
    });
    return list.load(result);
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
    e.sender.send('trash:progress', done, total, name),
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
