'use client'

import { useCallback, useRef, useState, type FocusEvent, type InputHTMLAttributes, type RefObject } from 'react'

import { useAutoFocusInput } from '../lib/useAutoFocusInput'

import type { AutofillInputProps } from '../lib/formInputAutofill'
import {
  findOnboardingSheetScrollContainer,
  scrollBlockToTopInScrollParentWhenFocused,
  slowScrollOnboardingNameWhenFocused,
} from '../lib/slowScroll'

type AutofillSafeTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  autofillProps: AutofillInputProps
  /** Scrollt den umgebenden Block (ref) beim Fokus nach oben — z. B. Onboarding-Sheet. */
  scrollBlockRef?: RefObject<HTMLElement | null>
  scrollOnFocus?: 'instant' | 'slow'
  /** Fester Scroll-Container des Onboarding-Sheets (data-lifexp-onboarding-scroll). */
  sheetScrollRef?: RefObject<HTMLElement | null>
  /** Oberhalb liegender Block, der aus dem sichtbaren Bereich soll (Zurück, Familienname …). */
  hideAboveRef?: RefObject<HTMLElement | null>
  scrollTopInsetPx?: number
  scrollExtraPx?: number
  /** Mindest-Scroll vom aktuellen Stand (z. B. ein Feld weiter). */
  scrollMinFromCurrentPx?: number
  /** Fokus beim Mount (Tastatur auf Mobile); setzt das Feld initial auf beschreibbar. */
  autoFocus?: boolean
}

export default function AutofillSafeTextInput({
  autofillProps,
  scrollBlockRef,
  scrollOnFocus = 'instant',
  sheetScrollRef,
  hideAboveRef,
  scrollTopInsetPx = 8,
  scrollExtraPx = 0,
  scrollMinFromCurrentPx = 0,
  autoFocus = false,
  onFocus,
  onBlur,
  onTouchStart,
  ...rest
}: AutofillSafeTextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [writable, setWritable] = useState(autoFocus)

  useAutoFocusInput(inputRef, autoFocus, rest.id)

  const enableWritable = useCallback(() => {
    setWritable(true)
  }, [])

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setWritable(true)
      if (scrollBlockRef?.current) {
        if (scrollOnFocus === 'slow') {
          const nameBlock = scrollBlockRef.current
          const scrollContainer = sheetScrollRef?.current ?? findOnboardingSheetScrollContainer(nameBlock)
          if (scrollContainer) {
            slowScrollOnboardingNameWhenFocused({
              scrollContainer,
              nameBlock,
              hideAboveBlock: hideAboveRef?.current ?? null,
              topInsetPx: scrollTopInsetPx,
              extraScrollPx: scrollExtraPx,
              minScrollFromCurrentPx: scrollMinFromCurrentPx,
              durationMs: 1100,
            })
          }
        } else {
          scrollBlockToTopInScrollParentWhenFocused(scrollBlockRef.current)
        }
      }
      onFocus?.(event)
    },
    [hideAboveRef, onFocus, scrollBlockRef, scrollExtraPx, scrollMinFromCurrentPx, scrollOnFocus, scrollTopInsetPx, sheetScrollRef],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setWritable(false)
      onBlur?.(event)
    },
    [onBlur],
  )

  return (
    <input
      ref={inputRef}
      {...rest}
      {...autofillProps}
      readOnly={!writable}
      onTouchStart={(event) => {
        enableWritable()
        onTouchStart?.(event)
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
}
