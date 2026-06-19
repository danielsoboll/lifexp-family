'use client'

import { useCallback, useEffect, useState } from 'react'

import { completePlannerTask, fetchOpenPlannerTasksForToday, type PlannerTask } from '../lib/tasks'

type PlusPersonalTasksProps = {
  onTaskCompleted?: () => void
}

export default function PlusPersonalTasks({ onTaskCompleted }: PlusPersonalTasksProps) {
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const { tasks: rows, error } = await fetchOpenPlannerTasksForToday()
    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setTasks(rows)
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleComplete = async (task: PlannerTask) => {
    setCompletingId(task.id)
    setErrorMessage('')
    const { error } = await completePlannerTask(task.id)
    setCompletingId(null)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTasks((current) => current.filter((row) => row.id !== task.id))
    onTaskCompleted?.()
  }

  return (
    <section
      className="rounded-2xl border-2 border-violet-300/85 bg-gradient-to-b from-violet-50/90 via-violet-50/40 to-stone-100/80 p-4 ring-1 ring-violet-200/50 dark:border-violet-800 dark:from-violet-950/35 dark:via-violet-950/20 dark:to-stone-950/80 dark:ring-violet-900/40"
      aria-labelledby="plus-personal-tasks-heading"
    >
      <h2
        id="plus-personal-tasks-heading"
        className="text-sm font-bold uppercase tracking-wide text-violet-950 dark:text-violet-100"
      >
        Persönliche Aufgaben
      </h2>

      {errorMessage ? (
        <p
          className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-violet-900/70 dark:text-violet-200/80">Aufgaben werden geladen …</p>
      ) : tasks.length === 0 ? (
        <p className="mt-3 text-sm text-violet-900/70 dark:text-violet-200/80">Keine offenen Aufgaben für heute.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-300/70 px-3 py-3 ring-1 ring-stone-500/15 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950 dark:ring-stone-700/35"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                  {task.title}
                </p>
                <span className="justify-self-center rounded-full border-2 border-violet-400/90 bg-violet-100 px-2.5 py-1 text-xs font-black tabular-nums text-violet-950 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100">
                  +{task.xpReward} XP
                </span>
                <label
                  className={`flex shrink-0 cursor-pointer flex-col items-center gap-1 ${
                    completingId === task.id ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={completingId !== null}
                    onChange={() => void handleComplete(task)}
                    className="h-7 w-7 shrink-0 cursor-pointer rounded-md border-2 border-emerald-600 accent-emerald-600 dark:border-emerald-500"
                    aria-label={`${task.title} als erledigt markieren`}
                  />
                  <span className="text-[0.7rem] font-black uppercase leading-none tracking-wide text-emerald-800 dark:text-emerald-300">
                    erledigt
                  </span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
