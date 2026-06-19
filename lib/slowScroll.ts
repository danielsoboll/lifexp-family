type SlowScrollOptions = {
  durationMs?: number
  /** Anteil der Viewport-Höhe von oben — Zielposition des Elements (0–1). */
  viewportAnchor?: number
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2
}

/** Langsames Scrollen — nachvollziehbarer als natives `behavior: smooth`. */
export function slowScrollToElement(element: HTMLElement, options: SlowScrollOptions = {}): void {
  if (typeof window === 'undefined') return

  const durationMs = options.durationMs ?? 1900
  const viewportAnchor = options.viewportAnchor ?? 0.38
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    element.scrollIntoView({ behavior: 'auto', block: 'center' })
    return
  }

  const startY = window.scrollY
  const targetRect = element.getBoundingClientRect()
  const targetY = startY + targetRect.top - window.innerHeight * viewportAnchor
  const distance = targetY - startY

  if (Math.abs(distance) < 8) return

  const startTime = performance.now()

  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / durationMs)
    window.scrollTo(0, startY + distance * easeInOutCubic(progress))
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}
