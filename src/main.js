const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const https = require('https')

let win

function getDbPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'ModrinthApp', 'app.db')
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  })

  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => app.quit())

async function loadSql() {
  const initSqlJs = require('sql.js')
  return initSqlJs()
}

ipcMain.handle('get-profiles', async () => {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) return { error: 'Database not found at ' + dbPath }

  try {
    const SQL = await loadSql()
    const fileBuffer = fs.readFileSync(dbPath)
    const db = new SQL.Database(fileBuffer)
    const result = db.exec('SELECT path, name, submitted_time_played, recent_time_played FROM profiles ORDER BY name')
    db.close()

    if (!result.length) return { profiles: [] }

    const { columns, values } = result[0]
    const profiles = values.map(row => {
      const obj = {}
      columns.forEach((col, i) => obj[col] = row[i])
      return obj
    })
    return { profiles }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('set-playtime', async (_, { profilePath, submitted, recent }) => {
  const dbPath = getDbPath()
  try {
    const SQL = await loadSql()
    const fileBuffer = fs.readFileSync(dbPath)
    const db = new SQL.Database(fileBuffer)
    db.run('UPDATE profiles SET submitted_time_played = ?, recent_time_played = ? WHERE path = ?', [submitted, recent, profilePath])
    const data = db.export()
    db.close()
    fs.writeFileSync(dbPath, Buffer.from(data))
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.on('close-window', () => win.close())
ipcMain.on('minimize-window', () => win.minimize())
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('get-icon-path', () => {
  return 'file://' + path.join(__dirname, '..', 'assets', 'icon.png').replace(/\\/g, '/')
})
ipcMain.handle('check-update', () => {
  return new Promise(resolve => {
    const req = https.get({
      hostname: 'api.github.com',
      path: '/repos/BKHornYT/modrinth-modifier/releases/latest',
      headers: { 'User-Agent': 'modrinth-modifier' }
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ tag: json.tag_name, url: json.html_url, name: json.name })
        } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => { req.destroy(); resolve(null) })
  })
})
ipcMain.on('open-url', (_, url) => shell.openExternal(url))
