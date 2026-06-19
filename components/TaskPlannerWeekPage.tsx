'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { areaInfoHref, AREA_INFO_SUBAREA } from '../lib/areaInfoNav'
import PageHeaderBar from './PageHeaderBar'
import TaskColorEigeneLink from './TaskColorEigeneLink'
import WeekPlanTaskSheet from './WeekPlanTaskSheet'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { cetFormatDayMonth, cetToday, cetWeekdayShort } from '../lib/cetDate'
import {
  taskColorDefinition,
  weekPlanDoneBlockClass,
  weekPlanDoneCheckboxBorderClass,
} from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import {
  fetchWeekPlanForCurrentWeek,
  updateWeekPlanEntry,
  type WeekPlanEntry,
} from '../lib/weekPlan'
import { advanceWeekPlanDisplayWeek, canShowWeekPlanNextWeekButton } from '../lib/weekPlanAnchor'
import { weekPlanColumnLayoutsForDay } from '../lib/weekPlanLayout'
import {
  WEEK_PLAN_GRID_END_HOUR,
  WEEK_PLAN_GRID_START_HOUR,
} from '../lib/weekPlanTime'

const HOUR_PX = 48
const HOUR_COUNT = WEEK_PLAN_GRID_END_HOUR - WEEK_PLAN_GRID_START_HOUR
const GRID_HEIGHT_PX = HOUR_COUNT * HOUR_PX
const HOUR_LABELS = Array.from(
  { length: HOUR_COUNT + 1 },
  (_, index) => WEEK_PLAN_GRID_START_HOUR + index,
)

export default function TaskPlannerWeekPage() {
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [entries, setEntries] = useState<WeekPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editEntryId, setEditEntryId] = useState<number | null>(null)
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [togglingDoneId, setTogglingDoneId] = useState<number | null>(null)
  const [confirmNextWeekOpen, setConfirmNextWeekOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const today = cetToday()
  const showNextWeekButton = canShowWeekPlanNextWeekButton()
  const { hasCustomLabels } = useTaskColorLabels()

  const loadWeek = useCallback(async () => {
    setLoading(true)
    const { entries: rows, weekDates: dates, error } = await fetchWeekPlanForCurrentWeek()
    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setWeekDates(dates)
    setEntries(rows)
    const todayIdx = dates.indexOf(today)
    setActiveDayIndex(todayIdx >= 0 ? todayIdx : 0)
  }, [today])

  useEffect(() => {
    void loadWeek()
  }, [loadWeek])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || weekDates.length === 0 || loading) return
    const todayIdx = weekDates.indexOf(today)
    const index = todayIdx >= 0 ? todayIdx : 0
    requestAnimationFrame(() => {
      el.scrollLeft = index * el.clientWidth
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = el.scrollLeft
      }
      setActiveDayIndex(index)
    })
  }, [weekDates, loading, today])

  const syncScroll = (source: HTMLDivElement) => {
    const left = source.scrollLeft
    const width = source.clientWidth || 1
    const index = Math.max(0, Math.min(weekDates.length - 1, Math.round(left / width)))
    setActiveDayIndex(index)
    if (headerScrollRef.current && headerScrollRef.current !== source) {
      headerScrollRef.current.scrollLeft = left
    }
    if (scrollRef.current && scrollRef.current !== source) {
      scrollRef.current.scrollLeft = left
    }
  }

  const entriesForDay = (planDay: string) =>
    entries.filter((entry) => entry.planDay === planDay)

  const columnLayoutsByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof weekPlanColumnLayoutsForDay>>()
    for (const date of weekDates) {
      const dayEntries = entries.filter((entry) => entry.planDay === date)
      map.set(
        date,
        weekPlanColumnLayoutsForDay(
          dayEntries.map((entry) => ({
            id: entry.id,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })),
        ),
      )
    }
    return map
  }, [weekDates, entries])

  const openCreate = () => {
    setEditEntryId(null)
    setSheetOpen(true)
  }

  const openEdit = (entry: WeekPlanEntry) => {
    setEditEntryId(entry.id)
    setSheetOpen(true)
  }

  const handleSaved = (entry: WeekPlanEntry) => {
    setEntries((current) => {
      const without = current.filter((row) => row.id !== entry.id)
      return [...without, entry].sort(
        (a, b) =>
          a.planDay.localeCompare(b.planDay) ||
          a.startTime.localeCompare(b.startTime) ||
          a.id - b.id,
      )
    })
  }

  const handleDeleted = (id: number) => {
    setEntries((current) => current.filter((row) => row.id !== id))
  }

  const toggleDone = async (entry: WeekPlanEntry) => {
    setTogglingDoneId(entry.id)
    setErrorMessage('')
    const nextDone = !entry.done
    const { error } = await updateWeekPlanEntry(entry.id, { done: nextDone })
    setTogglingDoneId(null)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    handleSaved({ ...entry, done: nextDone })
  }

  const confirmAdvanceWeek = () => {
    advanceWeekPlanDisplayWeek()
    setConfirmNextWeekOpen(false)
    void loadWeek()
  }

  const nextWeekButton = (
    <button
      type="button"
      onClick={() => setConfirmNextWeekOpen(true)}
      className={`${PRESSABLE_3D_CLASS} rounded-xl border-2 border-orange-400 bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200/95 px-3.5 py-2.5 text-sm font-black leading-tight text-orange-950 shadow-sm ring-1 ring-orange-300/60 min-[390px]:px-4 min-[390px]:py-3 min-[390px]:text-base dark:border-orange-600 dark:from-orange-950/50 dark:via-orange-900/45 dark:to-orange-950 dark:text-orange-100 dark:ring-orange-800/40`}
    >
      → nächste Woche
    </button>
  )

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/plus/aufgabenplaner"
          infoHref={areaInfoHref('/plus/aufgabenplaner/woche')}
          infoLabel={`Info zu ${AREA_INFO_SUBAREA.plus.woche}`}
          headerSecondaryAction={
            <>
              <TaskColorEigeneLink hasCustomLabels={hasCustomLabels} />
              {showNextWeekButton ? <div className="mt-2">{nextWeekButton}</div> : null}
            </>
          }
        />

        <header className="mb-4 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300/80 bg-gradient-to-b from-sky-50 via-sky-100/95 to-sky-200/80 text-3xl ring-1 ring-sky-200/60 dark:border-sky-700 dark:from-sky-950/50 dark:via-sky-900/40 dark:to-sky-950 dark:ring-sky-800/50"
            aria-hidden
          >
            📅
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Wochenplan</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mo–So, 6–22 Uhr</p>
          </div>
        </header>

        <button
          type="button"
          onClick={openCreate}
          className={`${PRESSABLE_3D_CLASS} mb-4 w-full rounded-2xl border-2 border-sky-500 bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-3.5 text-sm font-bold text-white dark:border-sky-500 dark:from-sky-600 dark:to-sky-800`}
        >
          Neue Aufgabe anlegen
        </button>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Laden …</p>
        ) : null}

        {errorMessage ? (
          <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {weekDates.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-slate-300/90 bg-slate-50/90 dark:border-slate-600 dark:bg-slate-900/50">
            <div className="flex border-b border-slate-300/80 dark:border-slate-600">
              <div className="w-11 shrink-0" aria-hidden />
              <div
                ref={headerScrollRef}
                className="flex flex-1 overflow-x-hidden"
                aria-hidden
              >
                {weekDates.map((date, index) => {
                  const isToday = date === today
                  const isActive = index === activeDayIndex
                  return (
                    <div
                      key={date}
                      className={`flex w-full shrink-0 flex-col items-center px-1 py-2 text-center transition-colors ${
                        isToday
                          ? 'bg-sky-100/90 font-bold text-sky-900 dark:bg-sky-950/60 dark:text-sky-100'
                          : isActive
                            ? 'bg-slate-100/80 dark:bg-slate-800/80'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-bold">{cetWeekdayShort(date)}</span>
                      <span className="text-[10px] tabular-nums">{cetFormatDayMonth(date)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-y-auto">
              <div
                className="w-11 shrink-0 border-r border-slate-300/70 dark:border-slate-600"
                style={{ height: GRID_HEIGHT_PX }}
                aria-hidden
              >
                {HOUR_LABELS.map((hour) => (
                  <div
                    key={hour}
                    className="flex items-start justify-end pr-1 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400"
                    style={{ height: hour < WEEK_PLAN_GRID_END_HOUR ? HOUR_PX : 0 }}
                  >
                    {hour < WEEK_PLAN_GRID_END_HOUR ? `${hour}:00` : null}
                  </div>
                ))}
              </div>

              <div
                ref={scrollRef}
                className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
                onScroll={(event) => syncScroll(event.currentTarget)}
              >
                {weekDates.map((date) => (
                  <div
                    key={date}
                    className="relative w-full shrink-0 snap-start border-r border-slate-200/80 last:border-r-0 dark:border-slate-700"
                    style={{ height: GRID_HEIGHT_PX }}
                  >
                    {HOUR_LABELS.slice(0, -1).map((hour) => (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-slate-200/70 dark:border-slate-700/80"
                        style={{ top: (hour - WEEK_PLAN_GRID_START_HOUR) * HOUR_PX }}
                        aria-hidden
                      />
                    ))}
                    {entriesForDay(date).map((entry) => {
                      const layout = columnLayoutsByDay.get(date)?.get(entry.id)
                      if (!layout) return null
                      const colorDef = taskColorDefinition(entry.colorKey)
                      const cardClass = entry.done
                        ? weekPlanDoneBlockClass()
                        : `${colorDef.weekOpenClass} ${colorDef.weekOpenTextClass}`
                      const checkboxBorderClass = entry.done
                        ? weekPlanDoneCheckboxBorderClass()
                        : colorDef.weekOpenCheckboxBorderClass
                      const narrow = layout.columnCount > 1
                      return (
                        <div
                          key={entry.id}
                          className={`absolute z-10 flex overflow-hidden rounded-md border shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${cardClass}`}
                          style={{
                            top: layout.top,
                            height: layout.height,
                            left: layout.left,
                            width: layout.width,
                            minHeight: '1.75rem',
                            zIndex: 10 + layout.column,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(entry)}
                            className={`min-w-0 flex-1 text-left leading-tight ${narrow ? 'px-1 py-0.5' : 'px-1.5 py-0.5'}`}
                            title={`${entry.task} (${entry.startTime}–${entry.endTime})`}
                          >
                            <span
                              className={`line-clamp-2 font-semibold ${narrow ? 'text-[10px]' : 'text-xs'}`}
                            >
                              {entry.task}
                            </span>
                            <span className="block text-[9px] font-medium opacity-90 tabular-nums">
                              {entry.startTime}–{entry.endTime}
                            </span>
                          </button>
                          <label
                            className={`flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 self-stretch border-l ${narrow ? 'px-1' : 'px-1.5'} ${checkboxBorderClass} ${togglingDoneId === entry.id ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={entry.done}
                              disabled={togglingDoneId !== null}
                              onChange={() => void toggleDone(entry)}
                              className={`shrink-0 cursor-pointer rounded-md border-2 border-emerald-600 accent-emerald-600 dark:border-emerald-500 ${narrow ? 'h-5 w-5' : 'h-6 w-6'}`}
                              aria-label={`${entry.task} als erledigt markieren`}
                            />
                            {!narrow ? (
                              <span
                                className={`text-[0.6rem] font-black uppercase leading-none tracking-wide ${
                                  entry.done ? 'text-white' : 'text-emerald-800 dark:text-emerald-300'
                                }`}
                              >
                                erledigt
                              </span>
                            ) : null}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Wische links/rechts zwischen den Tagen · Vorwoche nicht sichtbar
        </p>

        <div className="min-h-[max(3rem,env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      </div>

      <WeekPlanTaskSheet
        open={sheetOpen}
        entryId={editEntryId}
        weekDates={weekDates}
        defaultPlanDay={weekDates[activeDayIndex]}
        entries={entries}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      {confirmNextWeekOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Abbrechen"
            onClick={() => setConfirmNextWeekOpen(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border-2 border-orange-300 bg-white px-5 py-5 shadow-xl dark:border-orange-700 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="week-plan-next-week-title"
          >
            <h2
              id="week-plan-next-week-title"
              className="text-center text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Willst du eine Woche weiter springen?
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
              Die Planung für diese Woche findest du ab dann in der Historie.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmAdvanceWeek}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-orange-400 bg-gradient-to-b from-orange-50 to-orange-200 px-4 py-3 text-base font-bold text-orange-950 dark:border-orange-600 dark:from-orange-950/50 dark:to-orange-900 dark:text-orange-100`}
              >
                Ja, weiter springen
              </button>
              <button
                type="button"
                onClick={() => setConfirmNextWeekOpen(false)}
                className="w-full rounded-2xl border-2 border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-stone-600 dark:bg-stone-900 dark:text-slate-200"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
