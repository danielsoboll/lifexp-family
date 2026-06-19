'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import TaskColorPicker from './TaskColorPicker'
import {
  TaskInlineInputRow,
  TaskSheetCreateActions,
  TaskSheetError,
  TaskSheetShell,
  TASK_SHEET_CANCEL_BUTTON_CLASS,
  TASK_SHEET_INPUT_CLASS,
  TASK_SHEET_LABEL_CLASS,
  TASK_SHEET_OK_BUTTON_CLASS,
} from './taskSheetUi'
import { cetFormatDayMonth, cetToday, cetWeekdayShort } from '../lib/cetDate'
import { useAutoFocusInput } from '../lib/useAutoFocusInput'
import { useTaskTextOkButton } from '../lib/useTaskTextOkButton'
import { type TaskColorKey } from '../lib/taskColors'
import { useTaskColorLabels } from '../lib/useTaskColorLabels'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import {
  createWeekPlanEntry,
  defaultWeekPlanCreateValues,
  deleteWeekPlanEntry,
  fetchWeekPlanEntry,
  updateWeekPlanEntry,
  type WeekPlanEntry,
} from '../lib/weekPlan'
import {
  weekPlanDefaultEndTimeAfter,
  weekPlanEndOptionsAfter,
  weekPlanQuarterHourOptions,
} from '../lib/weekPlanTime'

type WeekPlanTaskSheetProps = {
  open: boolean
  entryId: number | null
  weekDates: string[]
  /** Kalendertag, der beim Anlegen sichtbar ist (z. B. morgen). */
  defaultPlanDay?: string
  entries?: WeekPlanEntry[]
  onClose: () => void
  onSaved: (entry: WeekPlanEntry) => void
  onDeleted: (id: number) => void
}

export default function WeekPlanTaskSheet({
  open,
  entryId,
  weekDates,
  defaultPlanDay,
  entries = [],
  onClose,
  onSaved,
  onDeleted,
}: WeekPlanTaskSheetProps) {
  const isEdit = entryId != null && entryId > 0

  const resolveCreateDefaults = useCallback(() => {
    const planDay =
      defaultPlanDay && weekDates.includes(defaultPlanDay)
        ? defaultPlanDay
        : weekDates.includes(cetToday())
          ? cetToday()
          : (weekDates[0] ?? cetToday())
    const dayEntries = entries.filter((entry) => entry.planDay === planDay)
    return defaultWeekPlanCreateValues(planDay, dayEntries)
  }, [defaultPlanDay, weekDates, entries])

  const defaults = resolveCreateDefaults()

  const [task, setTask] = useState('')
  const [planDay, setPlanDay] = useState(defaults.planDay)
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [done, setDone] = useState(false)
  const [colorKey, setColorKey] = useState<TaskColorKey>(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const createdIdRef = useRef<number | null>(null)
  const taskRef = useRef<HTMLInputElement>(null)
  const startSelectRef = useRef<HTMLSelectElement>(null)

  const viewport = useVisualViewportLayout()
  const { labels: colorLabels } = useTaskColorLabels()
  const timeOptions = weekPlanQuarterHourOptions()
  const endOptions = weekPlanEndOptionsAfter(startTime)

  useAutoFocusInput(taskRef, open && !isEdit && !loading, 'week-plan-create')

  const persistUpdate = useCallback(
    async (patch: Parameters<typeof updateWeekPlanEntry>[1]) => {
      const id = createdIdRef.current ?? entryId
      if (!id) return
      setSaving(true)
      const { error } = await updateWeekPlanEntry(id, patch)
      setSaving(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      const { entry } = await fetchWeekPlanEntry(id)
      if (entry) onSaved(entry)
    },
    [entryId, onSaved],
  )

  const persistTaskTextRef = useRef(persistUpdate)
  persistTaskTextRef.current = persistUpdate

  const { showTextOk, onTextFocus, onTextBlur, handleTextOk, syncConfirmedText } = useTaskTextOkButton({
    open,
    mode: isEdit ? 'edit' : 'create',
    onFirstAdvance: () => {
      taskRef.current?.blur()
    },
    onTextReconfirm: ({ textChanged, text }) => {
      if (textChanged && isEdit && entryId) {
        void persistTaskTextRef.current({ task: text })
      }
    },
  })

  const resetForm = useCallback(() => {
    const next = resolveCreateDefaults()
    setTask('')
    setPlanDay(next.planDay)
    setStartTime(next.startTime)
    setEndTime(next.endTime)
    setDone(false)
    setColorKey(1)
    setErrorMessage('')
    createdIdRef.current = null
  }, [resolveCreateDefaults])

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }

    if (!isEdit || !entryId) {
      resetForm()
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      const { entry, error } = await fetchWeekPlanEntry(entryId)
      if (cancelled) return
      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      if (!entry) {
        setErrorMessage('Aufgabe nicht gefunden.')
        return
      }
      setTask(entry.task)
      setPlanDay(entry.planDay)
      setStartTime(entry.startTime)
      setEndTime(entry.endTime)
      setDone(entry.done)
      setColorKey(entry.colorKey)
      createdIdRef.current = entry.id
      syncConfirmedText(entry.task)
    })()

    return () => {
      cancelled = true
    }
  }, [open, isEdit, entryId, resetForm, syncConfirmedText])

  useEffect(() => {
    if (!endOptions.includes(endTime)) {
      setEndTime(endOptions[0] ?? startTime)
    }
  }, [startTime, endOptions, endTime])

  const validateTaskText = (): boolean => {
    if (!task.trim()) {
      setErrorMessage('Bitte eine Aufgabe eingeben.')
      return false
    }
    setErrorMessage('')
    return true
  }

  const onTaskOk = () => {
    if (!handleTextOk(task, taskRef)) {
      setErrorMessage('Bitte eine Aufgabe eingeben.')
      return
    }
    setErrorMessage('')
  }

  const handleCreate = async () => {
    if (!validateTaskText()) return
    setSaving(true)
    setErrorMessage('')
    const { entry, error } = await createWeekPlanEntry({
      task,
      planDay,
      startTime,
      endTime,
      colorKey,
    })
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    if (entry) {
      createdIdRef.current = entry.id
      onSaved(entry)
      onClose()
    }
  }

  const handlePlanDayChange = (value: string) => {
    setPlanDay(value)
    if (isEdit && entryId) void persistUpdate({ planDay: value })
  }

  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    const nextEnd = weekPlanDefaultEndTimeAfter(value)
    setEndTime(nextEnd)
    if (isEdit && entryId) void persistUpdate({ startTime: value, endTime: nextEnd })
  }

  const handleEndTimeChange = (value: string) => {
    setEndTime(value)
    if (isEdit && entryId) void persistUpdate({ endTime: value })
  }

  const handleColorChange = (next: TaskColorKey) => {
    setColorKey(next)
    if (isEdit && entryId) void persistUpdate({ colorKey: next })
  }

  const handleDoneChange = (checked: boolean) => {
    setDone(checked)
    if (isEdit && entryId) void persistUpdate({ done: checked })
  }

  const handleDelete = async () => {
    const id = createdIdRef.current ?? entryId
    if (!id) return
    setSaving(true)
    const { error } = await deleteWeekPlanEntry(id)
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    onDeleted(id)
    onClose()
  }

  const handleSaveAndClose = async () => {
    if (!isEdit || !entryId) {
      onClose()
      return
    }
    if (!validateTaskText()) return
    setSaving(true)
    setErrorMessage('')
    const { error } = await updateWeekPlanEntry(entryId, {
      task,
      planDay,
      startTime,
      endTime,
      done,
      colorKey,
    })
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    const { entry } = await fetchWeekPlanEntry(entryId)
    if (entry) onSaved(entry)
    onClose()
  }

  const scheduleFields = (
    <>
      <div>
        <label htmlFor="week-plan-day" className={TASK_SHEET_LABEL_CLASS}>
          Tag
        </label>
        <select
          id="week-plan-day"
          value={planDay}
          onChange={(event) => handlePlanDayChange(event.target.value)}
          className={`${TASK_SHEET_INPUT_CLASS} w-full py-3`}
        >
          {weekDates.map((date) => (
            <option key={date} value={date}>
              {cetWeekdayShort(date)} {cetFormatDayMonth(date)}
              {date === cetToday() ? ' (heute)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="week-plan-start" className={TASK_SHEET_LABEL_CLASS}>
            Start
          </label>
          <select
            id="week-plan-start"
            ref={startSelectRef}
            value={startTime}
            onChange={(event) => handleStartTimeChange(event.target.value)}
            className={`${TASK_SHEET_INPUT_CLASS} w-full px-3 py-3 tabular-nums`}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="week-plan-end" className={TASK_SHEET_LABEL_CLASS}>
            Ende
          </label>
          <select
            id="week-plan-end"
            value={endTime}
            onChange={(event) => handleEndTimeChange(event.target.value)}
            className={`${TASK_SHEET_INPUT_CLASS} w-full px-3 py-3 tabular-nums`}
          >
            {endOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )

  return (
    <TaskSheetShell
      open={open}
      title={isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
      titleId="week-plan-sheet-title"
      viewport={viewport}
      submitting={saving}
      onClose={onClose}
    >
      {loading ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Laden …</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <TaskInlineInputRow
            id="week-plan-task"
            label="Aufgabe"
            inputRef={taskRef}
            value={task}
            onChange={setTask}
            onOk={onTaskOk}
            onFocus={onTextFocus}
            onBlur={onTextBlur}
            showOk={showTextOk}
            placeholder="Was steht an?"
            disabled={saving}
            autofillName="lifexp-week-plan-task"
            enterKeyHint="next"
          />

          <TaskColorPicker
            value={colorKey}
            labels={colorLabels}
            onChange={handleColorChange}
            disabled={saving}
            id="week-plan-color"
          />

          {scheduleFields}

          {isEdit ? (
            <>
              <button
                type="button"
                onClick={() => void handleSaveAndClose()}
                disabled={saving || !task.trim()}
                className={`${TASK_SHEET_OK_BUTTON_CLASS} w-full`}
              >
                {saving ? '…' : 'OK'}
              </button>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-300/90 bg-emerald-50/90 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-950/40">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(event) => handleDoneChange(event.target.checked)}
                  className="h-5 w-5 rounded border-emerald-600 text-emerald-600"
                />
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Erledigt</span>
              </label>

              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className={TASK_SHEET_CANCEL_BUTTON_CLASS}
              >
                Aufgabe löschen
              </button>
            </>
          ) : (
            <TaskSheetCreateActions
              onCancel={onClose}
              onSave={() => void handleCreate()}
              saving={saving}
              saveDisabled={!task.trim()}
            />
          )}
        </div>
      )}

      <TaskSheetError message={errorMessage} />
      {saving && isEdit ? (
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">…</p>
      ) : null}
    </TaskSheetShell>
  )
}
