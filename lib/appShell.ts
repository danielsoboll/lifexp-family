/** Gemeinsamer Seitenhintergrund (alle Haupt-Layouts). */
export const MAIN_SHELL_CLASS = 'min-h-dvh text-slate-800 dark:text-slate-100'

/** Onboarding-Vollbild: kein deckendes bg-slate-50 — Seitenverlauf bleibt sichtbar. */
export const ONBOARDING_BACKDROP_CLASS =
  'fixed inset-0 text-slate-900 dark:text-slate-100'

/** Vertikaler Innenabstand inkl. Safe Area unten (Browser-Leiste). */
export const MAIN_PAGE_INSET_CLASS =
  'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]'

/** Startseite: extra Abstand unten (mobile Browser-URL-Leiste). */
export const HOME_PAGE_INSET_CLASS =
  'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(10rem,calc(8rem+env(safe-area-inset-bottom)))]'

/** Karten/Buttons im Tagesmodus: helle Graustufen statt Weiss-auf-Weiss. */
export const CARD_SURFACE_CLASS =
  'border-2 border-slate-300/90 bg-slate-50 shadow-[0_3px_12px_-4px_rgba(51,65,85,0.12)] ring-1 ring-slate-400/12 dark:border-slate-600 dark:bg-slate-900/90 dark:ring-slate-700/50'

/** Sekundärtext auf Seitenverlauf — gut lesbar im Tagesmodus. */
export const MUTED_BODY_TEXT_CLASS = 'text-sm text-slate-700 dark:text-slate-400'

/** Kleinere Hilfetexte (Listen, Metadaten, Leer-Zustände). */
export const MUTED_CAPTION_TEXT_CLASS = 'text-xs text-slate-700 dark:text-slate-400'

/** Metadaten / Labels auf Kartenflächen. */
export const MUTED_ON_SURFACE_TEXT_CLASS = 'text-slate-700 dark:text-slate-400'

/** Formular-Labels und Zwischenüberschriften im Tagesmodus. */
export const MUTED_LABEL_TEXT_CLASS = 'text-slate-700 dark:text-slate-200'

/** Dekorative Icons (Chevrons, Trenner) — lesbar, aber zurückhaltend. */
export const MUTED_ICON_TEXT_CLASS = 'text-slate-600 dark:text-slate-500'

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

/** Leichtes 3D für Avatar-Kacheln und klickbare Member-Cards. */
export const TILE_3D_CLASS = 'lifexp-tile-3d'

/** Klickfläche vertikaler Belohnungs-Balken — ohne globale Button-Steintafel. */
export const GOAL_BAR_HIT_CLASS = 'lifexp-goal-bar-hit'

/** Avatar-Detail: Portrait-Karte (5:6 in p-3). */
export const MEMBER_DETAIL_CARD_WIDTH_CLASS = 'w-[15.5rem] sm:w-[16.5rem]'

/** Platz für Balken-Beschriftung („Belohnung“, „noch nicht eingetragen“). */
export const MEMBER_DETAIL_GOAL_BAR_COLUMN_CLASS = 'w-[4.25rem] shrink-0'

/**
 * Kopfbereich Mitglieder-Detail: links Luft für Balken-Text, rechts für Denkblase.
 */
export const MEMBER_DETAIL_HERO_CLASS =
  'lifexp-member-detail-hero relative w-full max-w-full pl-1 pr-[min(4.75rem,21vw)]'

/** Zurück-Link zur Familien-Startseite. */
export const HOME_BACK_LABEL = 'Übersicht'

/** Pill „Zurück“ / sekundäre Navigation. */
export const PILL_BACK_CLASS =
  'lifexp-pressable-3d inline-flex w-fit items-center gap-1 rounded-full border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/80 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-stone-500 hover:from-stone-50 hover:via-stone-100 hover:to-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:from-stone-600 dark:hover:via-stone-700 dark:hover:to-stone-900'

/**
 * Formular-Inputs — mindestens text-base (16px), sonst zoomt iOS Safari beim Tippen hinein.
 * @see https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
 */
export const FORM_FIELD_INPUT_CLASS =
  'w-full scroll-my-24 rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

/** Kompakter Admin-Look, gleiche Mindest-Schriftgröße für iOS. */
export const FORM_FIELD_INPUT_COMPACT_CLASS =
  'w-full scroll-my-24 rounded-lg border-2 border-slate-300 bg-white px-2.5 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
