function simpleMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*] (.+)$/gm, '• $1')
}

function secsToHM(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return { h, m }
}

function formatTime(secs) {
  const { h, m } = secsToHM(secs)
  if (h === 0 && m === 0) return '0m'
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.join(' ')
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

let _profiles = []
let _originals = []
let _systemThemeQuery = null

// ── Theme ─────────────────────────────────────────────────

function applyTheme(theme) {
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

function setTheme(theme) {
  applyTheme(theme)

  // Update chip active state
  document.querySelectorAll('.theme-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === theme)
  })

  // Watch system theme changes if needed
  if (_systemThemeQuery) {
    _systemThemeQuery.removeEventListener('change', _onSystemThemeChange)
    _systemThemeQuery = null
  }
  if (theme === 'system') {
    _systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    _systemThemeQuery.addEventListener('change', _onSystemThemeChange)
  }
}

function _onSystemThemeChange(e) {
  document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
}

// ── Profiles ──────────────────────────────────────────────

function renderProfiles(profiles) {
  _profiles = profiles
  _originals = profiles.map(p => ({ submitted: p.submitted_time_played, recent: p.recent_time_played }))
  const root = document.getElementById('playtime-root')

  if (!profiles.length) {
    root.innerHTML = '<div class="error-msg">No profiles found in the Modrinth database.</div>'
    return
  }

  const totalSecs = profiles.reduce((a, p) => a + p.submitted_time_played + p.recent_time_played, 0)
  const maxSecs = Math.max(...profiles.map(p => p.submitted_time_played + p.recent_time_played), 1)

  let html = ''

  profiles.forEach((p, i) => {
    const total = p.submitted_time_played + p.recent_time_played
    const { h, m } = secsToHM(p.submitted_time_played)
    const { h: rh, m: rm } = secsToHM(p.recent_time_played)
    const pct = Math.round(total / maxSecs * 100)

    html += `
    <div class="card">
      <div class="profile-card-row" id="row-${i}">
        <div class="profile-card-info">
          <div class="profile-name">${escHtml(p.name)}</div>
          <div class="profile-stats">
            <span class="stat-total" id="time-${i}">${formatTime(total)}</span>
            <span class="stat-sep">·</span>
            <span class="stat-detail">Synced <b id="stat-sub-${i}">${formatTime(p.submitted_time_played)}</b></span>
            <span class="stat-sep">·</span>
            <span class="stat-detail">Recent <b id="stat-rec-${i}">${formatTime(p.recent_time_played)}</b></span>
          </div>
        </div>
        <button class="btn btn-secondary" data-action="edit" data-index="${i}">Edit</button>
      </div>
      <div class="playtime-bar-track"><div class="playtime-bar-fill" id="bar-${i}" style="width:${pct}%"></div></div>
      <div class="edit-panel" id="panel-${i}">
        <div class="edit-row">
          <span class="edit-lbl">Submitted</span>
          <div class="time-fields">
            <div class="time-field">
              <input type="number" id="sub-h-${i}" value="${h}" min="0" />
              <label>h</label>
            </div>
            <div class="time-field">
              <input type="number" id="sub-m-${i}" value="${m}" min="0" max="59" />
              <label>m</label>
            </div>
          </div>
        </div>
        <div class="edit-row">
          <span class="edit-lbl">Recent (unsynced)</span>
          <div class="time-fields">
            <div class="time-field">
              <input type="number" id="rec-h-${i}" value="${rh}" min="0" />
              <label>h</label>
            </div>
            <div class="time-field">
              <input type="number" id="rec-m-${i}" value="${rm}" min="0" max="59" />
              <label>m</label>
            </div>
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn btn-primary" data-action="save" data-index="${i}">Save</button>
          <button class="btn btn-transparent" data-action="reset" data-index="${i}">Reset</button>
          <button class="btn btn-transparent" data-action="cancel" data-index="${i}">Cancel</button>
          <span class="saved-msg" id="msg-${i}">&#10003; Saved</span>
        </div>
      </div>
    </div>`
  })

  html += `<div class="total-footer">
    <div class="total-footer-left">
      <div class="total-footer-label">Total across all profiles</div>
      <div class="total-footer-count">${profiles.length} profile${profiles.length !== 1 ? 's' : ''}</div>
    </div>
    <span class="total-footer-value" id="total-value">${formatTime(totalSecs)}</span>
  </div>`

  root.innerHTML = html

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const i = parseInt(btn.dataset.index)
    const action = btn.dataset.action
    if (action === 'edit') togglePanel(i)
    if (action === 'cancel') togglePanel(i, false)
    if (action === 'save') saveProfile(i)
    if (action === 'reset') resetProfile(i)
  })
}

function togglePanel(i, forceOpen) {
  const panel = document.getElementById(`panel-${i}`)
  const open = forceOpen !== undefined ? forceOpen : !panel.classList.contains('open')
  document.querySelectorAll('.edit-panel.open').forEach(p => p.classList.remove('open'))
  if (open) panel.classList.add('open')
}

function resetProfile(i) {
  const orig = _originals[i]
  const { h: sh, m: sm } = secsToHM(orig.submitted)
  const { h: rh, m: rm } = secsToHM(orig.recent)
  document.getElementById(`sub-h-${i}`).value = sh
  document.getElementById(`sub-m-${i}`).value = sm
  document.getElementById(`rec-h-${i}`).value = rh
  document.getElementById(`rec-m-${i}`).value = rm
}

async function saveProfile(i) {
  const profilePath = _profiles[i].path
  const submitted = (parseInt(document.getElementById(`sub-h-${i}`).value) || 0) * 3600
                  + (parseInt(document.getElementById(`sub-m-${i}`).value) || 0) * 60
  const recent    = (parseInt(document.getElementById(`rec-h-${i}`).value) || 0) * 3600
                  + (parseInt(document.getElementById(`rec-m-${i}`).value) || 0) * 60

  const result = await window.api.setPlaytime({ profilePath, submitted, recent })
  if (result.error) { alert('Error: ' + result.error); return }

  _profiles[i].submitted_time_played = submitted
  _profiles[i].recent_time_played = recent

  document.getElementById(`time-${i}`).textContent = formatTime(submitted + recent)
  document.getElementById(`stat-sub-${i}`).textContent = formatTime(submitted)
  document.getElementById(`stat-rec-${i}`).textContent = formatTime(recent)

  const newTotal = _profiles.reduce((a, p) => a + p.submitted_time_played + p.recent_time_played, 0)
  document.getElementById('total-value').textContent = formatTime(newTotal)

  const msg = document.getElementById(`msg-${i}`)
  msg.classList.add('show')
  setTimeout(() => msg.classList.remove('show'), 2000)
}

async function reloadProfiles() {
  const root = document.getElementById('playtime-root')
  root.innerHTML = '<div class="status-msg"><span class="spinner"></span>Loading...</div>'
  const result = await window.api.getProfiles()
  if (result.error) {
    root.innerHTML = `<div class="error-msg">${escHtml(result.error)}</div>`
    return
  }
  renderProfiles(result.profiles)
}

// ── Settings toggle helper ─────────────────────────────────

function setSettingsToggle(id, on) {
  const btn = document.getElementById(id)
  btn.textContent = on ? 'Enabled' : 'Disabled'
  btn.classList.toggle('on', on)
  btn.classList.toggle('off', !on)
}

// ── Init ──────────────────────────────────────────────────

async function init() {
  document.getElementById('btn-close').addEventListener('click', () => window.api.closeWindow())
  document.getElementById('btn-min').addEventListener('click', () => window.api.minimizeWindow())

  // Nav switching
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
      document.getElementById('page-' + btn.dataset.page).classList.add('active')
    })
  })

  const [version, iconPath] = await Promise.all([window.api.getVersion(), window.api.getIconPath()])
  document.getElementById('app-version').textContent = 'v' + version
  document.getElementById('titlebar-icon-img').src = iconPath

  // Load and apply saved theme
  const settings = await window.api.getSettings()
  setTheme(settings.theme || 'dark')

  // Theme chips
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const theme = chip.dataset.theme
      setTheme(theme)
      const s = await window.api.getSettings()
      s.theme = theme
      await window.api.setSettings(s)
    })
  })

  // Background toggle
  setSettingsToggle('background-btn', !!settings.runInBackground)
  document.getElementById('background-btn').addEventListener('click', async () => {
    const s = await window.api.getSettings()
    s.runInBackground = !s.runInBackground
    await window.api.setSettings(s)
    setSettingsToggle('background-btn', s.runInBackground)
  })

  // Startup toggle
  const startupOn = await window.api.getStartup()
  setSettingsToggle('startup-btn', startupOn)
  document.getElementById('startup-btn').addEventListener('click', async () => {
    const s = await window.api.getSettings()
    const next = !(await window.api.getStartup())
    await window.api.setStartup(next)
    setSettingsToggle('startup-btn', next)
  })

  // Update check
  window.api.checkUpdate().then(release => {
    if (!release || !release.tag) return
    const parseVer = s => s.replace(/[^0-9.]/g, '').split('.').map(Number)
    const [rM, rm, rp] = parseVer(release.tag)
    const [cM, cm, cp] = parseVer(version)
    const isNewer = rM > cM || (rM === cM && rm > cm) || (rM === cM && rm === cm && rp > cp)
    if (!isNewer) return

    document.getElementById('update-tag').textContent = release.tag
    document.getElementById('update-banner').classList.add('show')

    const btn = document.getElementById('update-btn')
    const progress = document.getElementById('update-progress')
    const bar = document.getElementById('update-bar')
    const text = document.getElementById('update-text')

    if (release.body) {
      const toggle = document.getElementById('update-notes-toggle')
      const panel = document.getElementById('update-notes-panel')
      const content = document.getElementById('update-notes-content')
      toggle.style.display = ''
      content.innerHTML = simpleMarkdown(release.body)
      toggle.addEventListener('click', () => {
        const open = panel.classList.toggle('open')
        toggle.innerHTML = open ? "What&#39;s new &#9650;" : "What&#39;s new &#9660;"
      })
    }

    window.api.onUpdateProgress(pct => { bar.style.width = pct + '%' })

    btn.addEventListener('click', async () => {
      if (!release.downloadUrl) { window.api.openUrl(release.url); return }
      btn.disabled = true
      btn.textContent = 'Downloading...'
      progress.classList.add('show')
      text.innerHTML = 'Downloading update...'
      const result = await window.api.downloadAndInstall(release.downloadUrl)
      if (result.error) {
        btn.disabled = false
        btn.textContent = 'Retry'
        text.innerHTML = 'Download failed. <b>' + result.error + '</b>'
        progress.classList.remove('show')
      } else {
        btn.textContent = 'Installing...'
        text.innerHTML = 'Installing — app will restart shortly.'
        bar.style.width = '100%'
      }
    })
  })

  // Load profiles
  const result = await window.api.getProfiles()
  const root = document.getElementById('playtime-root')
  if (result.error) {
    root.innerHTML = `<div class="error-msg">${escHtml(result.error)}</div>`
  } else {
    renderProfiles(result.profiles)
  }
}

init()
