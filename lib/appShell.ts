/** Gemeinsamer Seitenhintergrund (alle Haupt-Layouts). */
export const MAIN_SHELL_CLASS = 'min-h-dvh text-slate-900 dark:text-slate-100'

/** Onboarding-Vollbild: kein deckendes bg-slate-50 — Seitenverlauf bleibt sichtbar. */
export const ONBOARDING_BACKDROP_CLASS =
  'fixed inset-0 text-slate-900 dark:text-slate-100'

/** Vertikaler Innenabstand inkl. Safe Area unten (Browser-Leiste). */
export const MAIN_PAGE_INSET_CLASS =
  'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(3.5rem,calc(2.75rem+env(safe-area-inset-bottom)))]'

/** Startseite: extra Abstand unten (mobile Browser-URL-Leiste). */
export const HOME_PAGE_INSET_CLASS =
  'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]'

/** Karten/Buttons im Tagesmodus: Graustufen statt Weiss-auf-Weiss. */
export const CARD_SURFACE_CLASS =
  'border-2 border-slate-400/85 bg-slate-100 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-500/15 dark:border-slate-600 dark:bg-slate-900/90 dark:ring-slate-700/50'

/** Kartenfläche für 3D-Steintafel-Buttons. */
export const CARD_BUTTON_SURFACE_CLASS =
  'border-2 border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 ring-1 ring-stone-500/20 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:ring-stone-600/35'

/** Auswahl-Buttons (neutral, nicht selektiert). */
export const CHOICE_SURFACE_CLASS =
  'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-stone-900 ring-1 ring-stone-500/18 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100 dark:ring-stone-600/30'

/**
 * 3D-Steintafel für Link-Buttons (native `<button>` via globals.css).
 * Alternativ: `rounded-*` + `border-2` auf dem Link.
 */
export const PRESSABLE_3D_CLASS = 'lifexp-pressable-3d'

/** Pill „Zurück“ / sekundäre Navigation. */
export const PILL_BACK_CLASS =
  'lifexp-pressable-3d inline-flex w-fit items-center gap-1 rounded-full border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/80 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-stone-500 hover:from-stone-50 hover:via-stone-100 hover:to-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:from-stone-600 dark:hover:via-stone-700 dark:hover:to-stone-900'
