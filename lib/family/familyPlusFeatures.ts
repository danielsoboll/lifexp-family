export type FamilyPlusFeature = {
  id: string
  emoji: string
  title: string
  description: string
}

/** Zentraler Nutzen-Satz — überall einheitlich, wo PLUS vorgestellt wird. */
export const FAMILY_PLUS_TAGLINE =
  'PLUS spart Zeit und motiviert die ganze Familie – mit Automatisierungen, Foto-Nachweisen und zusätzlichen Statistiken.'

/** Abo-Hinweis — ein Abo, alle Mitglieder inklusive. */
export const FAMILY_PLUS_ABO_NOTE =
  'Ein Abo für die gesamte Familie. Alle Familienmitglieder nutzen PLUS ohne Zusatzkosten.'

/** Kurz-Slogan — wer alles mit drin ist. */
export const FAMILY_PLUS_ABO_SLOGAN = 'Alle Eltern. Alle Kinder. Ein gemeinsames Abo.'

export const FAMILY_PLUS_CANCEL_NOTE = 'Jederzeit kündbar (monatlich).'

/** Preis — einheitlich in allen PLUS-Oberflächen. */
export const FAMILY_PLUS_PRICE_AMOUNT = '4,99 €'
export const FAMILY_PLUS_PRICE_PERIOD = 'pro Monat'
export const FAMILY_PLUS_PRICE_TAGLINE = 'Ein Preis für die ganze Familie!'

/** Hinweis für Kinder / Nicht-Admins beim PLUS-Button (noch kein Abo). */
export const FAMILY_PLUS_NON_ADMIN_HINT_HEADLINE = 'Noch mehr für eure Familie'
export const FAMILY_PLUS_NON_ADMIN_HINT_INTRO = 'Mit PLUS bekommt eure ganze Familie:'
export const FAMILY_PLUS_NON_ADMIN_HINT_HIGHLIGHTS = [
  { emoji: '🎯', label: 'Mehr Quests' },
  { emoji: '📷', label: 'Fotos & Likes' },
  { emoji: '🔁', label: 'Automatische Aufgaben' },
] as const
export const FAMILY_PLUS_NON_ADMIN_HINT_FOOTER =
  'Frag Mama oder Papa, ob ihr PLUS ausprobieren möchtet. 😊'

/** @deprecated Einzeiler — nur noch für Alt-Referenzen */
export const FAMILY_PLUS_NON_ADMIN_HINT_TITLE = 'LifeXP Family PLUS'
export const FAMILY_PLUS_NON_ADMIN_HINT = `${FAMILY_PLUS_NON_ADMIN_HINT_INTRO} ${FAMILY_PLUS_NON_ADMIN_HINT_HIGHLIGHTS.map((h) => h.label.toLowerCase()).join(', ')} und vieles mehr. ${FAMILY_PLUS_NON_ADMIN_HINT_FOOTER}`

export const FAMILY_PLUS_ACTIVATED_BANNER =
  'PLUS ist aktiv! Alle Zusatzfunktionen sind freigeschaltet (wir bauen sie Schritt für Schritt aus).'

/** Marketing-Übersicht — noch nicht als Produktfunktion implementiert. */
export const FAMILY_PLUS_FEATURES: FamilyPlusFeature[] = [
  {
    id: 'daily_parent_work',
    emoji: '💼',
    title: 'Tägliche Aufgabe — Arbeit (Papa & Mama)',
    description: '+5 XP an jedem Wochentag — Urlaubstage frei wählbar',
  },
  {
    id: 'recurring_quests',
    emoji: '🔁',
    title: 'Wiederkehrende Quests',
    description: 'Jeden Tag, Mo–Fr, alle 2 Tage oder wöchentlich — automatisch eingetragen',
  },
  {
    id: 'daily_teeth',
    emoji: '🪥',
    title: 'Tägliche Aufgabe — Zähne putzen',
    description: '+3 XP jeden Tag (z. B. für die Kleinen)',
  },
  {
    id: 'every_other_room',
    emoji: '🧹',
    title: 'Alle 2 Tage — Zimmer aufräumen (Kinder)',
    description: '+4 XP für alle Kinder — automatisch im Rhythmus',
  },
  {
    id: 'chat_photos',
    emoji: '📷',
    title: 'Bilder im Familien-Chat',
    description: 'Fotos senden — Eltern können mit Like bestätigen',
  },
]

/** Schloss-Button: Einladung, kein Blocker. */
export const FAMILY_PLUS_DISCOVER_LABEL = FAMILY_PLUS_TAGLINE

/** Goldener CTA — öffnet Checkout bzw. PLUS-Sheet. */
export const FAMILY_PLUS_CTA_LABEL = 'PLUS entdecken!'

/** Motivation — Sheet-Titel & Intro (ersetzt „mehr Spass“). */
export const FAMILY_PLUS_MOTIVATION_TITLE = 'Mehr Motivation für die ganze Familie'
export const FAMILY_PLUS_MOTIVATION_INTRO =
  'Die ganze Familie gemeinsam motivieren — und mehr erreichen mit LifeXP Family PLUS.'

export const FAMILY_PLUS_SHEET = {
  titleFree: FAMILY_PLUS_MOTIVATION_TITLE,
  titleActive: 'PLUS ist aktiv — gemeinsam motivieren!',
  introFree: FAMILY_PLUS_MOTIVATION_INTRO,
  introActive: `${FAMILY_PLUS_MOTIVATION_INTRO} Diese Extras gehören zu eurem Abo (einige kommen noch Schritt für Schritt).`,
} as const
