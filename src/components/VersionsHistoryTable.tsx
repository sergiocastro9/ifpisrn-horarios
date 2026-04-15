import React from 'react'
import Link from '@docusaurus/Link'

type VersionRow = {
  id: string
  version: string
  start: string
  end?: string | null
}

function formatIsoToBr(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso))
  if (!match) return iso
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

function getData(): { current: VersionRow; history: VersionRow[] } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data = require('@site/src/data/siteVersions.json') as {
    current: VersionRow
    history: VersionRow[]
  }
  return data
}

export default function VersionsHistoryTable() {
  const { current, history } = getData()
  const rows: VersionRow[] = [current, ...history]

  return (
    <table>
      <thead>
        <tr>
          <th>Versão</th>
          <th style={{ textAlign: 'center' }}>Início</th>
          <th style={{ textAlign: 'center' }}>Fim</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isCurrent = row.id === 'current'
          const start = formatIsoToBr(row.start)
          const end = isCurrent ? 'Atual' : row.end ? formatIsoToBr(row.end) : '—'
          const to = isCurrent ? '/docs/intro' : `/docs/${row.id}/intro`

          return (
            <tr key={`${row.id}-${row.version}`}>
              <td>
                {isCurrent ? row.version : <Link to={to}>{row.version}</Link>}
              </td>
              <td style={{ textAlign: 'center' }}>{start}</td>
              <td style={{ textAlign: 'center' }}>{end}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

