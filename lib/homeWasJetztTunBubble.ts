const PENDING_KEY = 'lifexp-wjt-bubble-pending'

export const WJT_BUBBLE_QUERY_PARAM = 'wjtBubble'

/** Denkblase erst ab diesem Gesamt-XP (profiles.total_xp). */
export const WJT_THOUGHT_BUBBLE_XP_THRESHOLD = 30

/** Verzögerung für die Denkblase, wenn total_xp über dem Schwellwert liegt (legacy — siehe thoughtBubbleTiming). */
export const WJT_THOUGHT_BUBBLE_DELAY_MS = 5000

/** Nach „Bin dabei!“ — Home kann Denkblase neu planen (auch bestehende User). */
export const LIFEXP_WJT_BUBBLE_PENDING_EVENT = 'lifexp-wjt-bubble-pending'

export function markWasJetztTunBubblePendingAfterLogin(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PENDING_KEY, '1')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(LIFEXP_WJT_BUBBLE_PENDING_EVENT))
}

export function clearWasJetztTunBubblePending(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function isWasJetztTunBubblePending(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

/** Denkblase nach frischem „Bin dabei!“ (Session-Flag oder ?wjtBubble=1). */
export function shouldShowWasJetztTunThoughtBubble(fromUrl: boolean): boolean {
  return fromUrl || isWasJetztTunBubblePending()
}

export function clearWasJetztTunBubbleStorage(): void {
  clearWasJetztTunBubblePending()
}
