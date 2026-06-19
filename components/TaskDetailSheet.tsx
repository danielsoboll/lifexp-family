'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

import { SheetOverlayFrame, TASK_SHEET_OK_BUTTON_CLASS, TASK_SHEET_OK_BUTTON_INACTIVE_CLASS } from './taskSheetUi'
import TaskColorPicker from './TaskColorPicker'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { integerInputProps, oneLineTextInputProps } from '../lib/formInputAutofill'
import { useAutoFocusInput } from '../lib/useAutoFocusInput'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import { PLUS_XP_TASK_BUDGET_BASE } from '../lib/plusXpBudget'
import { type TaskColorKey } from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import {
  deletePlannerTask,
  plannerTodayDate,
  remainingTaskPlusXpExcluding,
  schedulePlannerTaskForTomorrow,
  updatePlannerTask,
  type PlannerTask,
} from '../lib/tasks'

type TaskDetailSheetProps = {
  open: boolean
  task: PlannerTask | null
  tasks: PlannerTask[]
  plusXpBudget?: number
  onClose: () => void
  onChanged: () => void
  unlimitedPlusXp?: boolean
  /** Parent (z. B. Zurück-Button) kann damit dieselbe Schließen-Logik wie der Overlay-Klick auslösen. */
  dismissRef?: MutableRefObject<(() => void) | null>
}

type EditField = 'overview' | 'title' | 'xp'

export default function TaskDetailSheet({
  open,
  task,
  tasks,
  plusXpBudget = PLUS_XP_TASK_BUDGET_BASE,
  onClose,
  onChanged,
  unlimitedPlusXp = false,
  dismissRef,
}: TaskDetailSheetProps) {
  const [editField, setEditField] = useState<EditField>('overview')
  const [title, setTitle] = useState('')
  const [xpReward, setXpReward] = useState(1)
  const [plusXpInput, setPlusXpInput] = useState('')
  const [colorKey, setColorKey] = useState<TaskColorKey>(1)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const xpRef = useRef<HTMLInputElement>(null)

  const viewport = useVisualViewportLayout()
  const { labels: colorLabels } = useTaskColorLabels()

  useAutoFocusInput(titleRef, open && editField === 'title', editField)
  useAutoFocusInput(xpRef, open && editField === 'xp', `${editField}-${title}`)

  useEffect(() => {
    if (!open || !task) {
      setEditField('overview')
      setErrorMessage('')
      setSubmitting(false)
      return
    }
    setTitle(task.title)
    setXpReward(task.xpReward)
    setPlusXpInput(String(task.xpReward))
    setColorKey(task.colorKey)
    setEditField('overview')
    setErrorMessage('')
  }, [open, task])

  const handleDismissRequest = useCallback(() => {
    if (submitting || !task) return
    onClose()
  }, [onClose, submitting, task])

  useEffect(() => {
    if (!dismissRef) return
    if (!open) {
      dismissRef.current = null
      return
    }
    dismissRef.current = handleDismissRequest
    return () => {
      dismissRef.current = null
    }
  }, [dismissRef, handleDismissRequest, open])

  if (!open || !task) return null

  const maxXp = remainingTaskPlusXpExcluding(tasks, task.id, plusXpBudget)
  const canScheduleForTomorrow = task.taskDate === plannerTodayDate() && !task.completedAt

  const openTitleEdit = () => {
    setErrorMessage('')
    setEditField('title')
  }

  const openXpEdit = () => {
    setErrorMessage('')
    setPlusXpInput(String(xpReward))
    setEditField('xp')
  }

  const confirmTitle = () => {
    if (!title.trim()) {
      setErrorMessage('Bitte eine Aufgabe beschreiben.')
      return
    }
    setErrorMessage('')
    setEditField('overview')
  }

  const saveAndReturnToList = async (nextXp: number, nextColorKey = colorKey) => {
    const hasChanges =
      title.trim() !== task.title || nextXp !== task.xpReward || nextColorKey !== task.colorKey

    if (!hasChanges) {
      onClose()
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    const { error } = await updatePlannerTask({
      taskId: task.id,
      title: title.trim() !== task.title ? title : undefined,
      xpReward: nextXp !== task.xpReward ? nextXp : undefined,
      colorKey: nextColorKey !== task.colorKey ? nextColorKey : undefined,
      allTasksOnDay: tasks,
      skipPlusXpBudget: unlimitedPlusXp,
    })
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    onChanged()
    onClose()
  }

  const confirmXp = async () => {
    const xp = parseInt(plusXpInput.replace(/\D/g, ''), 10)
    if (!Number.isFinite(xp) || xp <= 0) {
      setErrorMessage('Bitte Plus-XP eingeben.')
      return
    }
    if (!unlimitedPlusXp && xp > maxXp) {
      setErrorMessage(`Maximal ${maxXp} Plus-XP (Budget ${plusXpBudget}).`)
      return
    }

    setXpReward(xp)
    setErrorMessage('')
    await saveAndReturnToList(xp)
  }

  const handleColorChange = async (next: TaskColorKey) => {
    setColorKey(next)
    if (!task || next === task.colorKey) return
    setSubmitting(true)
    setErrorMessage('')
    const { error } = await updatePlannerTask({
      taskId: task.id,
      colorKey: next,
      allTasksOnDay: tasks,
      skipPlusXpBudget: unlimitedPlusXp,
    })
    setSubmitting(false)
    if (error) {
      setErrorMessage(error.message)
      setColorKey(task.colorKey)
      return
    }
    onChanged()
  }

  const handleScheduleForTomorrow = async () => {
    setSubmitting(true)
    setErrorMessage('')
    const { error } = await schedulePlannerTaskForTomorrow(task.id)
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    onChanged()
    onClose()
  }

  const handleDelete = async () => {
    setSubmitting(true)
    setErrorMessage('')
    const { error } = await deletePlannerTask(task.id)
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    onChanged()
    onClose()
  }

  const sheetPaddingBottom = viewport.keyboardOpen
    ? `max(0.75rem, ${viewport.keyboardHeight}px)`
    : 'max(1rem, env(safe-area-inset-bottom))'

  const sheetSizeClass =
    editField === 'overview' && !viewport.keyboardOpen
      ? 'min-h-[min(52vh,28rem)]'
      : ''

  return (
    <SheetOverlayFrame
      viewport={viewport}
      onDismiss={onClose}
      dismissDisabled={submitting}
      titleId="task-detail-sheet-title"
      sheetClassName={`lifexp-bottom-sheet relative z-10 mx-auto flex w-full max-w-md flex-col rounded-t-[1.75rem] border-t-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-200/95 px-4 pt-3 shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.28)] dark:border-stone-600 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 ${sheetSizeClass}`}
      sheetStyle={{ paddingBottom: sheetPaddingBottom }}
    >
      <div className="mb-3 flex justify-center">
        <span className="h-1 w-9 rounded-full bg-stone-400 dark:bg-stone-600" aria-hidden />
      </div>

        {editField === 'overview' ? (
          <>
            <h2 id="task-detail-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Aufgabe
            </h2>
            <div className="mt-4 flex flex-1 flex-col gap-3">
              <button
                type="button"
                onClick={openTitleEdit}
                className={`${PRESSABLE_3D_CLASS} rounded-2xl border-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-300/70 px-4 py-3 text-left ring-1 ring-stone-500/15 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Aufgabentext
                </p>
                <p className="mt-1 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{title}</p>
              </button>

              <button
                type="button"
                onClick={openXpEdit}
                className={`${PRESSABLE_3D_CLASS} rounded-2xl border-2 border-violet-300/90 bg-gradient-to-b from-violet-50 via-violet-100/90 to-violet-200/75 px-4 py-3 text-left ring-1 ring-violet-300/35 dark:border-violet-700 dark:from-violet-950/45 dark:via-violet-900/35 dark:to-violet-950`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80 dark:text-violet-200/90">
                  Plus-XP
                </p>
                <p className="mt-1 text-xl font-black tabular-nums text-violet-950 dark:text-violet-100">
                  +{xpReward} XP
                </p>
              </button>

              <TaskColorPicker
                value={colorKey}
                labels={colorLabels}
                onChange={(next) => void handleColorChange(next)}
                disabled={submitting}
                id="task-detail-color"
              />

              <button
                type="button"
                onClick={() => void saveAndReturnToList(xpReward)}
                disabled={submitting}
                className={`${PRESSABLE_3D_CLASS} mt-auto w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60 dark:border-emerald-500`}
              >
                OK
              </button>

              {canScheduleForTomorrow ? (
                <button
                  type="button"
                  onClick={() => void handleScheduleForTomorrow()}
                  disabled={submitting}
                  className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-violet-400/90 bg-gradient-to-b from-violet-50 via-violet-100/95 to-violet-200/80 px-4 py-3.5 text-sm font-bold text-violet-950 disabled:opacity-60 dark:border-violet-600 dark:from-violet-950/55 dark:via-violet-900/45 dark:to-violet-950 dark:text-violet-100`}
                >
                  {submitting ? 'Wird eingeplant …' : 'Aufgabe für morgen einplanen'}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={submitting}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-red-400/90 bg-gradient-to-b from-red-50 to-red-100/90 px-4 py-3.5 text-sm font-bold text-red-900 disabled:opacity-60 dark:border-red-800 dark:from-red-950/50 dark:to-red-950 dark:text-red-100`}
              >
                {submitting ? 'Löschen …' : 'Aufgabe löschen'}
              </button>
            </div>
          </>
        ) : null}

        {editField === 'title' ? (
          <div className="mt-1">
            <h2 id="task-detail-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Beschreibung
            </h2>
            <div className="mt-4 flex items-center gap-2">
              <label className="sr-only" htmlFor="task-edit-description">
                Aufgabe beschreiben
              </label>
              <input
                id="task-edit-description"
                ref={titleRef}
                {...oneLineTextInputProps('lifexp-task-description')}
                enterKeyHint="done"
                placeholder="Aufgabe beschreiben"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirmTitle()
                  }
                }}
                className="min-w-0 flex-1 rounded-2xl border-2 border-stone-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 dark:border-stone-600 dark:bg-stone-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={confirmTitle}
                disabled={title.trim().length === 0}
                className={
                  title.trim().length === 0 ? TASK_SHEET_OK_BUTTON_INACTIVE_CLASS : TASK_SHEET_OK_BUTTON_CLASS
                }
              >
                OK
              </button>
            </div>
          </div>
        ) : null}

        {editField === 'xp' ? (
          <div className="mt-1">
            <h2 id="task-detail-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Plus-XP
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{title.trim()}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {unlimitedPlusXp
                ? 'Plus-XP dafür'
                : `Plus-XP dafür (max. ${maxXp} von ${plusXpBudget})`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <label className="sr-only" htmlFor="task-edit-plus-xp">
                Plus-XP
              </label>
              <input
                id="task-edit-plus-xp"
                ref={xpRef}
                {...integerInputProps('lifexp-task-plus-xp')}
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="Plus-XP"
                value={plusXpInput}
                disabled={submitting}
                onChange={(event) => setPlusXpInput(event.target.value.replace(/\D/g, ''))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void confirmXp()
                  }
                }}
                className="min-w-0 flex-1 rounded-2xl border-2 border-violet-400 bg-white px-4 py-3.5 text-center text-xl font-bold tabular-nums text-violet-950 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100"
              />
              <button
                type="button"
                onClick={() => void confirmXp()}
                disabled={submitting || plusXpInput.trim().length === 0}
                className={
                  plusXpInput.trim().length === 0 ? TASK_SHEET_OK_BUTTON_INACTIVE_CLASS : TASK_SHEET_OK_BUTTON_CLASS
                }
              >
                OK
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
    </SheetOverlayFrame>
  )
}
