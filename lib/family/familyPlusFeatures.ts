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

/** Marketing-Übersicht — noch nicht als Produktfunktion implementiert. */
export const FAMILY_PLUS_FEATURES: FamilyPlusFeature[] = [
  {
    id: 'daily_parent_work',
    emoji: '💼',
    title: 'Tägliche Aufgabe — Arbeit (Papa & Mama)',
    description: '+5 XP an jedem Wochentag — Urlaubstage frei wählbar',
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
export const FAMILY_PLUS_CTA_LABEL = 'Zu PLUS'

export const FAMILY_PLUS_SHEET = {
  titleFree: 'Noch mehr Spass mit PLUS',
  titleActive: 'PLUS ist aktiv — viel Spass!',
  introFree: FAMILY_PLUS_TAGLINE,
  introActive: `${FAMILY_PLUS_TAGLINE} Diese Extras gehören zu eurem Abo (einige kommen noch Schritt für Schritt).`,
} as const
