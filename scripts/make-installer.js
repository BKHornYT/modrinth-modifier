const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const outDir = path.join(__dirname, '..', 'dist', 'installer')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const nsi = path.join(__dirname, 'installer.nsi')
const makensis = 'C:\\Program Files (x86)\\NSIS\\makensis.exe'

try {
  execSync(`"${makensis}" "${nsi}"`, { stdio: 'inherit', cwd: __dirname })
  console.log('\nInstaller created: dist/installer/ModrinthModifier-setup.exe')
} catch (e) {
  process.exit(1)
}
