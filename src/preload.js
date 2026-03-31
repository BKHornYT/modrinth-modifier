const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  setPlaytime: (data) => ipcRenderer.invoke('set-playtime', data),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  getVersion: () => ipcRenderer.invoke('get-version')
})
