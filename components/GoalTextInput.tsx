'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'

import { oneLineTextInputProps } from '../lib/formInputAutofill'
import { GOAL_TEXT_PROMPT } from '../lib/goals'
import { scrollInputIntoComfortableView, useAutoFocusInput } from '../lib/useAutoFocusInput'

type GoalTextInputProps = {
  value: string
  onChange: (value: string) => void
  /** Enter / „Fertig“ – speichern und Fokus weitergeben. */
  onCommit?: (value: string) => void
  onBlur?: () => void
  autoFocus?: boolean
  disabled?: boolean
}

export default function GoalTextInput({
  value,
  onChange,
  onCommit,
  onBlur,
  autoFocus = false,
  disabled = false,
}: GoalTextInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useAutoFocusInput(inputRef, autoFocus && !disabled)

  const revealForTyping = useCallback(() => {
    scrollInputIntoComfortableView(wrapperRef.current)
  }, [])

  useLayoutEffect(() => {
    if (!autoFocus || disabled) return
    revealForTyping()
  }, [autoFocus, disabled, revealForTyping])

  return (
    <div ref={wrapperRef} className="mt-3 scroll-mt-24">
      <label className="block">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{GOAL_TEXT_PROMPT}</span>
        <input
          ref={inputRef}
          {...oneLineTextInputProps('lifexp-personal-goal')}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onFocus={revealForTyping}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            inputRef.current?.blur()
            onCommit?.(value)
          }}
          enterKeyHint="done"
          className="mt-2 w-full rounded-2xl border-2 border-emerald-400/80 bg-white px-3 py-3 text-base font-bold text-slate-900 caret-emerald-600 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-800/40"
        />
      </label>
    </div>
  )
}
