/**
 * Avatar-Bibliothek: Dateien unter /public/avatars/
 * male → Avatar_1, female → Avatar_2 (level1 / level1_2 / level1_3 / Park nach Tages-XP).
 * Account-Level 2–4 nutzen vorerst dieselben Bilder und Schwellen wie Level 1.
 * Anzeige: quadratisch, Bild zentriert; seitliche Ränder grau (object-contain).
 */

/** Anzeige-Rahmen Startseite (CSS-px, logisch — nicht die Bilddatei-Auflösung). */
export const AVATAR_FRAME_HOME_MAX_PX = 240

/** Anzeige-Rahmen Onboarding-Intro (CSS-px). */
export const AVATAR_FRAME_INTRO_MAX_PX = 480

/**
 * Export-Ziel für Quelldateien unter /public/avatars/.
 * Anzeige max. ~480 CSS-px (Intro) bzw. 240 (Start) → 1024–1280 px Kantenlänge reicht (2× Retina).
 * Lieferung: WebP unter /public/avatars/ (siehe npm run optimize:avatars).
 * Export aus Figma: WebP ~85 Qualität, max. 1280px Kantenlänge.
 */
export const AVATAR_SOURCE_RECOMMENDED_PX = 1280

/** Retina-Ladehinweis für `next/image` `sizes` (unabhängig vom Rahmen). */
export function getAvatarImageSizesCss(frameMaxPx: number): string {
  const loadPx = Math.min(1280, Math.ceil(frameMaxPx * 2))
  return `(max-width: 640px) ${loadPx}px, ${loadPx}px`
}

export type AvatarGender = 'male' | 'female'

export type AvatarHappinessTier = 1 | 2 | 3 | 4

export const AVATAR_GENDER_LABELS: Record<AvatarGender, string> = {
  male: 'Männlich',
  female: 'Weiblich',
}

/** Ab diesen heutigen Gesamt-XP (Stufe 1): Park-Bild statt Basis-level1 (männl./weiblich). */
export const AVATAR_LEVEL1_PARK_MIN_DAILY_XP = 10

export const AVATAR_MALE_LEVEL1_PARK_SRC = '/avatars/Avatar_1_level1_1_Park.webp'

/** Basis weiblich Stufe 1. */
export const AVATAR_FEMALE_LEVEL1_SRC = '/avatars/Avatar_2_level1.webp'

export const AVATAR_FEMALE_LEVEL1_PARK_SRC = '/avatars/Avatar_2_level1_4_park.webp'

export const AVATAR_TOGETHER_SRC = '/avatars/Together.webp'

/** Onboarding-Intro: letztes Bild der Slideshow (statt erneut Together). */
export const AVATAR_TOGETHER_AFTER_SRC = '/avatars/Together_after.webp'

/** Feinabstimmung pro Datei: gleiche Figurgröße im quadratischen Rahmen. */
export type AvatarDisplayTune = {
  scale: number
  objectPosition: string
  /** Optionaler minimaler Crop, um Render-Artefakte (z. B. grauer Streifen) zu entfernen. */
  cropTopPct?: number
  cropBottomPct?: number
}

const DEFAULT_AVATAR_DISPLAY_TUNE: AvatarDisplayTune = {
  scale: 1,
  objectPosition: 'center',
}

/**
 * Avatar_1: Quellen meist Landscape (1536×1024) → Figur wirkt kleiner als Avatar_2 (quadratisch).
 * Skalierung angleichen an ~85 % Körperhöhe wie Avatar_2_level1; Park/level1_2 extra Headroom.
 */
const AVATAR_1_LANDSCAPE_TUNE: AvatarDisplayTune = {
  scale: 1.36,
  objectPosition: 'center 48%',
}

const AVATAR_1_DISPLAY_TUNE_BY_SRC: Record<string, AvatarDisplayTune> = {
  '/avatars/Avatar_1_level1.webp': { scale: 1.5, objectPosition: 'center 47%' },
  // _2/_3 haben oben teils einen grauen Render-Streifen → minimal wegcroppen, Figurgröße wie level1.
  '/avatars/Avatar_1_level1_2.webp': { scale: 1.5, objectPosition: 'center 55%', cropTopPct: 3 },
  '/avatars/Avatar_1_level1_3.webp': { scale: 1.5, objectPosition: 'center 52%', cropTopPct: 2 },
  [AVATAR_MALE_LEVEL1_PARK_SRC]: { scale: 1.18, objectPosition: 'center 52%' },
  '/avatars/Avatar_1_level2.webp': AVATAR_1_LANDSCAPE_TUNE,
  '/avatars/Avatar_1_level3.webp': AVATAR_1_LANDSCAPE_TUNE,
  '/avatars/Avatar_1_level4.webp': AVATAR_1_LANDSCAPE_TUNE,
}

/** Onboarding-Intro: Together / Together_after (quadratisch, wie Avatar_2 im Rahmen). */
const AVATAR_INTRO_DISPLAY_TUNE_BY_SRC: Record<string, AvatarDisplayTune> = {
  [AVATAR_TOGETHER_SRC]: { scale: 1, objectPosition: 'center 47%' },
  [AVATAR_TOGETHER_AFTER_SRC]: { scale: 1, objectPosition: 'center 47%' },
}

/** Avatar_2: quadratisch — gleiche Stufen (level1 / _2 / _3 / Park), Feintuning analog männlich. */
const AVATAR_2_DISPLAY_TUNE_BY_SRC: Record<string, AvatarDisplayTune> = {
  [AVATAR_FEMALE_LEVEL1_SRC]: { scale: 1, objectPosition: 'center 47%' },
  '/avatars/Avatar_2_level1_2.webp': { scale: 1, objectPosition: 'center 55%', cropTopPct: 3 },
  '/avatars/Avatar_2_level1_3.webp': { scale: 1, objectPosition: 'center 52%', cropTopPct: 2 },
  [AVATAR_FEMALE_LEVEL1_PARK_SRC]: { scale: 1.18, objectPosition: 'center 52%' },
}

export function getAvatarDisplayTune(src: string): AvatarDisplayTune {
  return (
    AVATAR_1_DISPLAY_TUNE_BY_SRC[src] ??
    AVATAR_2_DISPLAY_TUNE_BY_SRC[src] ??
    AVATAR_INTRO_DISPLAY_TUNE_BY_SRC[src] ??
    DEFAULT_AVATAR_DISPLAY_TUNE
  )
}

/** Ab diesen heutigen Gesamt-XP (Stufe 1): Bild „level1_2“ statt „level1“. */
export const AVATAR_LEVEL1_STAGE2_MIN_DAILY_XP = 25

/** Ab diesen heutigen Gesamt-XP (Stufe 1): Bild „level1_3“. */
export const AVATAR_LEVEL1_STAGE3_MIN_DAILY_XP = 50

export const AVATAR_LEVEL1_MILESTONE_COPY_MIN_DAILY_XP = AVATAR_LEVEL1_STAGE3_MIN_DAILY_XP

export function normalizeAvatarGender(value: unknown): AvatarGender {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return raw === 'female' ? 'female' : 'male'
}

export function getAvatarLibraryId(avatarGender: AvatarGender): 'Avatar_1' | 'Avatar_2' {
  return avatarGender === 'female' ? 'Avatar_2' : 'Avatar_1'
}

export function getAvatarTierFromLevel(level: number): AvatarHappinessTier {
  const n = Math.floor(level)
  const clamped = Math.min(Math.max(n, 1), 4)
  return clamped as AvatarHappinessTier
}

export function getAvatarImagePath(_tier: AvatarHappinessTier, avatarGender: AvatarGender): string {
  const id = getAvatarLibraryId(avatarGender)
  if (id === 'Avatar_2') {
    return AVATAR_FEMALE_LEVEL1_SRC
  }
  return `/avatars/${id}_level1.webp`
}

export function getAvatarLevel1Stage2ImagePath(avatarGender: AvatarGender): string {
  const id = getAvatarLibraryId(avatarGender)
  return `/avatars/${id}_level1_2.webp`
}

export function getAvatarLevel1ParkImagePath(avatarGender: AvatarGender): string {
  return avatarGender === 'female' ? AVATAR_FEMALE_LEVEL1_PARK_SRC : AVATAR_MALE_LEVEL1_PARK_SRC
}

/** Onboarding-Intro: feste Reihenfolge, je 1,5 s, dann von vorne. */
export const ONBOARDING_INTRO_AVATAR_SEQUENCE: readonly string[] = [
  AVATAR_TOGETHER_SRC,
  '/avatars/Avatar_1_level1.webp',
  AVATAR_FEMALE_LEVEL1_SRC,
  '/avatars/Avatar_1_level1_2.webp',
  '/avatars/Avatar_1_level1_3.webp',
  AVATAR_MALE_LEVEL1_PARK_SRC,
  '/avatars/Avatar_2_level1_2.webp',
  '/avatars/Avatar_2_level1_3.webp',
  AVATAR_FEMALE_LEVEL1_PARK_SRC,
  AVATAR_TOGETHER_AFTER_SRC,
]

export function avatarGenderForIntroSrc(src: string): AvatarGender {
  if (src.includes('Together')) return 'male'
  return src.includes('Avatar_2') ? 'female' : 'male'
}

export function getAvatarImageMeta(
  _tier: AvatarHappinessTier,
  dailyXp: number,
  avatarGender: AvatarGender,
): { src: string } {
  const id = getAvatarLibraryId(avatarGender)
  const xp = Math.max(0, Math.floor(dailyXp))
  if (xp >= AVATAR_LEVEL1_STAGE3_MIN_DAILY_XP) {
    return { src: `/avatars/${id}_level1_3.webp` }
  }
  if (xp >= AVATAR_LEVEL1_STAGE2_MIN_DAILY_XP) {
    return { src: `/avatars/${id}_level1_2.webp` }
  }
  if (xp >= AVATAR_LEVEL1_PARK_MIN_DAILY_XP) {
    return { src: getAvatarLevel1ParkImagePath(avatarGender) }
  }
  return { src: getAvatarImagePath(1, avatarGender) }
}
