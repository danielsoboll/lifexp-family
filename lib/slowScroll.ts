type SlowScrollOptions = {
  durationMs?: number
  /** Anteil der Viewport-Höhe von oben — Zielposition des Elements (0–1). */
  viewportAnchor?: number
}

type RevealScrollOptions = {
  durationMs?: number
  /** Abstand zum unteren Viewport-Rand, an dem das Element enden darf. */
  bottomInsetPx?: number
  topInsetPx?: number
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2
}

function animateScrollBy(delta: number, durationMs: number): void {
  if (typeof window === 'undefined' || Math.abs(delta) < 8) return

  const startY = window.scrollY
  const startTime = performance.now()

  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / durationMs)
    window.scrollTo(0, startY + delta * easeInOutCubic(progress))
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

/** Langsames Scrollen — nachvollziehbarer als natives `behavior: smooth`. */
export function slowScrollToElement(element: HTMLElement, options: SlowScrollOptions = {}): void {
  if (typeof window === 'undefined') return

  const durationMs = options.durationMs ?? 1900
  const viewportAnchor = options.viewportAnchor ?? 0.38

  if (prefersReducedMotion()) {
    element.scrollIntoView({ behavior: 'auto', block: 'center' })
    return
  }

  const startY = window.scrollY
  const targetRect = element.getBoundingClientRect()
  const targetY = startY + targetRect.top - window.innerHeight * viewportAnchor
  animateScrollBy(targetY - startY, durationMs)
}

/**
 * Nur so weit scrollen, bis das Element sichtbar ist — nicht hoch in den Viewport ziehen.
 * Für Hinweise auf Buttons weiter unten auf der Seite.
 */
export function slowScrollToRevealElement(element: HTMLElement, options: RevealScrollOptions = {}): void {
  if (typeof window === 'undefined') return

  const durationMs = options.durationMs ?? 1900
  const bottomInsetPx = options.bottomInsetPx ?? 96
  const topInsetPx = options.topInsetPx ?? 16

  if (prefersReducedMotion()) {
    element.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    return
  }

  const rect = element.getBoundingClientRect()
  const viewH = window.innerHeight
  const visibleTop = topInsetPx
  const visibleBottom = viewH - bottomInsetPx

  if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return

  let delta = 0
  if (rect.bottom > visibleBottom) {
    delta = rect.bottom - visibleBottom
  } else if (rect.top < visibleTop) {
    delta = rect.top - visibleTop
  }

  animateScrollBy(delta, durationMs)
}
