import { Days, Time } from '../interfaces/interfaces'
import { findPositionY } from './find-position-y'
import { findPositionsUsed } from './find-positions-used'
// According to the positions used, find the min and max index of classes in the whole component. This way, we can cut off the empty space. But if the timetableView is equals to superCondensed, cut off ALL empty space.

interface ReduceTimetableProps {
  weekClasses: Days[]
  time: Time[]
  timetableView: string
}

interface ReduceTimetableReturn {
  weekClassesChanged: Days[]
  timeChanged: Time[]
  views: Array<{ weekClassesChanged: Days[]; timeChanged: Time[] }>
}

export function reduceTimetable({
  weekClasses,
  time,
  timetableView,
}: ReduceTimetableProps): ReduceTimetableReturn {
  weekClasses = findPositionY({ weekClasses, time })
  const positions = findPositionsUsed(weekClasses)

  // No classes case: keep a minimal empty view
  if (!positions.length) {
    return {
      timeChanged: time,
      weekClassesChanged: weekClasses,
      views: [{ timeChanged: time, weekClassesChanged: weekClasses }],
    }
  }

  const positionOfFirstClass = Math.min(...positions)
  const positionOfLastClass = Math.max(...positions) + 1

  if (timetableView === 'condensed') {
    time = time.slice(positionOfFirstClass, positionOfLastClass)
  } else if (timetableView === 'superCondensed') {
    // Super-condensed: split into contiguous "time segments" so that outlier blocks
    // (e.g. Saturday afternoon) don't force large empty spaces in other days.
    const uniquePositions = Array.from(new Set(positions)).sort((a, b) => a - b)

    const segments: Array<{ start: number; end: number }> = []
    let segStart = uniquePositions[0]
    let segEnd = uniquePositions[0]
    for (let i = 1; i < uniquePositions.length; i++) {
      const value = uniquePositions[i]
      if (value === segEnd + 1) {
        segEnd = value
      } else {
        segments.push({ start: segStart, end: segEnd })
        segStart = value
        segEnd = value
      }
    }
    segments.push({ start: segStart, end: segEnd })

    const buildView = (segment: { start: number; end: number }) => {
      const segTime = time.slice(segment.start, segment.end + 1)

      const segWeek = weekClasses
        .map((week) => {
          const dayClasses = week.dayClasses.filter((cell) => {
            const startIndex = (cell.positionY ?? 2) - 2
            const size = Math.max(1, cell.size ?? 1)
            const endExclusive = startIndex + size
            return segment.start < endExclusive && segment.end + 1 > startIndex
          })
          return { ...week, dayClasses }
        })
        .filter((week) => week.dayClasses.length !== 0)

      const segWeekWithPos = findPositionY({ weekClasses: segWeek, time: segTime })
      return { timeChanged: segTime, weekClassesChanged: segWeekWithPos }
    }

    const views = segments.map(buildView).filter((v) => v.weekClassesChanged.length > 0)

    const fallback = views[0] ?? { timeChanged: time, weekClassesChanged: weekClasses }
    return {
      timeChanged: fallback.timeChanged,
      weekClassesChanged: fallback.weekClassesChanged,
      views,
    }
  }

  weekClasses = findPositionY({ weekClasses, time })

  const weekClassesChanged = weekClasses
  const timeChanged = time
  return {
    timeChanged,
    weekClassesChanged,
    views: [{ timeChanged, weekClassesChanged }],
  }
}
