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
  { emoji: '📷', label: 'Fotos & Nachrichten' },
  { emoji: '😊', label: 'Avatar-Antworten' },
  { emoji: '🔁', label: 'Automatische Quests' },
] as const
export const FAMILY_PLUS_NON_ADMIN_HINT_FOOTER =
  'Frag Mama oder Papa, ob ihr PLUS ausprobieren möchtet. 😊'

/** @deprecated Einzeiler — nur noch für Alt-Referenzen */
export const FAMILY_PLUS_NON_ADMIN_HINT_TITLE = 'LifeXP Family PLUS'
export const FAMILY_PLUS_NON_ADMIN_HINT = `${FAMILY_PLUS_NON_ADMIN_HINT_INTRO} ${FAMILY_PLUS_NON_ADMIN_HINT_HIGHLIGHTS.map((h) => h.label.toLowerCase()).join(', ')} und vieles mehr. ${FAMILY_PLUS_NON_ADMIN_HINT_FOOTER}`

export const FAMILY_PLUS_ACTIVATED_BANNER =
  'PLUS ist aktiv! Alle Zusatzfunktionen sind freigeschaltet (wir bauen sie Schritt für Schritt aus).'

/** Willkommen — wenn PLUS aktiv ist (Sheet, Einstellungen). */
export const FAMILY_PLUS_ACTIVE_WELCOME = {
  headline: '🎉 Willkommen bei LifeXP Family PLUS!',
  body: [
    'Dein Familienabo ist jetzt aktiv.',
    'Alle PLUS-Funktionen sind freigeschaltet und wir erweitern sie kontinuierlich.',
  ],
  availableHeading: 'Heute bereits verfügbar',
  availableItems: [
    { emoji: '📷', label: 'Fotos & Avatar-Antworten' },
    { emoji: '🔁', label: 'Wiederkehrende Quests' },
    { emoji: '⭐', label: 'Weitere PLUS-Funktionen folgen' },
  ],
} as const

/** Marketing-Übersicht — noch nicht als Produktfunktion implementiert. */
export const FAMILY_PLUS_FEATURES: FamilyPlusFeature[] = [
  {
    id: 'quest_photos_reactions',
    emoji: '📷',
    title: 'Fotos schicken & persönliche Antwort',
    description:
      'Kind meldet z. B. „Zimmer aufgeräumt“, schickt ein Foto — Mama bestätigt von unterwegs mit Avatar-Gesicht und kurzer Nachricht.',
  },
  {
    id: 'recurring_quests',
    emoji: '🔁',
    title: 'Wiederkehrende Quests',
    description: 'Jeden Tag, Mo–Fr, alle 2 Tage oder wöchentlich — automatisch eingetragen',
  },
  {
    id: 'every_other_room',
    emoji: '🧹',
    title: 'Zimmer aufräumen im Rhythmus',
    description: '+4 XP für alle Kinder alle 2 Tage — einmal einrichten, läuft von selbst',
  },
  {
    id: 'daily_teeth',
    emoji: '🪥',
    title: 'Zähne putzen jeden Morgen',
    description: '+3 XP für die Kleinen — als wiederkehrende Quest hinterlegt',
  },
  {
    id: 'daily_parent_work',
    emoji: '💼',
    title: 'Arbeit für Papa & Mama',
    description: '+5 XP an Wochentagen — Urlaubstage frei wählbar',
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
