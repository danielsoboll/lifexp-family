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

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = element.parentElement
  while (node) {
    if (node.hasAttribute('data-lifexp-onboarding-scroll')) {
      return node
    }
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

export function findOnboardingSheetScrollContainer(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from
  while (node) {
    if (node.hasAttribute('data-lifexp-onboarding-scroll')) return node
    node = node.parentElement
  }
  return findScrollableAncestor(from)
}

type OnboardingNameScrollOptions = {
  scrollContainer: HTMLElement
  nameBlock: HTMLElement
  /** Block oberhalb des Namens (z. B. Zurück + Familienname) — komplett aus dem sichtbaren Bereich scrollen. */
  hideAboveBlock?: HTMLElement | null
  topInsetPx?: number
  /** Zusätzliche Scroll-Distanz nach dem Ausrichten (px). */
  extraScrollPx?: number
  /** Mindest-Scroll vom aktuellen Stand — auch wenn schon ausgerichtet (px). */
  minScrollFromCurrentPx?: number
  durationMs?: number
}

function computeDesiredOnboardingScrollTop(options: OnboardingNameScrollOptions): number {
  const {
    scrollContainer,
    nameBlock,
    topInsetPx = 8,
    extraScrollPx = 0,
  } = options
  const containerRect = scrollContainer.getBoundingClientRect()
  const nameRect = nameBlock.getBoundingClientRect()

  const targetScrollTop =
    scrollContainer.scrollTop + (nameRect.top - containerRect.top) - topInsetPx + extraScrollPx

  return Math.max(0, targetScrollTop)
}

function onboardingNameBlockAligned(
  scrollContainer: HTMLElement,
  nameBlock: HTMLElement,
  topInsetPx: number,
): boolean {
  const containerRect = scrollContainer.getBoundingClientRect()
  const nameRect = nameBlock.getBoundingClientRect()
  const offset = nameRect.top - containerRect.top
  return offset <= topInsetPx + 4 && offset >= topInsetPx - 12
}

function clampOnboardingScrollTop(scrollContainer: HTMLElement, desiredScrollTop: number): number {
  const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  return Math.min(desiredScrollTop, maxScroll)
}

function ensureOnboardingScrollRoom(scrollContainer: HTMLElement, targetScrollTop: number): void {
  const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  const deficit = targetScrollTop - maxScroll
  if (deficit <= 4) return

  const content = scrollContainer.firstElementChild as HTMLElement | null
  if (!content) return

  let spacer = content.querySelector('[data-lifexp-onboarding-scroll-spacer]') as HTMLElement | null
  if (!spacer) {
    spacer = document.createElement('div')
    spacer.setAttribute('aria-hidden', 'true')
    spacer.setAttribute('data-lifexp-onboarding-scroll-spacer', 'true')
    spacer.className = 'pointer-events-none shrink-0'
    content.appendChild(spacer)
  }

  const neededHeight = Math.ceil(deficit + 32)
  const currentHeight = Number.parseFloat(spacer.style.height) || 0
  if (neededHeight > currentHeight) {
    spacer.style.height = `${neededHeight}px`
  }
}

function scrollOnboardingNameField(options: OnboardingNameScrollOptions, animate: boolean): void {
  const { scrollContainer, nameBlock, topInsetPx = 8, durationMs = 1100 } = options

  if (onboardingNameBlockAligned(scrollContainer, nameBlock, topInsetPx)) {
    return
  }

  let desiredScrollTop = computeDesiredOnboardingScrollTop(options)
  ensureOnboardingScrollRoom(scrollContainer, desiredScrollTop)
  desiredScrollTop = computeDesiredOnboardingScrollTop(options)
  const targetScrollTop = clampOnboardingScrollTop(scrollContainer, desiredScrollTop)

  const delta = targetScrollTop - scrollContainer.scrollTop
  if (Math.abs(delta) < 4) return

  if (animate && !prefersReducedMotion()) {
    animateScrollParentTo(scrollContainer, targetScrollTop, durationMs)
  } else {
    scrollContainer.scrollTop = targetScrollTop
  }
}

/** Namensfeld oben im Onboarding-Sheet — blendet hideAboveBlock aus (Zurück, Familienname …). */
export function slowScrollOnboardingNameWhenFocused(options: OnboardingNameScrollOptions): void {
  scrollOnboardingNameField(options, !prefersReducedMotion())
  window.setTimeout(() => scrollOnboardingNameField(options, false), 380)
  window.setTimeout(() => scrollOnboardingNameField(options, false), 620)
  window.setTimeout(() => scrollOnboardingNameField(options, false), 880)
  window.setTimeout(() => scrollOnboardingNameField(options, false), 1150)
}

/** Sheet oben + Scroll-Spacer entfernen — nach Schrittwechsel im Onboarding. */
export function resetOnboardingSheetScroll(container: HTMLElement | null | undefined): void {
  if (!container) return
  container.scrollTop = 0
  container.querySelectorAll('[data-lifexp-onboarding-scroll-spacer]').forEach((node) => node.remove())
}

/** Langsam bis scrollTop 0 — z. B. Onboarding-Vorschau beim Familien-Wechsel. */
export function slowScrollContainerToTop(
  container: HTMLElement | null | undefined,
  options: { durationMs?: number } = {},
): Promise<void> {
  if (!container) return Promise.resolve()
  const durationMs = options.durationMs ?? 1900
  if (prefersReducedMotion()) {
    container.scrollTop = 0
    return Promise.resolve()
  }
  return animateScrollParentTo(container, 0, durationMs)
}

function animateScrollParentTo(
  scrollParent: HTMLElement,
  targetScrollTop: number,
  durationMs: number,
): Promise<void> {
  const startTop = scrollParent.scrollTop
  const delta = targetScrollTop - startTop
  if (Math.abs(delta) < 4) return Promise.resolve()

  return new Promise((resolve) => {
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs)
      scrollParent.scrollTop = startTop + delta * easeInOutCubic(progress)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(step)
  })
}

/** Scrollt ein Block-Element im nächsten scrollbaren Eltern-Container nach oben (z. B. Onboarding-Sheet). */
export function scrollBlockToTopInScrollParent(
  element: HTMLElement,
  options: { topInsetPx?: number; extraScrollPx?: number } = {},
): void {
  if (typeof window === 'undefined') return

  const topInsetPx = options.topInsetPx ?? 0
  const extraScrollPx = options.extraScrollPx ?? 0
  const scrollParent = findScrollableAncestor(element)
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'

  if (!scrollParent) {
    element.scrollIntoView({ behavior, block: 'start' })
    return
  }

  const delta = scrollDeltaToBlockTop(element, scrollParent, topInsetPx, extraScrollPx)
  if (delta === null) return

  scrollParent.scrollBy({ top: delta, behavior })
}

function scrollDeltaToBlockTop(
  element: HTMLElement,
  scrollParent: HTMLElement,
  topInsetPx: number,
  extraScrollPx = 0,
): number | null {
  const parentRect = scrollParent.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const delta = elementRect.top - parentRect.top - topInsetPx + extraScrollPx
  if (Math.abs(delta) < 4) return null
  return delta
}

function animateScrollParentBy(
  scrollParent: HTMLElement,
  delta: number,
  durationMs: number,
): void {
  if (prefersReducedMotion()) {
    scrollParent.scrollTop += delta
    return
  }

  const startTop = scrollParent.scrollTop
  const startTime = performance.now()

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / durationMs)
    scrollParent.scrollTop = startTop + delta * easeInOutCubic(progress)
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

/** Langsames Scrollen — Feld-Block oben im Sheet (Onboarding „Wie heißt du?“). */
export function slowScrollBlockToTopInScrollParent(
  element: HTMLElement,
  options: { topInsetPx?: number; durationMs?: number; extraScrollPx?: number } = {},
): void {
  if (typeof window === 'undefined') return

  const topInsetPx = options.topInsetPx ?? 0
  const extraScrollPx = options.extraScrollPx ?? 0
  const durationMs = options.durationMs ?? 850
  const scrollParent = findScrollableAncestor(element)

  if (!scrollParent) {
    element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    return
  }

  const delta = scrollDeltaToBlockTop(element, scrollParent, topInsetPx, extraScrollPx)
  if (delta === null) return

  animateScrollParentBy(scrollParent, delta, durationMs)
}

/** Mehrfach ausführen — iOS verschiebt Layout erst nach Tastatur-Animation. */
export function scrollBlockToTopInScrollParentWhenFocused(element: HTMLElement): void {
  const run = () => scrollBlockToTopInScrollParent(element, { topInsetPx: 4 })
  run()
  requestAnimationFrame(run)
  window.setTimeout(run, 320)
}

export function slowScrollBlockToTopWhenFocused(
  element: HTMLElement,
  options: { topInsetPx?: number; durationMs?: number; extraScrollPx?: number } = {},
): void {
  const run = () => slowScrollBlockToTopInScrollParent(element, options)
  run()
  window.setTimeout(run, 380)
  window.setTimeout(run, 620)
  window.setTimeout(run, 880)
  window.setTimeout(run, 1150)
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
