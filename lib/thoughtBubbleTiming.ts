/** Denkblase sichtbar (mindestens). */
export const WJT_BUBBLE_VISIBLE_MS = 5_000

/** Pause zwischen zwei Anzeigen (mindestens). */
export const WJT_BUBBLE_COOLDOWN_MS = 5_000

/** Oben am Avatar verweilen, bevor sie erneut erscheint. */
export const WJT_BUBBLE_SCROLL_DWELL_MS = 3_000

/** Scroll-Offset „ganz oben“ (px). */
export const WJT_BUBBLE_SCROLL_TOP_MAX_PX = 48

/** Erstes Erscheinen — erfahrene Nutzer (total_xp > Schwellwert). */
export const WJT_BUBBLE_INITIAL_DELAY_OVER_THRESHOLD_MS = 5_000

/** Erstes Erscheinen — neue Nutzer. */
export const WJT_BUBBLE_INITIAL_DELAY_NEW_MS = 2_000

/** Denkblase: Verzögerung für erfahrene Nutzer (Gesamt-XP). */
export const WJT_THOUGHT_BUBBLE_XP_THRESHOLD = 30

export function initialThoughtBubbleDelayMs(totalXp: number): number {
  return totalXp > WJT_THOUGHT_BUBBLE_XP_THRESHOLD
    ? WJT_BUBBLE_INITIAL_DELAY_OVER_THRESHOLD_MS
    : WJT_BUBBLE_INITIAL_DELAY_NEW_MS
}
