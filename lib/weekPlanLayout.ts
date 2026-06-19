import {
  timeToMinutes,
  weekPlanBlockStyle,
  weekPlanTimeRangesOverlap,
} from './weekPlanTime'

export type WeekPlanLayoutEntry = {
  id: number
  startTime: string
  endTime: string
}

export type WeekPlanColumnLayout = {
  top: string
  height: string
  left: string
  width: string
  column: number
  columnCount: number
}

const COLUMN_GAP_PCT = 1.5

/** Nebeneinander-Layout für zeitlich überlappende Einträge eines Tages. */
export function weekPlanColumnLayoutsForDay(
  entries: WeekPlanLayoutEntry[],
): Map<number, WeekPlanColumnLayout> {
  const result = new Map<number, WeekPlanColumnLayout>()
  if (entries.length === 0) return result

  const sorted = [...entries].sort((a, b) => {
    const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    if (startDiff !== 0) return startDiff
    return a.id - b.id
  })

  const columnEnds: number[] = []
  const columnById = new Map<number, number>()

  for (const entry of sorted) {
    const start = timeToMinutes(entry.startTime)
    const end = timeToMinutes(entry.endTime)
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(end)
    } else {
      columnEnds[column] = end
    }
    columnById.set(entry.id, column)
  }

  for (const entry of sorted) {
    const start = timeToMinutes(entry.startTime)
    const end = timeToMinutes(entry.endTime)
    const overlapping = sorted.filter((other) => {
      const otherStart = timeToMinutes(other.startTime)
      const otherEnd = timeToMinutes(other.endTime)
      return weekPlanTimeRangesOverlap(start, end, otherStart, otherEnd)
    })
    const column = columnById.get(entry.id) ?? 0
    const columnCount = Math.max(...overlapping.map((other) => columnById.get(other.id) ?? 0)) + 1
    const block = weekPlanBlockStyle(entry.startTime, entry.endTime)
    const slotWidth = 100 / columnCount
    const width = Math.max(slotWidth - COLUMN_GAP_PCT, slotWidth * 0.82)
    const left = column * slotWidth + COLUMN_GAP_PCT / 2

    result.set(entry.id, {
      top: block.top,
      height: block.height,
      left: `${left}%`,
      width: `${width}%`,
      column,
      columnCount,
    })
  }

  return result
}
