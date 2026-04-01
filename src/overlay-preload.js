const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('overlay', {
  onData: (cb) => ipcRenderer.on('overlay-data', (_, data) => cb(data)),
  hide: () => ipcRenderer.send('hide-overlay')
})
