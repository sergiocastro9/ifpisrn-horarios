import {readFile, writeFile, rm} from 'node:fs/promises'
import {spawn} from 'node:child_process'
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

async function removeDirIfExists(dirPath) {
  try {
    await rm(dirPath, {recursive: true, force: true})
  } catch {
    // ignore
  }
}

function buildCampusSidebarItems() {
  return [
    {
      type: 'html',
      value: '<div class="sidebarFlexSpacerInner"></div>',
      defaultStyle: true,
      className: 'sidebarFlexSpacer',
    },
    {
      type: 'html',
      value: '<div class="sidebarSectionTitle">INFORMAÇÕES DO CAMPUS</div>',
      defaultStyle: true,
      className: 'campusInfoGroupTitle',
    },
    {
      type: 'link',
      label: 'Administração',
      href: '/docs/campus/administracao',
      className: 'campusInfoItem campusInfoItem--administracao',
    },
    {
      type: 'link',
      label: 'Setor de Saúde',
      href: '/docs/campus/setor-de-saude',
      className: 'campusInfoItem campusInfoItem--saude',
    },
    {
      type: 'category',
      label: 'Cursos',
      collapsible: true,
      collapsed: true,
      className: 'campusInfoItem campusInfoItem--cursos',
      items: [
        {
          type: 'category',
          label: 'Técnico',
          collapsible: true,
          collapsed: true,
          className: 'campusCourseType campusCourseType--tecnico',
          items: [
            {type: 'link', label: 'Administração (Integrado)', href: '/docs/cursos/tecnico-administracao-integrado'},
            {type: 'link', label: 'Eventos (Integrado)', href: '/docs/cursos/tecnico-eventos-integrado'},
            {type: 'link', label: 'Informática (Integrado)', href: '/docs/cursos/tecnico-informatica-integrado'},
            {type: 'link', label: 'Administração (Subsequente)', href: '/docs/cursos/tecnico-administracao-subsequente'},
            {type: 'link', label: 'Gastronomia (Subsequente)', href: '/docs/cursos/tecnico-gastronomia-subsequente'},
            {type: 'link', label: 'Guia de Turismo (Subsequente)', href: '/docs/cursos/tecnico-guia-de-turismo-subsequente'},
            {
              type: 'link',
              label: 'Serviço de Restaurante e Bar (Subsequente)',
              href: '/docs/cursos/tecnico-servico-de-restaurante-e-bar',
            },
            {type: 'link', label: 'Gastronomia (PROEJA)', href: '/docs/cursos/tecnico-gastronomia-proeja'},
          ],
        },
        {
          type: 'category',
          label: 'Licenciatura',
          collapsible: true,
          collapsed: true,
          className: 'campusCourseType campusCourseType--licenciatura',
          items: [
            {type: 'link', label: 'Licenciatura em Física', href: '/docs/cursos/licenciatura-fisica'},
            {type: 'link', label: 'Licenciatura em Matemática', href: '/docs/cursos/licenciatura-matematica'},
          ],
        },
        {
          type: 'category',
          label: 'Tecnologia',
          collapsible: true,
          collapsed: true,
          className: 'campusCourseType campusCourseType--tecnologia',
          items: [
            {type: 'link', label: 'Gastronomia', href: '/docs/cursos/tecnologia-gastronomia'},
            {type: 'link', label: 'Sistemas para Internet', href: '/docs/cursos/tecnologia-sistemas-para-internet'},
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Contato',
      collapsible: true,
      collapsed: true,
      className: 'campusInfoItem campusInfoItem--contato',
      items: [
        {
          type: 'html',
          value:
            '<div class="campusInfoSubItem campusInfoSubItem--telefone"><span class="campusInfoSubItem__label">Telefone</span><span class="campusInfoSubItem__value">(89) 2221-9904</span></div>',
          defaultStyle: true,
        },
        {
          type: 'html',
          value:
            '<div class="campusInfoSubItem campusInfoSubItem--endereco"><span class="campusInfoSubItem__label">Endereço</span><span class="campusInfoSubItem__value">BR 020, S/N, Bairro Primavera, São Raimundo Nonato - PI, CEP 64770-000</span></div>',
          defaultStyle: true,
        },
      ],
    },
  ]
}

function isCampusSidebarItem(item) {
  if (!item || typeof item !== 'object') return false
  if (item.className && String(item.className).includes('campusInfo')) return true
  if (item.className === 'sidebarFlexSpacer') return true

  if (item.type === 'html' && typeof item.value === 'string') {
    if (item.value.includes('sidebarFlexSpacerInner')) return true
    if (item.value.includes('INFORMAÇÕES DO CAMPUS')) return true
    if (item.value.includes('INFORMA') && item.value.includes('DO CAMPUS')) return true
  }

  if (item.type === 'doc' && typeof item.id === 'string') {
    return item.id.startsWith('campus/') || item.id.startsWith('cursos/')
  }

  if (item.type === 'link' && typeof item.href === 'string') {
    return item.href.startsWith('/docs/campus/') || item.href.startsWith('/docs/cursos/')
  }

  return false
}

async function patchVersionedSidebarToUseNonVersionedCampus(versionName) {
  const sidebarPath = path.join(process.cwd(), 'versioned_sidebars', `version-${versionName}-sidebars.json`)
  let json
  try {
    json = await readJson(sidebarPath)
  } catch {
    return
  }

  if (!Array.isArray(json.schedulelSidebar)) return

  json.schedulelSidebar = json.schedulelSidebar.filter((item) => !isCampusSidebarItem(item))
  json.schedulelSidebar.push(...buildCampusSidebarItems())

  await writeFile(sidebarPath, JSON.stringify(json, null, 2) + '\n', 'utf8')
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

      // Keep "campus" content non-versioned:
      // - Remove it from the newly created snapshot docs
      // - Ensure the snapshot sidebar still shows campus links pointing to the non-versioned pages
      const snapshotRoot = path.join(process.cwd(), 'versioned_docs', `version-${oldCurrentVersion}`)
      await removeDirIfExists(path.join(snapshotRoot, 'campus'))
      await removeDirIfExists(path.join(snapshotRoot, 'cursos'))
      await patchVersionedSidebarToUseNonVersionedCampus(oldCurrentVersion)
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

