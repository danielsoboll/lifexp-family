export const LIFEXP_XP_HISTORY_REFRESH_EVENT = 'lifexp-xp-history-refresh'

export function notifyXpHistoryRefresh(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_XP_HISTORY_REFRESH_EVENT))
}
