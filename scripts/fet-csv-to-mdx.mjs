import { readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

function createURL(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function safeFileStem(value) {
  const normalized = createURL(value)
  if (normalized.length <= 80) return normalized || 'item'
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 10)
  return `${normalized.slice(0, 60)}_${hash}`
}

function parseCsvLine(line) {
  const out = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      out.push(current)
      current = ''
      continue
    }
    current += char
  }
  out.push(current)
  return out
}

function parseHourRange(value) {
  const match = /^\s*(\d{1,2})h(\d{2})\s*-\s*(\d{1,2})h(\d{2})\s*$/.exec(value)
  if (!match) return null
  const [, h1, m1, h2, m2] = match
  return `${String(h1).padStart(2, '0')}:${m1} - ${String(h2).padStart(2, '0')}:${m2}`
}

const DAY_MAP = new Map([
  ['Segunda-feira', 'Segunda-Feira'],
  ['Terça-feira', 'Terça-Feira'],
  ['Quarta-feira', 'Quarta-Feira'],
  ['Quinta-feira', 'Quinta-Feira'],
  ['Sexta-feira', 'Sexta-Feira'],
  ['Sábado', 'Sábado'],
])

const DAY_ORDER = [
  'Segunda-Feira',
  'Terça-Feira',
  'Quarta-Feira',
  'Quinta-Feira',
  'Sexta-Feira',
  'Sábado',
]

function splitPlus(value) {
  return String(value ?? '')
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)
}

function ensureDaysMap() {
  const map = new Map()
  for (const day of DAY_ORDER) map.set(day, [])
  return map
}

function toWeekClasses(dayMap) {
  return DAY_ORDER.filter((d) => dayMap.has(d)).map((dayName) => ({
    dayName,
    dayClasses: dayMap.get(dayName) ?? [],
  }))
}

function classSignature(entry) {
  const teachers = entry.teachers.join('|')
  const students = entry.students.join('|')
  return `${entry.subject}||${teachers}||${students}||${entry.classroom}`
}

function minutesFromHHMM(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function mergeAdjacentInDay(dayClasses) {
  const parsed = dayClasses
    .map((c) => {
      const parts = String(c.time).split('-')
      if (parts.length < 2) return null
      const start = minutesFromHHMM(parts[0].trim())
      const end = minutesFromHHMM(parts.slice(1).join('-').trim())
      if (start == null || end == null) return null
      return { c, start, end }
    })
    .filter(Boolean)

  parsed.sort((a, b) => a.start - b.start)

  const merged = []
  for (const item of parsed) {
    const last = merged[merged.length - 1]
    if (last && last.end === item.start && classSignature(last.c) === classSignature(item.c)) {
      last.end = item.end
      last.c = { ...last.c, time: `${formatMinutes(last.start)} - ${formatMinutes(last.end)}`, size: 1 }
      continue
    }
    merged.push({
      start: item.start,
      end: item.end,
      c: { ...item.c, size: 1 },
    })
  }

  return merged.map((m) => m.c)
}

function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function sortAndMergeWeek(dayMap) {
  for (const [day, list] of dayMap.entries()) {
    dayMap.set(day, mergeAdjacentInDay(list))
  }
}

function renderMdx({ slugPrefix, description, title, weekClasses, sidebarLabel }) {
  const slug = `${slugPrefix}/${createURL(title)}`
  const sidebarLabelLine = sidebarLabel ? `\nsidebar_label: ${JSON.stringify(sidebarLabel)}` : ''
  return `---\nslug: ${slug}\ndescription: ${description}${sidebarLabelLine}\n---\nimport { Grid } from \"@site/src/components/Grid\";\nimport BrowserOnly from \"@docusaurus/BrowserOnly\";\nexport const data = {\n  title: ${JSON.stringify(title)},\n  base: \"\",\n  weekClasses: ${JSON.stringify(weekClasses, null, 2)},\n  alert: \"\"\n}\n\n# ${title}\n\n<div>\n  {\n    <BrowserOnly>\n      {() => (\n        <Grid\n          title={data.title}\n          weekClasses={data.weekClasses}\n        />\n      )}\n    </BrowserOnly>\n  }\n</div>\n`
}

function splitCourseAndTurma(fullName) {
  const name = String(fullName ?? '').trim()
  const match = /^(.*?)\s*-\s*(.+)$/.exec(name)
  if (!match) return { courseName: 'Outros', turmaLabel: name }
  return { courseName: match[1].trim(), turmaLabel: match[2].trim() }
}

const COURSE_ORDER = [
  'tec_em_administracao_integrado',
  'tec_em_eventos_integrado',
  'tec_em_informatica_integrado',
  'tec_em_administracao_subsequente',
  'tec_em_guia_de_turismo_subsequente',
  'tec_gastronomia',
  'tec_gastronomia_proeja',
  'lic_em_matematica',
  'lic_em_fisica',
  'sistemas_para_internet',
  'tecnologia_em_gastronomia',
]

function getCoursePosition(courseName) {
  const key = createURL(courseName)
  const index = COURSE_ORDER.indexOf(key)
  if (index === -1) return 9999
  return index + 1
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: node scripts/fet-csv-to-mdx.mjs <path-to-timetable.csv>')
    process.exit(1)
  }

  const repoRoot = process.cwd()
  const docsRoot = path.join(repoRoot, 'docs')
  const professorDir = path.join(docsRoot, 'professor')
  const turmaDir = path.join(docsRoot, 'turma')
  const salaDir = path.join(docsRoot, 'sala')
  const disciplinaDir = path.join(docsRoot, 'disciplina')

  await rm(professorDir, { recursive: true, force: true })
  await rm(turmaDir, { recursive: true, force: true })
  await rm(salaDir, { recursive: true, force: true })
  await rm(disciplinaDir, { recursive: true, force: true })
  await mkdir(professorDir, { recursive: true })
  await mkdir(turmaDir, { recursive: true })
  await mkdir(salaDir, { recursive: true })
  await mkdir(disciplinaDir, { recursive: true })

  const csvContent = await readFile(csvPath, 'utf8')
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const header = parseCsvLine(lines[0]).map((h) => h.trim())
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))

  const required = ['Day', 'Hour', 'Students Sets', 'Subject', 'Teachers', 'Room']
  for (const key of required) {
    if (!(key in idx)) {
      console.error(`Missing required column "${key}" in CSV header.`)
      process.exit(1)
    }
  }

  const teachersMap = new Map()
  const studentsMap = new Map()
  const roomsMap = new Map()
  const subjectsMap = new Map()

  function ensureEntity(map, name) {
    if (!map.has(name)) map.set(name, ensureDaysMap())
    return map.get(name)
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const dayRaw = cols[idx['Day']]
    const hourRaw = cols[idx['Hour']]
    const studentsRaw = cols[idx['Students Sets']]
    const subject = (cols[idx['Subject']] ?? '').trim()
    const teachersRaw = cols[idx['Teachers']]
    const roomRaw = (cols[idx['Room']] ?? '').trim()

    const dayName = DAY_MAP.get(dayRaw?.trim()) ?? dayRaw?.trim()
    const hour = parseHourRange(hourRaw?.trim())
    if (!dayName || !hour || !subject) continue

    const teachers = splitPlus(teachersRaw)
    const students = splitPlus(studentsRaw)
    const classroom = roomRaw || 'Indefinido'

    const entry = {
      subject,
      size: 1,
      teachers,
      classroom,
      students,
      time: hour,
      color: '',
    }

    for (const teacher of teachers) {
      const dayMap = ensureEntity(teachersMap, teacher)
      if (!dayMap.has(dayName)) dayMap.set(dayName, [])
      dayMap.get(dayName).push(entry)
    }

    for (const student of students) {
      const dayMap = ensureEntity(studentsMap, student)
      if (!dayMap.has(dayName)) dayMap.set(dayName, [])
      dayMap.get(dayName).push(entry)
    }

    const roomName = classroom
    if (roomName && roomName !== 'Indefinido') {
      const dayMap = ensureEntity(roomsMap, roomName)
      if (!dayMap.has(dayName)) dayMap.set(dayName, [])
      dayMap.get(dayName).push(entry)
    }

    // Disciplinas (Subjects) - always create a page for the subject name
    {
      const dayMap = ensureEntity(subjectsMap, subject)
      if (!dayMap.has(dayName)) dayMap.set(dayName, [])
      dayMap.get(dayName).push(entry)
    }
  }

  function writeEntityDocs(map, dir, slugPrefix, filePrefix) {
    return Promise.all(
      Array.from(map.entries()).map(async ([name, dayMap]) => {
        sortAndMergeWeek(dayMap)
        const weekClasses = toWeekClasses(dayMap)
        const fileStem = `${filePrefix}${safeFileStem(name)}`
        const content = renderMdx({
          slugPrefix,
          description: name,
          title: name,
          weekClasses,
        })
        await writeFile(path.join(dir, `${fileStem}.mdx`), content, 'utf8')
      }),
    )
  }

  async function writeTurmaDocs(map) {
    const createdCourseDirs = new Set()
    await Promise.all(
      Array.from(map.entries()).map(async ([fullName, dayMap]) => {
        const { courseName, turmaLabel } = splitCourseAndTurma(fullName)
        const courseDirName = safeFileStem(courseName)
        const courseDir = path.join(turmaDir, courseDirName)

        if (!createdCourseDirs.has(courseDirName)) {
          createdCourseDirs.add(courseDirName)
          await mkdir(courseDir, { recursive: true })
          await writeFile(
            path.join(courseDir, '_category_.json'),
            JSON.stringify({ label: courseName, position: getCoursePosition(courseName) }, null, 2),
            'utf8',
          )
        } else {
          await mkdir(courseDir, { recursive: true })
        }

        sortAndMergeWeek(dayMap)
        const weekClasses = toWeekClasses(dayMap)
        const fileStem = `t_${safeFileStem(fullName)}`
        const content = renderMdx({
          slugPrefix: '/turma',
          description: fullName,
          title: fullName,
          sidebarLabel: turmaLabel,
          weekClasses,
        })
        await writeFile(path.join(courseDir, `${fileStem}.mdx`), content, 'utf8')
      }),
    )
  }

  await writeEntityDocs(teachersMap, professorDir, '/professor', 'p_')
  await writeTurmaDocs(studentsMap)
  await writeEntityDocs(roomsMap, salaDir, '/sala', 's_')
  await writeEntityDocs(subjectsMap, disciplinaDir, '/disciplina', 'd_')

  console.log(
    JSON.stringify(
      {
        professors: teachersMap.size,
        turmas: studentsMap.size,
        salas: roomsMap.size,
        disciplinas: subjectsMap.size,
      },
      null,
      2,
    ),
  )
}

await main()
