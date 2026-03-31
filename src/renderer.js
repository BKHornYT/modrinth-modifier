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

  let html = '<div class="profile-list">'

  profiles.forEach((p, i) => {
    const total = p.submitted_time_played + p.recent_time_played
    const { h, m } = secsToHM(p.submitted_time_played)
    const { h: rh, m: rm } = secsToHM(p.recent_time_played)

    html += `
    <div class="profile-row" id="row-${i}">
      <div class="profile-row-info">
        <div class="profile-row-name">${escHtml(p.name)}</div>
        <div class="profile-row-time">Total: <b id="time-${i}">${formatTime(total)}</b></div>
      </div>
      <button class="btn-edit" data-action="edit" data-index="${i}">Edit</button>
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
        <button class="btn-save" data-action="save" data-index="${i}">Save</button>
        <button class="btn-cancel" data-action="cancel" data-index="${i}">Cancel</button>
        <span class="saved-msg" id="msg-${i}">Saved</span>
      </div>
    </div>`
  })

  html += '</div>'
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
    const idx = p.id.replace('panel-', '')
    document.getElementById(`row-${idx}`)?.classList.remove('expanded')
  })

  if (open) {
    panel.classList.add('open')
    row.classList.add('expanded')
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
    if (!release) return
    const current = 'v' + version
    if (release.tag && release.tag !== current) {
      document.getElementById('update-tag').textContent = release.tag
      document.getElementById('update-banner').classList.add('show')
      document.getElementById('update-btn').addEventListener('click', () => {
        window.api.openUrl(release.url)
      })
    }
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
