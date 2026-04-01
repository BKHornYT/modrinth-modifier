const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const https = require('https')

let win
let tray
let forceQuit = false

const startHidden = process.argv.includes('--hidden')

function getDbPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'ModrinthApp', 'app.db')
}

function getBackupPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'ModrinthApp', 'modifier_backup.json')
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8')) } catch { return {} }
}

function saveSettings(s) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(s))
}

function clearWal(dbPath) {
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
}

async function loadSql() {
  const initSqlJs = require('sql.js')
  return initSqlJs()
}

function createTray() {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'icon.ico'))
  tray.setToolTip('Modrinth Modifier')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Modrinth Modifier', click: () => { win.show(); win.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { forceQuit = true; app.quit() } }
  ]))
  tray.on('click', () => { win.show(); win.focus() })
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#16181c',
    show: !startHidden,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  })

  win.loadFile(path.join(__dirname, 'index.html'))

  win.on('close', e => {
    const s = loadSettings()
    if (s.runInBackground && !forceQuit) {
      e.preventDefault()
      win.hide()
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => { /* keep alive for tray */ })
app.on('before-quit', () => { forceQuit = true })

// ── Profiles ──────────────────────────────────────────────

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
    clearWal(dbPath)
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})

// ── Hide / Restore playtime ────────────────────────────────

ipcMain.handle('check-hidden', () => fs.existsSync(getBackupPath()))

ipcMain.handle('hide-playtime', async () => {
  const dbPath = getDbPath()
  try {
    const SQL = await loadSql()
    const fileBuffer = fs.readFileSync(dbPath)
    const db = new SQL.Database(fileBuffer)
    const result = db.exec('SELECT path, submitted_time_played, recent_time_played FROM profiles')
    if (result.length) {
      const { columns, values } = result[0]
      const backup = values.map(row => {
        const obj = {}
        columns.forEach((col, i) => obj[col] = row[i])
        return obj
      })
      fs.writeFileSync(getBackupPath(), JSON.stringify(backup))
    }
    db.run('UPDATE profiles SET submitted_time_played = 0, recent_time_played = 0')
    const data = db.export()
    db.close()
    fs.writeFileSync(dbPath, Buffer.from(data))
    clearWal(dbPath)
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('restore-playtime', async () => {
  const dbPath = getDbPath()
  const backupPath = getBackupPath()
  if (!fs.existsSync(backupPath)) return { error: 'No backup found' }
  try {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    const SQL = await loadSql()
    const fileBuffer = fs.readFileSync(dbPath)
    const db = new SQL.Database(fileBuffer)
    for (const p of backup) {
      db.run('UPDATE profiles SET submitted_time_played = ?, recent_time_played = ? WHERE path = ?',
        [p.submitted_time_played, p.recent_time_played, p.path])
    }
    const data = db.export()
    db.close()
    fs.writeFileSync(dbPath, Buffer.from(data))
    clearWal(dbPath)
    fs.unlinkSync(backupPath)
    return { ok: true }
  } catch (e) {
    return { error: e.message }
  }
})

// ── Settings ───────────────────────────────────────────────

ipcMain.handle('get-settings', () => loadSettings())
ipcMain.handle('set-settings', (_, s) => saveSettings(s))

ipcMain.handle('get-startup', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('set-startup', (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, args: enabled ? ['--hidden'] : [] })
})

// ── Misc ───────────────────────────────────────────────────

ipcMain.on('close-window', () => {
  const s = loadSettings()
  if (s.runInBackground) { win.hide() } else { forceQuit = true; app.quit() }
})
ipcMain.on('minimize-window', () => win.minimize())
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('get-icon-path', () => {
  return 'file://' + path.join(__dirname, '..', 'assets', 'icon.png').replace(/\\/g, '/')
})

ipcMain.handle('check-update', () => {
  return new Promise(resolve => {
    const req = https.get({
      hostname: 'api.github.com',
      path: '/repos/BKHornYT/modrinth-modifier/releases?per_page=1',
      headers: { 'User-Agent': 'modrinth-modifier' }
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const list = JSON.parse(data)
          const json = Array.isArray(list) ? list[0] : list
          if (!json) return resolve(null)
          const asset = (json.assets || []).find(a => a.name.endsWith('.exe'))
          resolve({
            tag: json.tag_name,
            url: json.html_url,
            downloadUrl: asset ? asset.browser_download_url : null,
            body: json.body || ''
          })
        } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => { req.destroy(); resolve(null) })
  })
})

ipcMain.handle('download-and-install', (_, downloadUrl) => {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), 'ModrinthModifier-update.exe')
    function doGet(url, redirects) {
      if (redirects > 5) return reject(new Error('Too many redirects'))
      const parsed = new URL(url)
      const mod = parsed.protocol === 'https:' ? https : require('http')
      const req = mod.get(url, { headers: { 'User-Agent': 'modrinth-modifier' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return doGet(res.headers.location, redirects + 1)
        if (res.statusCode !== 200) return resolve({ error: 'HTTP ' + res.statusCode })
        const total = parseInt(res.headers['content-length'] || '0')
        let received = 0
        const out = fs.createWriteStream(tmp)
        res.on('data', chunk => {
          received += chunk.length
          if (total) win.webContents.send('update-progress', Math.round(received / total * 100))
        })
        res.pipe(out)
        out.on('finish', () => {
          out.close(() => {
            const { spawn } = require('child_process')
            spawn(tmp, ['/S'], { detached: true, stdio: 'ignore' }).unref()
            resolve({ ok: true })
            setTimeout(() => app.quit(), 1500)
          })
        })
        out.on('error', e => resolve({ error: e.message }))
      })
      req.on('error', e => resolve({ error: e.message }))
    }
    doGet(downloadUrl, 0)
  })
})

ipcMain.on('open-url', (_, url) => shell.openExternal(url))
