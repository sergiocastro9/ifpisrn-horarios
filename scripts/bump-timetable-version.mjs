import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

function getArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatIsoDate(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, deltaDays) {
  const out = new Date(date.getTime())
  out.setUTCDate(out.getUTCDate() + deltaDays)
  return out
}

async function runNpmDocusaurusVersion(versionName) {
  const npmCmd = 'npm'
  const args = ['run', 'docusaurus', '--', 'docs:version', versionName]

  await new Promise((resolve, reject) => {
    const child = spawn(npmCmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      // On Windows, `npm` is a command shim and needs a shell to run reliably.
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`docusaurus docs:version exited with code ${code}`))
    })
  })
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const newVersion = getArg('--new')
  const newStart = getArg('--start')
  const doSnapshot = !hasFlag('--no-snapshot')

  if (!newVersion || !newStart) {
    console.error(
      'Usage: node scripts/bump-timetable-version.mjs --new <version> --start <YYYY-MM-DD> [--no-snapshot]',
    )
    process.exit(1)
  }

  const newStartDate = parseIsoDate(newStart)
  if (!newStartDate) {
    console.error('Invalid --start date. Expected YYYY-MM-DD.')
    process.exit(1)
  }

  const siteVersionsPath = path.join(process.cwd(), 'src', 'data', 'siteVersions.json')
  const siteVersions = await readJson(siteVersionsPath)

  const oldCurrentVersion = siteVersions?.current?.version
  const oldCurrentStart = siteVersions?.current?.start
  if (!oldCurrentVersion || !oldCurrentStart) {
    console.error('siteVersions.json is missing current.version/current.start')
    process.exit(1)
  }

  if (oldCurrentVersion === newVersion) {
    console.error('New version equals current version; nothing to do.')
    process.exit(1)
  }

  const oldStartDate = parseIsoDate(oldCurrentStart)
  if (!oldStartDate) {
    console.error('Current start date in siteVersions.json is invalid.')
    process.exit(1)
  }

  const oldEndDate = addDays(newStartDate, -1)
  if (oldEndDate.getTime() < oldStartDate.getTime()) {
    console.error(
      `New start date (${formatIsoDate(newStartDate)}) would make the previous version end before it started (${oldCurrentStart}).`,
    )
    process.exit(1)
  }

  const history = Array.isArray(siteVersions.history) ? siteVersions.history : []
  const alreadyExists = history.some((h) => h?.id === oldCurrentVersion) // id == version name
  if (alreadyExists) {
    console.error(`History already contains version id "${oldCurrentVersion}".`)
    process.exit(1)
  }

  if (doSnapshot) {
    // Only snapshot if Docusaurus doesn't already have this version.
    // If versions.json doesn't exist yet, it means there are no snapshots yet.
    const versionsJsonPath = path.join(process.cwd(), 'versions.json')
    let existingVersions = []
    try {
      existingVersions = await readJson(versionsJsonPath)
    } catch {
      existingVersions = []
    }

    if (!Array.isArray(existingVersions) || !existingVersions.includes(oldCurrentVersion)) {
      await runNpmDocusaurusVersion(oldCurrentVersion)
    }
  }

  const updated = {
    current: {
      id: 'current',
      version: newVersion,
      start: formatIsoDate(newStartDate),
    },
    history: [
      {
        id: oldCurrentVersion,
        version: oldCurrentVersion,
        start: formatIsoDate(oldStartDate),
        end: formatIsoDate(oldEndDate),
      },
      ...history,
    ],
  }

  await writeFile(siteVersionsPath, JSON.stringify(updated, null, 2) + '\n', 'utf8')

  console.log(
    JSON.stringify(
      {
        snapshot: doSnapshot,
        newCurrent: updated.current,
        closedVersion: updated.history[0],
      },
      null,
      2,
    ),
  )
}

await main()
