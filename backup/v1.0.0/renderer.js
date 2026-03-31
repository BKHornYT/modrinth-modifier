function secsToHM(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return { h, m }
}

function formatTime(secs) {
  const { h, m } = secsToHM(secs)
  if (h === 0 && m === 0) return '0 minutes'
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.join(' ')
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// profiles array stored here so event delegation can look up paths by index
let _profiles = []

function renderProfiles(profiles) {
  _profiles = profiles
  const root = document.getElementById('root')

  if (!profiles.length) {
    root.innerHTML = '<div class="error-box">No profiles found in the Modrinth database.</div>'
    return
  }

  const totalSecs = profiles.reduce((a, p) => a + p.submitted_time_played + p.recent_time_played, 0)

  let html = '<div class="profiles">'

  profiles.forEach((p, i) => {
    const total = p.submitted_time_played + p.recent_time_played
    const { h, m } = secsToHM(p.submitted_time_played)
    const { h: rh, m: rm } = secsToHM(p.recent_time_played)

    html += `
    <div class="profile-card" id="card-${i}" data-index="${i}">
      <div class="profile-top">
        <div>
          <div class="profile-name">${escHtml(p.name)}</div>
          <div class="profile-time">Total: <span>${formatTime(total)}</span></div>
        </div>
        <button class="edit-btn" data-action="edit" data-index="${i}">Edit</button>
      </div>
      <div class="edit-panel">
        <div class="edit-row">
          <div class="edit-label">Submitted playtime</div>
          <div class="edit-inputs">
            <div class="time-input-group">
              <input type="number" id="sub-h-${i}" value="${h}" min="0" placeholder="0" />
              <label>h</label>
            </div>
            <div class="time-input-group">
              <input type="number" id="sub-m-${i}" value="${m}" min="0" max="59" placeholder="0" />
              <label>m</label>
            </div>
          </div>
        </div>
        <div class="edit-row">
          <div class="edit-label">Recent (unsynced)</div>
          <div class="edit-inputs">
            <div class="time-input-group">
              <input type="number" id="rec-h-${i}" value="${rh}" min="0" placeholder="0" />
              <label>h</label>
            </div>
            <div class="time-input-group">
              <input type="number" id="rec-m-${i}" value="${rm}" min="0" max="59" placeholder="0" />
              <label>m</label>
            </div>
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn-save" data-action="save" data-index="${i}">Save</button>
          <button class="btn-cancel" data-action="cancel" data-index="${i}">Cancel</button>
          <div class="save-msg" id="msg-${i}">&#10003; Saved</div>
        </div>
      </div>
    </div>`
  })

  html += '</div>'
  html += `
  <div class="total-bar">
    <span class="total-bar-label">Total across all profiles</span>
    <span class="total-bar-value" id="grand-total">${formatTime(totalSecs)}</span>
  </div>`

  root.innerHTML = html
}

function toggleEdit(i) {
  const card = document.getElementById(`card-${i}`)
  const isEditing = card.classList.contains('editing')
  document.querySelectorAll('.profile-card.editing').forEach(c => c.classList.remove('editing'))
  if (!isEditing) card.classList.add('editing')
}

async function saveProfile(i) {
  const profilePath = _profiles[i].path
  const subH = parseInt(document.getElementById(`sub-h-${i}`).value) || 0
  const subM = parseInt(document.getElementById(`sub-m-${i}`).value) || 0
  const recH = parseInt(document.getElementById(`rec-h-${i}`).value) || 0
  const recM = parseInt(document.getElementById(`rec-m-${i}`).value) || 0

  const submitted = (subH * 3600) + (subM * 60)
  const recent = (recH * 3600) + (recM * 60)

  const result = await window.api.setPlaytime({ profilePath, submitted, recent })

  if (result.error) {
    alert('Error: ' + result.error)
    return
  }

  const card = document.getElementById(`card-${i}`)
  const total = submitted + recent
  card.querySelector('.profile-time').innerHTML = `Total: <span>${formatTime(total)}</span>`

  const msg = document.getElementById(`msg-${i}`)
  msg.classList.add('visible')
  setTimeout(() => msg.classList.remove('visible'), 2000)
}

async function init() {
  document.getElementById('btn-close').addEventListener('click', () => window.api.closeWindow())
  document.getElementById('btn-min').addEventListener('click', () => window.api.minimizeWindow())

  const version = await window.api.getVersion()
  document.getElementById('app-version').textContent = 'v' + version

  const result = await window.api.getProfiles()
  const root = document.getElementById('root')

  if (result.error) {
    root.innerHTML = `<div class="error-box">${escHtml(result.error)}</div>`
    return
  }

  renderProfiles(result.profiles)

  // Event delegation — handles all button clicks in the profile list
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const i = parseInt(btn.dataset.index)
    const action = btn.dataset.action
    if (action === 'edit' || action === 'cancel') toggleEdit(i)
    if (action === 'save') saveProfile(i)
  })
}

init()
