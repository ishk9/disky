// Sandboxed preload: may only require 'electron' (stricter still from Electron 45).
const { contextBridge, ipcRenderer } = require('electron');

const api: DiskyApi = {
  platform: process.platform as DiskyApi['platform'],
  diskSpace: () => ipcRenderer.invoke('diskSpace'),
  scan: () => ipcRenderer.invoke('scan'),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),
  trash: (ids) => ipcRenderer.invoke('trash', ids),
  reveal: (id) => ipcRenderer.invoke('reveal', id),
  openTrash: () => ipcRenderer.invoke('openTrash'),
  openPrivacySettings: (pane) => ipcRenderer.invoke('openPrivacySettings', pane),
  onScanProgress: (cb) => {
    ipcRenderer.on('scan:progress', (_e: unknown, category: CategoryId) => cb(category));
  },
  onTrashProgress: (cb) => {
    ipcRenderer.on('trash:progress', (_e: unknown, done: number, total: number, name: string) => cb(done, total, name));
  },
};

contextBridge.exposeInMainWorld('disky', api);
