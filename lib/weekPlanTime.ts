/** Wochenplan-Raster: 6:00–22:00 in Viertelstunden (CET-Wanduhr, siehe lib/cetDate.ts). */
export const WEEK_PLAN_GRID_START_HOUR = 6
export const WEEK_PLAN_GRID_END_HOUR = 22
export const WEEK_PLAN_SLOT_MINUTES = 15

export function timeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return WEEK_PLAN_GRID_START_HOUR * 60
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return WEEK_PLAN_GRID_START_HOUR * 60
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function normalizeQuarterHourTime(time: string): string {
  const minutes = timeToMinutes(time)
  const rounded = Math.round(minutes / WEEK_PLAN_SLOT_MINUTES) * WEEK_PLAN_SLOT_MINUTES
  return minutesToTime(rounded)
}

/** Auswahlzeiten 06:00–22:00 in 15-Minuten-Schritten. */
export function weekPlanQuarterHourOptions(): string[] {
  const options: string[] = []
  const start = WEEK_PLAN_GRID_START_HOUR * 60
  const end = WEEK_PLAN_GRID_END_HOUR * 60
  for (let minutes = start; minutes <= end; minutes += WEEK_PLAN_SLOT_MINUTES) {
    options.push(minutesToTime(minutes))
  }
  return options
}

export function weekPlanGridStartMinutes(): number {
  return WEEK_PLAN_GRID_START_HOUR * 60
}

export function weekPlanGridEndMinutes(): number {
  return WEEK_PLAN_GRID_END_HOUR * 60
}

export function weekPlanGridRangeMinutes(): number {
  return weekPlanGridEndMinutes() - weekPlanGridStartMinutes()
}

export function weekPlanBlockStyle(startTime: string, endTime: string): { top: string; height: string } {
  const range = weekPlanGridRangeMinutes()
  const start = Math.max(weekPlanGridStartMinutes(), timeToMinutes(startTime))
  const end = Math.min(weekPlanGridEndMinutes(), Math.max(start + WEEK_PLAN_SLOT_MINUTES, timeToMinutes(endTime)))
  const topPct = ((start - weekPlanGridStartMinutes()) / range) * 100
  const heightPct = ((end - start) / range) * 100
  return { top: `${topPct}%`, height: `${Math.max(heightPct, 2)}%` }
}

export function weekPlanEndOptionsAfter(startTime: string): string[] {
  const minEnd = timeToMinutes(startTime) + WEEK_PLAN_SLOT_MINUTES
  return weekPlanQuarterHourOptions().filter((time) => timeToMinutes(time) >= minEnd)
}

/** Standard-Ende für neue Kalender-Aufgaben: nächste volle Stunde (9:15 → 10:00, 9:00 → 10:00). */
export function weekPlanDefaultEndTimeAfter(startTime: string): string {
  const startMinutes = timeToMinutes(startTime)
  const nextHourMinutes = (Math.floor(startMinutes / 60) + 1) * 60
  const gridEnd = weekPlanGridEndMinutes()
  let endMinutes = Math.min(nextHourMinutes, gridEnd)
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(startMinutes + WEEK_PLAN_SLOT_MINUTES, gridEnd)
  }
  return minutesToTime(endMinutes)
}

/** Standard-Ende: genau eine Stunde nach Start (für Heute-Defaults). */
export function weekPlanDefaultOneHourEndAfter(startTime: string): string {
  const startMinutes = timeToMinutes(startTime)
  const gridEnd = weekPlanGridEndMinutes()
  let endMinutes = Math.min(startMinutes + 60, gridEnd)
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(startMinutes + WEEK_PLAN_SLOT_MINUTES, gridEnd)
  }
  return minutesToTime(endMinutes)
}

export function weekPlanTimeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA
}

const WEEK_PLAN_DEFAULT_SLOT_START_HOUR = 8

/** Erste freie volle Stunde ab 8:00 (8–9, 9–10, …) ohne Überschneidung mit bestehenden Einträgen. */
export function weekPlanFindFreeHourSlot(
  entries: { startTime: string; endTime: string }[],
): { startTime: string; endTime: string } {
  const occupied = entries.map((entry) => ({
    start: timeToMinutes(entry.startTime),
    end: timeToMinutes(entry.endTime),
  }))

  for (let hour = WEEK_PLAN_DEFAULT_SLOT_START_HOUR; hour < WEEK_PLAN_GRID_END_HOUR; hour += 1) {
    const slotStart = hour * 60
    const slotEnd = slotStart + 60
    const overlaps = occupied.some((range) =>
      weekPlanTimeRangesOverlap(slotStart, slotEnd, range.start, range.end),
    )
    if (!overlaps) {
      return { startTime: minutesToTime(slotStart), endTime: minutesToTime(slotEnd) }
    }
  }

  return { startTime: '08:00', endTime: '09:00' }
}
