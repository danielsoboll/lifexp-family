/** Kurz-Hinweis, wenn Nutzer schnell tippen — lieber Feedback als „nichts passiert“. */
export const QUICK_CLICK_WAIT_HINT = 'Warte kurz …'

/** Mindest-Feedback vor Zustandswechsel (ms) — damit schnelle Tapper etwas sehen. */
export const QUICK_CLICK_MIN_FEEDBACK_MS = 280

export function waitForQuickClickFeedback(ms = QUICK_CLICK_MIN_FEEDBACK_MS): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
