import type { VisualViewportLayout } from './useVisualViewportLayout'

export type KeyboardScrollVariant = 'default' | 'onboarding' | 'admin' | 'sheet'

const KEYBOARD_EXTRA: Record<KeyboardScrollVariant, number> = {
  default: 200,
  onboarding: 260,
  admin: 220,
  sheet: 200,
}

const KEYBOARD_MIN: Record<KeyboardScrollVariant, number> = {
  default: 320,
  onboarding: 380,
  admin: 360,
  sheet: 300,
}

const IDLE_PADDING: Record<KeyboardScrollVariant, string> = {
  default: 'max(2.5rem, calc(1.5rem + env(safe-area-inset-bottom)))',
  onboarding: 'max(4rem, calc(3rem + env(safe-area-inset-bottom)))',
  admin: 'max(12rem, calc(8rem + env(safe-area-inset-bottom)))',
  sheet: 'max(2.5rem, calc(1.5rem + env(safe-area-inset-bottom)))',
}

/** Scroll-/Form-Padding unten — deutlich über der Tastatur, damit Buttons erreichbar bleiben. */
export function keyboardScrollPaddingBottom(
  layout: Pick<VisualViewportLayout, 'keyboardOpen' | 'keyboardHeight'>,
  variant: KeyboardScrollVariant = 'default',
): string {
  if (!layout.keyboardOpen) return IDLE_PADDING[variant]
  return `${Math.max(layout.keyboardHeight + KEYBOARD_EXTRA[variant], KEYBOARD_MIN[variant])}px`
}
