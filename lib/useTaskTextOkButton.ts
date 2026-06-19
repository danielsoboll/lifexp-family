'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type UseTaskTextOkButtonOptions = {
  open: boolean
  mode: 'create' | 'edit'
  /** Erstes OK beim Anlegen: Fokus auf nächstes Feld (XP / Uhrzeit). */
  onFirstAdvance: () => void
  /** Text erneut bestätigt — z. B. speichern wenn geändert (Bearbeiten). */
  onTextReconfirm?: (args: { textChanged: boolean; text: string }) => void
}

export function useTaskTextOkButton({
  open,
  mode,
  onFirstAdvance,
  onTextReconfirm,
}: UseTaskTextOkButtonOptions) {
  const [textAdvanced, setTextAdvanced] = useState(false)
  const [textFocused, setTextFocused] = useState(false)
  const confirmedTextRef = useRef('')

  useEffect(() => {
    if (!open) {
      setTextAdvanced(false)
      setTextFocused(false)
      confirmedTextRef.current = ''
    }
  }, [open])

  const syncConfirmedText = useCallback((text: string) => {
    confirmedTextRef.current = text.trim()
    if (mode === 'edit') {
      setTextAdvanced(true)
    }
  }, [mode])

  const showTextOk = mode === 'create' ? !textAdvanced || textFocused : textFocused

  const handleTextOk = useCallback(
    (currentText: string, inputRef?: RefObject<HTMLInputElement | null>): boolean => {
      const trimmed = currentText.trim()
      if (!trimmed) return false

      if (mode === 'create' && !textAdvanced) {
        confirmedTextRef.current = trimmed
        setTextAdvanced(true)
        setTextFocused(false)
        onFirstAdvance()
        return true
      }

      const changed = trimmed !== confirmedTextRef.current
      if (changed) {
        confirmedTextRef.current = trimmed
      }
      onTextReconfirm?.({ textChanged: changed, text: trimmed })
      inputRef?.current?.blur()
      setTextFocused(false)
      return true
    },
    [mode, textAdvanced, onFirstAdvance, onTextReconfirm],
  )

  return {
    showTextOk,
    onTextFocus: () => setTextFocused(true),
    onTextBlur: () => setTextFocused(false),
    handleTextOk,
    syncConfirmedText,
  }
}
