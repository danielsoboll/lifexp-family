'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

import {
  ALCOHOL_DRINK_OPTIONS,
  ALCOHOL_LIMIT_AMOUNT_MAX,
  ALCOHOL_UNIT_OPTIONS,
  type AlcoholLimitsFormState,
} from '../lib/alcoholUnits'
import { integerInputProps } from '../lib/formInputAutofill'
import { dismissMobileKeyboardAndZoom, focusFormField } from '../lib/mobileFormFocus'

/** mind. 16px – verhindert Auto-Zoom auf iOS beim Fokus */
const fieldClass =
  'w-full rounded-xl border-2 border-stone-400/90 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-stone-500/15 focus:border-emerald-500 focus:outline-none focus:ring-emerald-200/80 dark:border-stone-600 dark:bg-stone-900 dark:text-slate-100 dark:ring-stone-700/40 dark:focus:border-emerald-500'

const AMOUNT_ADVANCE_MS = 320
const ALCOHOL_AMOUNT_MAX_DIGITS = 2

function normalizeAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, ALCOHOL_AMOUNT_MAX_DIGITS)
  if (!digits) return ''
  const value = parseInt(digits, 10)
  if (!Number.isFinite(value)) return ''
  return String(Math.min(ALCOHOL_LIMIT_AMOUNT_MAX, value))
}

function isValidAmountInput(value: string): boolean {
  const trimmed = normalizeAmountInput(value)
  if (!trimmed) return false
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) && n >= 0 && n <= ALCOHOL_LIMIT_AMOUNT_MAX
}

type AlcoholLimitsFieldsProps = {
  idPrefix: string
  title: string
  values: AlcoholLimitsFormState
  onChange: (next: AlcoholLimitsFormState) => void
  which: 'low' | 'high'
  /** Nach Getränk-Auswahl: Fokus auf nächsten Block (z. B. „viel“-Menge). */
  onBlockComplete?: () => void
  /** Letzter Block – nach Getränk Tastatur zu und Zoom zurück. */
  onFlowComplete?: () => void
}

export default function AlcoholLimitsFields({
  idPrefix,
  title,
  values,
  onChange,
  which,
  onBlockComplete,
  onFlowComplete,
}: AlcoholLimitsFieldsProps) {
  const amountRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLSelectElement>(null)
  const drinkRef = useRef<HTMLSelectElement>(null)
  const amountAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const amountKey = which === 'low' ? 'limitLow' : 'limitHigh'
  const unitKey = which === 'low' ? 'unitLow' : 'unitHigh'
  const typeKey = which === 'low' ? 'typeLow' : 'typeHigh'

  const patch = (partial: Partial<AlcoholLimitsFormState>) => onChange({ ...values, ...partial })

  useEffect(() => {
    return () => {
      if (amountAdvanceTimer.current) clearTimeout(amountAdvanceTimer.current)
    }
  }, [])

  const focusUnitPicker = () => {
    focusFormField(unitRef.current, { openSelect: true })
  }

  const focusDrinkPicker = () => {
    focusFormField(drinkRef.current, { openSelect: true })
  }

  const tryAdvanceFromAmount = (value: string) => {
    if (!isValidAmountInput(value)) return
    focusUnitPicker()
  }

  const scheduleAdvanceFromAmount = (value: string) => {
    if (amountAdvanceTimer.current) clearTimeout(amountAdvanceTimer.current)
    if (!isValidAmountInput(value)) return
    amountAdvanceTimer.current = setTimeout(() => {
      amountAdvanceTimer.current = null
      tryAdvanceFromAmount(value)
    }, AMOUNT_ADVANCE_MS)
  }

  const handleAmountChange = (value: string) => {
    const normalized = normalizeAmountInput(value)
    patch({ [amountKey]: normalized })
    scheduleAdvanceFromAmount(normalized)
  }

  const handleAmountBlur = (value: string) => {
    if (amountAdvanceTimer.current) {
      clearTimeout(amountAdvanceTimer.current)
      amountAdvanceTimer.current = null
    }
    tryAdvanceFromAmount(value)
  }

  const handleAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Go' && e.key !== 'Next') return
    e.preventDefault()
    if (amountAdvanceTimer.current) {
      clearTimeout(amountAdvanceTimer.current)
      amountAdvanceTimer.current = null
    }
    tryAdvanceFromAmount(e.currentTarget.value)
  }

  const handleUnitChange = (value: string) => {
    patch({ [unitKey]: value })
    if (value) {
      focusDrinkPicker()
    }
  }

  const handleDrinkChange = (value: string) => {
    patch({ [typeKey]: value })
    if (!value) return

    if (drinkRef.current) drinkRef.current.blur()

    if (onBlockComplete) {
      window.setTimeout(() => onBlockComplete(), 60)
      return
    }

    if (onFlowComplete) {
      window.setTimeout(() => {
        dismissMobileKeyboardAndZoom()
        onFlowComplete()
      }, 60)
    } else {
      window.setTimeout(() => dismissMobileKeyboardAndZoom(), 60)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-stone-300/80 bg-stone-50/80 p-4 ring-1 ring-stone-400/20 dark:border-stone-600 dark:bg-stone-900/40 dark:ring-stone-700/30">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-3 flex flex-col gap-3">
        <div>
          <label htmlFor={`${idPrefix}-menge`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Menge
          </label>
          <input
            ref={amountRef}
            id={`${idPrefix}-menge`}
            {...integerInputProps('lifexp-alcohol-amount')}
            enterKeyHint="next"
            maxLength={ALCOHOL_AMOUNT_MAX_DIGITS}
            placeholder="z. B. 2"
            value={values[amountKey]}
            onChange={(e) => handleAmountChange(e.target.value)}
            onBlur={(e) => handleAmountBlur(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-einheit`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Einheit
          </label>
          <select
            ref={unitRef}
            id={`${idPrefix}-einheit`}
            value={values[unitKey]}
            onChange={(e) => handleUnitChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">Bitte wählen</option>
            {ALCOHOL_UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-getraenk`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Getränk
          </label>
          <select
            ref={drinkRef}
            id={`${idPrefix}-getraenk`}
            value={values[typeKey]}
            onChange={(e) => handleDrinkChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">Bitte wählen</option>
            {ALCOHOL_DRINK_OPTIONS.map((drink) => (
              <option key={drink} value={drink}>
                {drink}
              </option>
            ))}
            {values[typeKey] &&
            !(ALCOHOL_DRINK_OPTIONS as readonly string[]).includes(values[typeKey]) ? (
              <option value={values[typeKey]}>{values[typeKey]} (gespeichert)</option>
            ) : null}
          </select>
        </div>
      </div>
    </div>
  )
}
