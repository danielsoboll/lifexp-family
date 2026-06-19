/** Tastatur schließen und iOS-Zoom nach Eingabe zurücksetzen. */
export function dismissMobileKeyboardAndZoom(): void {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
  const scrollY = window.scrollY
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' })
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' })
    })
  })
}

export function focusFormField(
  element: HTMLElement | null | undefined,
  options?: { openSelect?: boolean; scroll?: boolean },
): void {
  if (!element) return
  requestAnimationFrame(() => {
    element.focus({ preventScroll: options?.scroll === false })
    if (options?.scroll !== false) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    if (options?.openSelect && element instanceof HTMLSelectElement) {
      requestAnimationFrame(() => {
        try {
          element.click()
        } catch {
          /* Safari blockiert manchmal programmatische Klicks */
        }
      })
    }
  })
}
