'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { areaInfoHref, AREA_INFO_SUBAREA } from '../lib/areaInfoNav'
import PageHeaderBar from './PageHeaderBar'
import TaskColorEigeneLink from './TaskColorEigeneLink'
import TaskCreateSheet from './TaskCreateSheet'
import TaskDetailSheet from './TaskDetailSheet'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { PLUS_XP_TASK_BUDGET_BASE } from '../lib/plusXpBudget'
import { plannerTaskDoneCardClass, taskColorDefinition } from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import {
  fetchPlannerTasksForDay,
  fetchTaskPlannerPlusXpBudgetForProfile,
  plannerDateForDayLabel,
  taskPlannerPlusXpStats,
  transferPlannerTaskToToday,
  type PlannerDayFilter,
  type PlannerTask,
} from '../lib/tasks'

const PLANNER_DAY_SUBAREA: Record<PlannerDayFilter, string> = {
  gestern: AREA_INFO_SUBAREA.plus.gestern,
  heute: AREA_INFO_SUBAREA.plus.heute,
  morgen: AREA_INFO_SUBAREA.plus.morgen,
}

type TaskPlannerDayPageProps = {
  heading: string
  dayLabel: PlannerDayFilter
}

export default function TaskPlannerDayPage({ heading, dayLabel }: TaskPlannerDayPageProps) {
  const isGestern = dayLabel === 'gestern'
  const isMorgen = dayLabel === 'morgen'
  const taskDate = plannerDateForDayLabel(dayLabel)

  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null)
  const dismissTaskDetailRef = useRef<(() => void) | null>(null)
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [plusXpBudget, setPlusXpBudget] = useState(PLUS_XP_TASK_BUDGET_BASE)
  const { hasCustomLabels } = useTaskColorLabels()
  const overlayOpen = selectedTask !== null || sheetOpen

  const closeTaskSheets = () => {
    setSelectedTask(null)
    setSheetOpen(false)
  }

  const openTasks = tasks.filter((task) => !task.completedAt)
  const completedTasks = tasks.filter((task) => task.completedAt)
  const { earnedXp, remainingXp } = taskPlannerPlusXpStats(tasks, plusXpBudget)
  const canAddTask = remainingXp > 0
  const gesternEmpty = isGestern && !loading && tasks.length === 0
  const gesternOnlyCompleted =
    isGestern && !loading && completedTasks.length > 0 && openTasks.length === 0
  const showPlusXpBanner = !isGestern || (!loading && openTasks.length > 0)

  const taskCardClass = (task: PlannerTask) =>
    task.completedAt
      ? plannerTaskDoneCardClass()
      : `${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 px-4 py-3 text-left ring-1 ${taskColorDefinition(task.colorKey).plannerOpenClass}`

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const [{ tasks: rows, error }, { budget, error: budgetError }] = await Promise.all([
      fetchPlannerTasksForDay(dayLabel),
      fetchTaskPlannerPlusXpBudgetForProfile(),
    ])
    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    if (budgetError) {
      setErrorMessage(budgetError.message)
      return
    }
    setErrorMessage('')
    setPlusXpBudget(budget)
    setTasks(rows)
  }, [dayLabel])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleTransferToToday = async (task: PlannerTask) => {
    setTransferringId(task.id)
    setErrorMessage('')
    const { error } = await transferPlannerTaskToToday(task.id)
    setTransferringId(null)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTasks((current) => current.filter((row) => row.id !== task.id))
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div
        className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}
      >
        <PageHeaderBar
          backHref="/plus/aufgabenplaner"
          infoHref={areaInfoHref(`/plus/aufgabenplaner/${dayLabel}`)}
          infoLabel={`Info zu ${PLANNER_DAY_SUBAREA[dayLabel]}`}
          headerSecondaryAction={<TaskColorEigeneLink hasCustomLabels={hasCustomLabels} />}
          onBackClick={(event) => {
            if (overlayOpen) {
              event.preventDefault()
              closeTaskSheets()
            }
          }}
        />

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{heading}</h1>
        </header>

        {gesternEmpty ? (
          <section
            className="mb-5 rounded-2xl border-2 border-stone-300/90 bg-stone-100/80 px-4 py-3 ring-1 ring-stone-400/25 dark:border-stone-600 dark:bg-stone-900/40 dark:ring-stone-700/40"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Keine Aufgaben eingetragen</p>
          </section>
        ) : showPlusXpBanner ? (
          <section
            className="mb-5 rounded-2xl border-2 border-violet-300/85 bg-gradient-to-b from-violet-50 via-violet-100/90 to-violet-200/75 px-4 py-3 ring-1 ring-violet-300/35 dark:border-violet-700 dark:from-violet-950/45 dark:via-violet-900/35 dark:to-violet-950 dark:ring-violet-800/40"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/80 dark:text-violet-200/90">
              Plus-XP noch offen
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-violet-950 dark:text-violet-100">
              {remainingXp}
              <span className="text-lg font-bold text-violet-800/80 dark:text-violet-300/80">
                /{plusXpBudget}
              </span>
            </p>
            {earnedXp > 0 ? (
              <p className="mt-1 text-xs font-medium text-violet-900/75 dark:text-violet-200/80">
                {earnedXp} XP durch erledigte Aufgaben gutgeschrieben (Tagesbudget {plusXpBudget})
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-violet-900/65 dark:text-violet-200/70">
                Tagesbudget {plusXpBudget} Plus-XP für Aufgaben
              </p>
            )}
          </section>
        ) : gesternOnlyCompleted ? (
          <section
            className="mb-5 rounded-2xl border-2 border-emerald-300/85 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/75 px-4 py-3 ring-1 ring-emerald-300/35 dark:border-emerald-800 dark:from-emerald-950/45 dark:via-emerald-900/35 dark:to-emerald-950 dark:ring-emerald-800/40"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80 dark:text-emerald-200/90">
              Erledigt
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-950 dark:text-emerald-100">
              {earnedXp} Plus-XP gutgeschrieben — erledigte Aufgaben können nicht für heute übernommen werden.
            </p>
          </section>
        ) : null}

        {errorMessage ? (
          <p
            className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aufgaben werden geladen …</p>
        ) : gesternEmpty ? null : tasks.length === 0 ? (
          <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {isMorgen ? 'Noch keine Aufgaben für morgen geplant.' : `Noch keine Aufgaben für ${dayLabel}.`}
          </p>
        ) : isGestern ? (
          <ul className="flex flex-col gap-3">
            {completedTasks.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Erledigt
                </p>
                {completedTasks.map((task) => (
                  <li key={task.id}>
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
                  </li>
                ))}
              </>
            ) : null}
            {openTasks.length > 0 ? (
              <>
                {completedTasks.length > 0 ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Offen
                  </p>
                ) : null}
                {openTasks.map((task) => (
                  <li key={task.id}>
                    <div className="rounded-2xl border-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-300/70 px-3 py-3 ring-1 ring-stone-500/15 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950 dark:ring-stone-700/35">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                        <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                          {task.title}
                        </p>
                        <span className="justify-self-center rounded-full border-2 border-violet-400/90 bg-violet-100 px-2.5 py-1 text-xs font-black tabular-nums text-violet-950 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100">
                          +{task.xpReward} XP
                        </span>
                        <button
                          type="button"
                          disabled={transferringId === task.id}
                          onClick={() => void handleTransferToToday(task)}
                          className={`${PRESSABLE_3D_CLASS} max-w-[7.25rem] rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-2 py-2 text-[0.65rem] font-bold leading-tight text-white disabled:opacity-60 dark:border-emerald-500`}
                        >
                          {transferringId === task.id ? '…' : 'für heute übernehmen'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </>
            ) : null}
          </ul>
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

        {!isGestern ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-stone-400/90 bg-stone-100/50 px-4 py-3 dark:border-stone-600 dark:bg-stone-900/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">neue Aufgabe anlegen</p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                disabled={!canAddTask || loading}
                aria-label="Neue Aufgabe anlegen"
                className={`${PRESSABLE_3D_CLASS} flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 text-3xl font-black leading-none text-white disabled:cursor-not-allowed disabled:border-stone-400 disabled:from-stone-300 disabled:to-stone-400 disabled:text-stone-500 dark:border-emerald-500 dark:disabled:border-stone-700 dark:disabled:from-stone-800 dark:disabled:to-stone-900`}
              >
                +
              </button>
            </div>
            {!canAddTask && !loading ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Alle Plus-XP für {dayLabel} sind vergeben
                {earnedXp > 0 ? ` (${earnedXp} bereits gutgeschrieben).` : '.'}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-[max(3rem,env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      </div>

      {!isGestern ? (
        <>
          <TaskCreateSheet
            open={sheetOpen}
            tasks={tasks}
            taskDate={taskDate}
            plusXpBudget={plusXpBudget}
            onClose={() => setSheetOpen(false)}
            onCreated={() => void loadTasks()}
          />

          <TaskDetailSheet
            open={selectedTask !== null}
            task={selectedTask}
            tasks={tasks}
            plusXpBudget={plusXpBudget}
            onClose={() => setSelectedTask(null)}
            onChanged={() => void loadTasks()}
            dismissRef={dismissTaskDetailRef}
          />
        </>
      ) : null}
    </main>
  )
}
