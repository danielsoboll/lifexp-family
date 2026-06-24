import type { ChildGender } from './memberGender'

/** Familie 1: Happy-Banner zuerst, danach Scroll + XP-Takt (nur Flow, gleiche 2-s-Schritte). */
export const ONBOARDING_PREVIEW_FAMILY_1_INTRO_MS = 2000

/** Familie 1 in der Onboarding-Vorschau — Intro 2 s + 4×2 s XP + 2 s Haltephase. */
export const ONBOARDING_PREVIEW_FAMILY_SET_1_MS = 12000

/** Familie 2 — gleiche Anzeigedauer wie Set 1; Promo-Banner in den letzten 4 s. */
export const ONBOARDING_PREVIEW_FAMILY_SET_2_MS = 10000

/** Promo-Banner erscheint so viele ms nach Start von Familie 2. */
export const ONBOARDING_PREVIEW_FAMILY_2_PROMO_DELAY_MS = 5000

/** Sichtbare Dauer des Promo-Banners in Familie 2 (danach ausblenden). */
export const ONBOARDING_PREVIEW_FAMILY_2_PROMO_VISIBLE_MS = 4000

/** @deprecated Nutze ONBOARDING_PREVIEW_FAMILY_SET_1_MS */
export const HAPPY_ALL_PREVIEW_CYCLE_MS = ONBOARDING_PREVIEW_FAMILY_SET_1_MS

/** Hochscrollen vor dem Familien-Wechsel (Scroll zuerst, dann Inhalt tauschen). */
export const ONBOARDING_PREVIEW_SCROLL_MS = 2000

/** Familie 1: kurzer Scroll zu Fritz direkt vor dem Hochscrollen. */
export const ONBOARDING_PREVIEW_FAMILY_1_FRITZ_SCROLL_MS = 800

/** Familie 1: kurz Fritz vollständig zeigen, dann hochscrollen. */
export const ONBOARDING_PREVIEW_FAMILY_1_FRITZ_HOLD_MS = 500

export const ONBOARDING_PREVIEW_FRITZ_SELECTOR = '[data-onboarding-preview-fritz]'

/** Nach letztem XP-Stand: kurze Pause, dann Scroll + Familienwechsel. */
export const ONBOARDING_PREVIEW_END_PAUSE_MS = 1000

/** Dauer pro Familie inkl. End-Pause — vor Scroll/Wechsel. */
export function onboardingPreviewFamilyDisplayMs(alternateFamily: boolean): number {
  const setMs = alternateFamily ? ONBOARDING_PREVIEW_FAMILY_SET_2_MS : ONBOARDING_PREVIEW_FAMILY_SET_1_MS
  return setMs + ONBOARDING_PREVIEW_END_PAUSE_MS
}

/** Familie 2: Promo ausblenden (relativ zum Start von Familie 2). */
export function onboardingPreviewFamily2PromoHideMs(): number {
  return ONBOARDING_PREVIEW_FAMILY_2_PROMO_DELAY_MS + ONBOARDING_PREVIEW_FAMILY_2_PROMO_VISIBLE_MS
}

export type OnboardingPreviewParent = {
  id: string
  display_name: string
  gender: 'male' | 'female'
  role: 'parent'
  can_admin: boolean
  todayXp: number
  avatar_url: string
  accent_key: string
  rec_code: null
  rec_code_ok: false
  app_installed: false
  app_later: false
  created_at: ''
  updated_at: ''
}

export type OnboardingPreviewChild = {
  id: string
  display_name: string
  gender: ChildGender
  age: number
  can_admin: false
  todayXp: number
  family_id: ''
  portrait_id: string
  total_xp: 0
  level: 1
  is_active: true
  sort_order: number
  notes: null
  accent_key: string
  rec_code: null
  rec_code_ok: false
  app_installed: false
  app_later: false
  created_at: ''
  updated_at: ''
}

const previewParentMeta = {
  role: 'parent' as const,
  can_admin: true,
  rec_code: null,
  rec_code_ok: false as const,
  app_installed: false as const,
  app_later: false as const,
  created_at: '' as const,
  updated_at: '' as const,
}

const previewChildMeta = {
  can_admin: false as const,
  family_id: '' as const,
  total_xp: 0 as const,
  level: 1 as const,
  is_active: true as const,
  notes: null,
  accent_key: 'sky',
  rec_code: null,
  rec_code_ok: false as const,
  app_installed: false as const,
  app_later: false as const,
  created_at: '' as const,
  updated_at: '' as const,
}

/** Set 1 — Happy_all (Mirko, Anna, Lisa, Lars, Fritz). */
export const ONBOARDING_PREVIEW_FAMILY_SET_1: {
  parents: OnboardingPreviewParent[]
  children: OnboardingPreviewChild[]
} = {
  parents: [
    {
      id: 'p1',
      display_name: 'Mirko',
      gender: 'male',
      todayXp: 2,
      avatar_url: '/avatars/Mann_1_1.webp',
      accent_key: 'rose',
      ...previewParentMeta,
    },
    {
      id: 'p2',
      display_name: 'Anna',
      gender: 'female',
      todayXp: 4,
      avatar_url: '/avatars/Frau_1_1.webp',
      accent_key: 'amber',
      ...previewParentMeta,
    },
  ],
  children: [
    {
      id: 'c1',
      display_name: 'Lisa',
      gender: 'girl',
      age: 10,
      todayXp: 2,
      portrait_id: 'Mädchen_1_1',
      sort_order: 0,
      ...previewChildMeta,
    },
    {
      id: 'c2',
      display_name: 'Lars',
      gender: 'boy',
      age: 11,
      todayXp: 2,
      portrait_id: 'Junge_1_1',
      sort_order: 1,
      ...previewChildMeta,
    },
    {
      id: 'c3',
      display_name: 'Fritz',
      gender: 'boy',
      age: 6,
      todayXp: 4,
      portrait_id: 'Junge_2_1',
      sort_order: 2,
      ...previewChildMeta,
    },
  ],
}

/** Set 2 — Happy_all_2 (Ali, Ayşe, Can, Elif — 4 Mitglieder). */
export const ONBOARDING_PREVIEW_FAMILY_SET_2: {
  parents: OnboardingPreviewParent[]
  children: OnboardingPreviewChild[]
} = {
  parents: [
    {
      id: 'p1',
      display_name: 'Ali',
      gender: 'male',
      todayXp: 3,
      avatar_url: '/avatars/Mann_2_1.webp',
      accent_key: 'rose',
      ...previewParentMeta,
    },
    {
      id: 'p2',
      display_name: 'Ayşe',
      gender: 'female',
      todayXp: 5,
      avatar_url: '/avatars/Frau_2_1.webp',
      accent_key: 'amber',
      ...previewParentMeta,
    },
  ],
  children: [
    {
      id: 'c1',
      display_name: 'Can',
      gender: 'boy',
      age: 11,
      todayXp: 5,
      portrait_id: 'Junge_3_1',
      sort_order: 0,
      ...previewChildMeta,
    },
    {
      id: 'c2',
      display_name: 'Elif',
      gender: 'girl',
      age: 7,
      todayXp: 4,
      portrait_id: 'Mädchen_4_1',
      sort_order: 1,
      ...previewChildMeta,
    },
  ],
}
