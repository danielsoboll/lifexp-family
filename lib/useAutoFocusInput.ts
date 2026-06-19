'use client'

import { type RefObject, useLayoutEffect } from 'react'

export function focusInputElement(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el || typeof document === 'undefined') return
  if (document.activeElement !== el) {
    try {
      el.focus({ preventScroll: true })
    } catch {
      el.focus()
    }
  }
  try {
    const end = el.value.length
    el.setSelectionRange(end, end)
  } catch {
    // some input types do not support selection
  }
}

/** Feld oberhalb der Tastatur sichtbar halten (iOS: mehrfach nach Layout/Tastatur). */
export function scrollInputIntoComfortableView(target: HTMLElement | null) {
  if (!target || typeof window === 'undefined') return

  const run = () => {
    const vv = window.visualViewport
    if (vv && vv.height < window.innerHeight * 0.88) {
      const rect = target.getBoundingClientRect()
      const aimY = vv.offsetTop + vv.height * 0.32
      const elementCenter = rect.top + rect.height / 2
      const delta = elementCenter - aimY
      if (Math.abs(delta) > 6) {
        window.scrollBy({ top: delta, behavior: 'smooth' })
      }
    }
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }

  run()
  requestAnimationFrame(run)
  ;[80, 200, 400].forEach((ms) => window.setTimeout(run, ms))
}

/** Fokussiert ein Eingabefeld und öffnet die Tastatur (Retries für Mobile). */
export function useAutoFocusInput(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  enabled: boolean,
  resetKey?: string | number,
) {
  useLayoutEffect(() => {
    if (!enabled) return

    const run = () => focusInputElement(ref.current)

    run()
    const raf = requestAnimationFrame(run)
    const timers = [50, 150, 350].map((ms) => window.setTimeout(run, ms))

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [enabled, resetKey, ref])
}
