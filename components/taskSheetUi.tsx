'use client'

import { useEffect, type CSSProperties, type ReactNode, type RefObject } from 'react'

import SheetPortal from './SheetPortal'
import SheetViewportChrome from './SheetViewportChrome'
import { integerInputProps, oneLineTextInputProps } from '../lib/formInputAutofill'
import type { useVisualViewportLayout } from '../lib/useVisualViewportLayout'

export const TASK_SHEET_LABEL_CLASS =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

export const TASK_SHEET_INPUT_CLASS =
  'min-w-0 flex-1 rounded-2xl border-2 border-stone-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 dark:border-stone-600 dark:bg-stone-950 dark:text-slate-100'

export const TASK_SHEET_OK_BUTTON_CLASS =
  'lifexp-pressable-3d shrink-0 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60 dark:border-emerald-500'

export const TASK_SHEET_OK_BUTTON_INACTIVE_CLASS =
  'lifexp-pressable-3d shrink-0 rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-200 to-stone-300 px-5 py-3.5 text-sm font-bold text-stone-600 dark:border-stone-600 dark:from-stone-700 dark:to-stone-800 dark:text-stone-300'

export const TASK_SHEET_CANCEL_BUTTON_CLASS =
  'w-full rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'

export const TASK_SHEET_SAVE_BUTTON_CLASS =
  'lifexp-pressable-3d w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60 dark:border-emerald-500'

type TaskSheetShellProps = {
  open: boolean
  title: string
  titleId: string
  viewport: ReturnType<typeof useVisualViewportLayout>
  submitting?: boolean
  onClose: () => void
  children: ReactNode
}

type SheetOverlayFrameProps = {
  viewport: ReturnType<typeof useVisualViewportLayout>
  onDismiss: () => void
  dismissDisabled?: boolean
  sheetClassName: string
  sheetStyle?: CSSProperties
  titleId: string
  children: ReactNode
}

export function SheetOverlayFrame({
  viewport,
  onDismiss,
  dismissDisabled = false,
  sheetClassName,
  sheetStyle,
  titleId,
  children,
}: SheetOverlayFrameProps) {
  const dismissFromBackdrop = () => {
    if (!dismissDisabled) onDismiss()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dismissDisabled) onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissDisabled, onDismiss])

  return (
    <SheetPortal>
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <button
          type="button"
          aria-label="Schließen"
          disabled={dismissDisabled}
          onClick={dismissFromBackdrop}
          className="absolute inset-0 cursor-default bg-slate-950/45 disabled:cursor-default"
        />
        <SheetViewportChrome viewport={viewport} />
        <div
          className={sheetClassName}
          style={sheetStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </SheetPortal>
  )
}

export function TaskSheetShell({
  open,
  title,
  titleId,
  viewport,
  submitting = false,
  onClose,
  children,
}: TaskSheetShellProps) {
  if (!open) return null

  const sheetPaddingBottom = viewport.keyboardOpen
    ? `max(0.75rem, ${viewport.keyboardHeight}px)`
    : 'max(1rem, env(safe-area-inset-bottom))'

  return (
    <SheetOverlayFrame
      viewport={viewport}
      onDismiss={onClose}
      dismissDisabled={submitting}
      titleId={titleId}
      sheetClassName="lifexp-bottom-sheet relative z-10 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] border-t-2 border-stone-400/90 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-200/95 px-4 pt-3 shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.28)] dark:border-stone-600 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950"
      sheetStyle={{ paddingBottom: sheetPaddingBottom }}
    >
      <div className="mb-3 flex justify-center">
        <span className="h-1 w-9 rounded-full bg-stone-400 dark:bg-stone-600" aria-hidden />
      </div>

      <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {title}
      </h2>

      {children}
    </SheetOverlayFrame>
  )
}

type TaskInlineInputRowProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onOk: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  placeholder?: string
  disabled?: boolean
  okDisabled?: boolean
  okLabel?: string
  inputMode?: 'text' | 'numeric'
  inputClassName?: string
  enterKeyHint?: 'done' | 'next' | 'go'
  autofillName?: string
  showOk?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export function TaskInlineInputRow({
  id,
  label,
  value,
  onChange,
  onOk,
  inputRef,
  placeholder,
  disabled = false,
  okDisabled = false,
  okLabel = 'OK',
  inputMode = 'text',
  inputClassName = TASK_SHEET_INPUT_CLASS,
  enterKeyHint = 'done',
  autofillName,
  showOk = true,
  onFocus,
  onBlur,
}: TaskInlineInputRowProps) {
  const autofillProps = autofillName
    ? inputMode === 'numeric'
      ? integerInputProps(autofillName)
      : oneLineTextInputProps(autofillName)
    : {}

  return (
    <div>
      <label htmlFor={id} className={TASK_SHEET_LABEL_CLASS}>
        {label}
      </label>
      <div className={showOk ? 'flex items-center gap-2' : ''}>
        <input
          id={id}
          ref={inputRef}
          {...autofillProps}
          type={inputMode === 'numeric' ? 'text' : 'text'}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onOk()
            }
          }}
          className={`${inputClassName}${showOk ? '' : ' w-full'}`}
        />
        {showOk ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOk}
            disabled={disabled || okDisabled}
            className={okDisabled ? TASK_SHEET_OK_BUTTON_INACTIVE_CLASS : TASK_SHEET_OK_BUTTON_CLASS}
          >
            {okLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

type TaskSheetCreateActionsProps = {
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  saveDisabled?: boolean
  saveLabel?: string
}

export function TaskSheetCreateActions({
  onCancel,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = 'Speichern',
}: TaskSheetCreateActionsProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={TASK_SHEET_CANCEL_BUTTON_CLASS}
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || saveDisabled}
        className={TASK_SHEET_SAVE_BUTTON_CLASS}
      >
        {saving ? 'Speichern …' : saveLabel}
      </button>
    </div>
  )
}

export function TaskSheetError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p
      className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
      role="alert"
    >
      {message}
    </p>
  )
}
