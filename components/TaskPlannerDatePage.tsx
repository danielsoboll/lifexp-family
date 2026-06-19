'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { areaInfoHref, AREA_INFO_SUBAREA } from '../lib/areaInfoNav'
import TaskCreateSheet from './TaskCreateSheet'
import TaskDetailSheet from './TaskDetailSheet'
import PageHeaderBar from './PageHeaderBar'
import TaskColorEigeneLink from './TaskColorEigeneLink'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { dateInputProps } from '../lib/formInputAutofill'
import { plannerTaskDoneCardClass, taskColorDefinition } from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import {
  fetchPlannerTasks,
  formatPlannerDateDe,
  plannerDayAfterTomorrowDate,
  validateCustomPlannerTaskDate,
  type PlannerTask,
} from '../lib/tasks'

export default function TaskPlannerDatePage() {
  const minDate = plannerDayAfterTomorrowDate()
  const [dateInput, setDateInput] = useState('')
  const [taskDate, setTaskDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null)
  const dismissTaskDetailRef = useRef<(() => void) | null>(null)
  const { hasCustomLabels } = useTaskColorLabels()
  const overlayOpen = selectedTask !== null || sheetOpen

  const closeTaskSheets = () => {
    setSelectedTask(null)
    setSheetOpen(false)
  }

  const taskCardClass = (task: PlannerTask) =>
    task.completedAt
      ? plannerTaskDoneCardClass()
      : `${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 px-4 py-3 text-left ring-1 ${taskColorDefinition(task.colorKey).plannerOpenClass}`

  const loadTasks = useCallback(async (date: string) => {
    setLoading(true)
    const { tasks: rows, error } = await fetchPlannerTasks(date)
    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setTasks(rows.filter((task) => task.taskDate === date))
  }, [])

  useEffect(() => {
    if (!taskDate) return
    void loadTasks(taskDate)
  }, [taskDate, loadTasks])

  const applyDate = () => {
    const { valid, error } = validateCustomPlannerTaskDate(dateInput)
    if (!valid) {
      setTaskDate(null)
      setTasks([])
      setErrorMessage(error?.message ?? 'Ungültiges Datum.')
      return
    }
    setErrorMessage('')
    setTaskDate(dateInput)
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div
        className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}
      >
        <PageHeaderBar
          backHref="/plus/aufgabenplaner"
          infoHref={areaInfoHref('/plus/aufgabenplaner/datum')}
          infoLabel={`Info zu ${AREA_INFO_SUBAREA.plus.datum}`}
          headerSecondaryAction={<TaskColorEigeneLink hasCustomLabels={hasCustomLabels} />}
          onBackClick={(event) => {
            if (overlayOpen) {
              event.preventDefault()
              closeTaskSheets()
            }
          }}
        />

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Plane Aktionen zu einem Datum
          </h1>
          {taskDate ? (
            <p className="mt-1 text-sm font-medium text-violet-800/90 dark:text-violet-200/85">
              {formatPlannerDateDe(taskDate)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Wähle ein Datum ab übermorgen.
            </p>
          )}
        </header>

        <section className="mb-5 rounded-2xl border-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-200/80 px-4 py-3 ring-1 ring-stone-500/15 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950 dark:ring-stone-700/35">
          <label htmlFor="planner-custom-date" className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Datum
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="planner-custom-date"
              {...dateInputProps()}
              min={minDate}
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border-2 border-stone-400 bg-white px-3 py-2.5 text-base font-semibold tabular-nums text-slate-900 dark:border-stone-600 dark:bg-stone-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={applyDate}
              className={`${PRESSABLE_3D_CLASS} shrink-0 rounded-xl border-2 border-violet-500 bg-gradient-to-b from-violet-50 via-violet-100 to-violet-200/90 px-4 py-2.5 text-sm font-bold text-violet-950 dark:border-violet-600 dark:from-violet-950/55 dark:via-violet-900/45 dark:to-violet-950 dark:text-violet-100`}
            >
              Datum übernehmen
            </button>
          </div>
        </section>

        {errorMessage ? (
          <p
            className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {!taskDate ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bitte zuerst ein Datum wählen und übernehmen.
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aufgaben werden geladen …</p>
        ) : tasks.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Noch keine Aufgaben für dieses Datum geplant.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <li key={task.id}>
                {task.completedAt ? (
                  <div className={taskCardClass(task)} aria-label={`${task.title}, erledigt`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-emerald-950 dark:text-emerald-100">
                        {task.title}
                      </p>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full border-2 border-emerald-500/90 bg-emerald-100/90 px-2.5 py-1 text-xs font-black tabular-nums text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100">
                          +{task.xpReward} XP
                        </span>
                        <span className="text-[0.65rem] font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                          erledigt
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className={taskCardClass(task)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                        {task.title}
                      </p>
                      <span className="shrink-0 rounded-full border-2 border-violet-400/90 bg-violet-100 px-2.5 py-1 text-xs font-black tabular-nums text-violet-950 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100">
                        +{task.xpReward} XP
                      </span>
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {taskDate ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-stone-400/90 bg-stone-100/50 px-4 py-3 dark:border-stone-600 dark:bg-stone-900/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">neue Aufgabe anlegen</p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                disabled={loading}
                aria-label="Neue Aufgabe anlegen"
                className={`${PRESSABLE_3D_CLASS} flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 text-3xl font-black leading-none text-white disabled:opacity-60 dark:border-emerald-500`}
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-[max(3rem,env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      </div>

      {taskDate ? (
        <>
          <TaskCreateSheet
            open={sheetOpen}
            tasks={tasks}
            taskDate={taskDate}
            unlimitedPlusXp
            onClose={() => setSheetOpen(false)}
            onCreated={() => void loadTasks(taskDate)}
          />

          <TaskDetailSheet
            open={selectedTask !== null}
            task={selectedTask}
            tasks={tasks}
            unlimitedPlusXp
            onClose={() => setSelectedTask(null)}
            onChanged={() => void loadTasks(taskDate)}
            dismissRef={dismissTaskDetailRef}
          />
        </>
      ) : null}
    </main>
  )
}
