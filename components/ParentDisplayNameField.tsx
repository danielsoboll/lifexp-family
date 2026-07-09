'use client'

import type { RefObject } from 'react'

import AutofillSafeTextInput from './AutofillSafeTextInput'
import { parentRoleLabel, type ParentGender } from '../lib/family/memberGender'
import { FORM_FIELD_INPUT_CLASS, FORM_FIELD_INPUT_COMPACT_CLASS } from '../lib/appShell'
import { displayNameInputProps, personLabelInputProps } from '../lib/formInputAutofill'

type ParentDisplayNameFieldProps = {
  id: string
  gender: ParentGender
  displayName: string
  onDisplayNameChange: (value: string) => void
  compact?: boolean
  label?: string
  labelClassName?: string
  placeholder?: string
  autofillSafe?: boolean
  sheetScrollRef?: RefObject<HTMLElement | null>
  hideAboveRef?: RefObject<HTMLElement | null>
  scrollBlockRef?: RefObject<HTMLElement | null>
}

const ROLE_PREFIX_CLASS =
  'shrink-0 text-base font-semibold leading-normal text-slate-900 dark:text-slate-100'

function inputClassName(compact: boolean): string {
  const base = compact ? FORM_FIELD_INPUT_COMPACT_CLASS : FORM_FIELD_INPUT_CLASS
  return `${base.replace(/\bw-full\b/g, '').trim()} min-w-0 flex-1`
}

export default function ParentDisplayNameField({
  id,
  gender,
  displayName,
  onDisplayNameChange,
  compact = false,
  label = 'Name',
  labelClassName = 'mb-0.5 block text-xs font-semibold text-slate-950 dark:text-slate-200',
  placeholder = 'Mirko',
  autofillSafe = false,
  sheetScrollRef,
  hideAboveRef,
  scrollBlockRef,
}: ParentDisplayNameFieldProps) {
  const roleLabel = parentRoleLabel(gender)
  const fieldClass = inputClassName(compact)

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className={ROLE_PREFIX_CLASS}>{roleLabel}</span>
        {autofillSafe ? (
          <AutofillSafeTextInput
            id={id}
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={placeholder}
            scrollBlockRef={scrollBlockRef}
            scrollOnFocus="slow"
            sheetScrollRef={sheetScrollRef}
            hideAboveRef={hideAboveRef}
            scrollTopInsetPx={8}
            className={fieldClass}
            autofillProps={personLabelInputProps()}
          />
        ) : (
          <input
            id={id}
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={placeholder}
            className={fieldClass}
            {...displayNameInputProps()}
          />
        )}
      </div>
    </div>
  )
}
