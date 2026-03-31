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

function renderProfiles(profiles) {
  _profiles = profiles
  const root = document.getElementById('playtime-root')

  if (!profiles.length) {
    root.innerHTML = '<div class="error-msg">No profiles found in the Modrinth database.</div>'
    return
  }

  const totalSecs = profiles.reduce((a, p) => a + p.submitted_time_played + p.recent_time_played, 0)

  let html = ''

  profiles.forEach((p, i) => {
    const total = p.submitted_time_played + p.recent_time_played
    const { h, m } = secsToHM(p.submitted_time_played)
    const { h: rh, m: rm } = secsToHM(p.recent_time_played)

    html += `
    <div class="card">
      <div class="profile-card-row" id="row-${i}">
        <div class="profile-card-info">
          <div class="profile-name">${escHtml(p.name)}</div>
          <div class="profile-time">Total: <b id="time-${i}">${formatTime(total)}</b></div>
        </div>
        <button class="btn btn-secondary" data-action="edit" data-index="${i}">Edit</button>
      </div>
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
          <button class="btn btn-transparent" data-action="cancel" data-index="${i}">Cancel</button>
          <span class="saved-msg" id="msg-${i}">&#10003; Saved</span>
        </div>
      </div>
    </div>`
  })

  html += ''
  html += `<div class="total-footer">
    <span class="total-footer-label">Total across all profiles</span>
    <span class="total-footer-value">${formatTime(totalSecs)}</span>
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
  })
}

function togglePanel(i, forceOpen) {
  const panel = document.getElementById(`panel-${i}`)
  const row = document.getElementById(`row-${i}`)
  const open = forceOpen !== undefined ? forceOpen : !panel.classList.contains('open')

  // close all others
  document.querySelectorAll('.edit-panel.open').forEach(p => {
    p.classList.remove('open')
  })

  if (open) {
    panel.classList.add('open')
  }
}

async function saveProfile(i) {
  const profilePath = _profiles[i].path
  const submitted = (parseInt(document.getElementById(`sub-h-${i}`).value) || 0) * 3600
                  + (parseInt(document.getElementById(`sub-m-${i}`).value) || 0) * 60
  const recent    = (parseInt(document.getElementById(`rec-h-${i}`).value) || 0) * 3600
                  + (parseInt(document.getElementById(`rec-m-${i}`).value) || 0) * 60

  const result = await window.api.setPlaytime({ profilePath, submitted, recent })
  if (result.error) { alert('Error: ' + result.error); return }

  document.getElementById(`time-${i}`).textContent = formatTime(submitted + recent)

  const msg = document.getElementById(`msg-${i}`)
  msg.classList.add('show')
  setTimeout(() => msg.classList.remove('show'), 2000)
}

async function init() {
  document.getElementById('btn-close').addEventListener('click', () => window.api.closeWindow())
  document.getElementById('btn-min').addEventListener('click', () => window.api.minimizeWindow())

  const [version, iconPath] = await Promise.all([window.api.getVersion(), window.api.getIconPath()])
  document.getElementById('app-version').textContent = 'v' + version
  document.getElementById('titlebar-icon-img').src = iconPath

  // Check for updates in background
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

    // Changelog toggle
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

    window.api.onUpdateProgress(pct => {
      bar.style.width = pct + '%'
    })

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

  const result = await window.api.getProfiles()
  const root = document.getElementById('playtime-root')
  if (result.error) {
    root.innerHTML = `<div class="error-msg">${escHtml(result.error)}</div>`
    return
  }
  renderProfiles(result.profiles)
}

init()
