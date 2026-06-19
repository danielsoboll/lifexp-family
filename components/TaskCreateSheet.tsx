'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import TaskColorPicker from './TaskColorPicker'
import {
  TaskInlineInputRow,
  TaskSheetError,
  TaskSheetShell,
  TASK_SHEET_CANCEL_BUTTON_CLASS,
  TASK_SHEET_INPUT_CLASS,
} from './taskSheetUi'
import { useAutoFocusInput } from '../lib/useAutoFocusInput'
import { useTaskTextOkButton } from '../lib/useTaskTextOkButton'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import { PLUS_XP_TASK_BUDGET_BASE } from '../lib/plusXpBudget'
import { type TaskColorKey } from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import {
  createPlannerTask,
  taskPlannerPlusXpStats,
  type PlannerTask,
} from '../lib/tasks'

type TaskCreateSheetProps = {
  open: boolean
  tasks: PlannerTask[]
  taskDate: string
  plusXpBudget?: number
  onClose: () => void
  onCreated: () => void
  unlimitedPlusXp?: boolean
}

export default function TaskCreateSheet({
  open,
  tasks,
  taskDate,
  plusXpBudget = PLUS_XP_TASK_BUDGET_BASE,
  onClose,
  onCreated,
  unlimitedPlusXp = false,
}: TaskCreateSheetProps) {
  const [description, setDescription] = useState('')
  const [plusXpInput, setPlusXpInput] = useState('')
  const [colorKey, setColorKey] = useState<TaskColorKey>(1)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const descriptionRef = useRef<HTMLInputElement>(null)
  const xpRef = useRef<HTMLInputElement>(null)
  const saveInFlightRef = useRef(false)
  const viewport = useVisualViewportLayout()
  const { labels: colorLabels } = useTaskColorLabels()

  const { remainingXp } = taskPlannerPlusXpStats(tasks, plusXpBudget)

  const { showTextOk, onTextFocus, onTextBlur, handleTextOk } = useTaskTextOkButton({
    open,
    mode: 'create',
    onFirstAdvance: () => xpRef.current?.focus(),
  })

  useAutoFocusInput(descriptionRef, open, 'create')

  useEffect(() => {
    if (!open) {
      setDescription('')
      setPlusXpInput('')
      setColorKey(1)
      setErrorMessage('')
      setSubmitting(false)
    }
  }, [open])

  const onDescriptionOk = () => {
    if (!handleTextOk(description, descriptionRef)) {
      setErrorMessage('Bitte eine Aufgabe beschreiben.')
      return
    }
    setErrorMessage('')
  }

  const handleSave = useCallback(async () => {
    if (saveInFlightRef.current || submitting) return
    const trimmed = description.trim()
    if (!trimmed) {
      setErrorMessage('Bitte eine Aufgabe beschreiben.')
      return
    }

    const xp = parseInt(plusXpInput.replace(/\D/g, ''), 10)
    if (!Number.isFinite(xp) || xp <= 0) {
      setErrorMessage('Bitte Plus-XP eingeben.')
      xpRef.current?.focus()
      return
    }
    if (!unlimitedPlusXp && xp > remainingXp) {
      setErrorMessage(`Maximal noch ${remainingXp} von ${plusXpBudget} Plus-XP verfügbar.`)
      xpRef.current?.focus()
      return
    }

    saveInFlightRef.current = true
    setSubmitting(true)
    setErrorMessage('')
    const { error } = await createPlannerTask({
      title: trimmed,
      xpReward: xp,
      taskDate,
      skipPlusXpBudget: unlimitedPlusXp,
      colorKey,
    })
    saveInFlightRef.current = false
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    onCreated()
    onClose()
  }, [
    colorKey,
    description,
    onClose,
    onCreated,
    plusXpBudget,
    plusXpInput,
    remainingXp,
    submitting,
    taskDate,
    unlimitedPlusXp,
  ])

  const xpHint = unlimitedPlusXp
    ? 'Plus-XP dafür'
    : `Plus-XP dafür (noch ${remainingXp}/${plusXpBudget})`

  return (
    <TaskSheetShell
      open={open}
      title="Neue Aufgabe"
      titleId="task-create-sheet-title"
      viewport={viewport}
      submitting={submitting}
      onClose={onClose}
    >
      <div className="mt-4 flex flex-col gap-4">
        <TaskInlineInputRow
          id="task-description"
          label="Aufgabe"
          inputRef={descriptionRef}
          value={description}
          onChange={setDescription}
          onOk={onDescriptionOk}
          onFocus={onTextFocus}
          onBlur={onTextBlur}
          showOk={showTextOk}
          okDisabled={description.trim().length === 0}
          placeholder="Aufgabe beschreiben"
          disabled={submitting}
          autofillName="lifexp-task-description"
          enterKeyHint="next"
        />

        <TaskColorPicker
          value={colorKey}
          labels={colorLabels}
          onChange={setColorKey}
          disabled={submitting}
          id="task-create-color"
        />

        <div>
          <TaskInlineInputRow
            id="task-plus-xp"
            label={xpHint}
            inputRef={xpRef}
            value={plusXpInput}
            onChange={(value) => setPlusXpInput(value.replace(/\D/g, ''))}
            onOk={() => void handleSave()}
            showOk
            okDisabled={plusXpInput.trim().length === 0}
            placeholder="Plus-XP"
            disabled={submitting}
            inputMode="numeric"
            autofillName="lifexp-task-plus-xp"
            enterKeyHint="done"
            inputClassName={`${TASK_SHEET_INPUT_CLASS} text-center text-xl font-bold tabular-nums text-violet-950 dark:text-violet-100 border-violet-400 dark:border-violet-600 dark:bg-violet-950/40`}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={TASK_SHEET_CANCEL_BUTTON_CLASS}
        >
          Abbrechen
        </button>
      </div>

      <TaskSheetError message={errorMessage} />
    </TaskSheetShell>
  )
}
