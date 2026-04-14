import { ItemContent } from '@site/src/css/ItemContent'
import { Classes } from '@site/src/interfaces/interfaces'
import { createColorByTeacher } from '@site/src/utils/create-color-by-teacher'
import { createURL } from '@site/src/utils/create-url-link'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import { createGridArea } from '../../utils/create-grid-area'
import Link from '@docusaurus/Link'
import { trackEvent } from '@site/src/utils/analytics'

export function Item(props: { timetable: Classes }) {
  const colorItem = (props.timetable.color ?? '0,0,0').split(',')

  const theme = {
    teacherBackground: `hsl(${colorItem[0]} ${
      Number(colorItem[1]) * 100
    }% 50%)`,
  }

  return (
    <ThemeProvider theme={theme}>
      <ItemContent>
        <strong className="subject" title={props.timetable.subject}>
          {props.timetable.subject}
        </strong>
        {props.timetable.links?.map((a) => {
          const entity =
            a.url.includes('/docs/professor/') ? 'professor' : a.url.includes('/docs/turma/') ? 'turma' : 'sala'
          return (
            <Link
              title={a.title}
              to={a.url}
              key={a.url}
              onClick={() =>
                trackEvent('timetable_related_link_click', {
                  entity,
                  title: a.title,
                  url: a.url,
                })
              }
            >
              {a.title}
            </Link>
          )
        })}
      </ItemContent>
    </ThemeProvider>
  )
}
