const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  setPlaytime: (data) => ipcRenderer.invoke('set-playtime', data),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getIconPath: () => ipcRenderer.invoke('get-icon-path'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadAndInstall: (url) => ipcRenderer.invoke('download-and-install', url),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, pct) => cb(pct)),
  openUrl: (url) => ipcRenderer.send('open-url', url)
})
