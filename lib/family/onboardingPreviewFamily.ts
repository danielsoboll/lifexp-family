import type { ChildGender } from './memberGender'

/** Happy_all ↔ Happy_all_2 — Anzeigedauer pro Familie in der Onboarding-Vorschau. */
export const HAPPY_ALL_PREVIEW_CYCLE_MS = 7000

/** Hochscrollen vor dem Familien-Wechsel (Scroll zuerst, dann Inhalt tauschen). */
export const ONBOARDING_PREVIEW_SCROLL_MS = 2000

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
      todayXp: 18,
      avatar_url: '/avatars/Mann_1_1.webp',
      accent_key: 'rose',
      ...previewParentMeta,
    },
    {
      id: 'p2',
      display_name: 'Anna',
      gender: 'female',
      todayXp: 23,
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
      todayXp: 18,
      portrait_id: 'Mädchen_1_4',
      sort_order: 0,
      ...previewChildMeta,
    },
    {
      id: 'c2',
      display_name: 'Lars',
      gender: 'boy',
      age: 11,
      todayXp: 8,
      portrait_id: 'Junge_1_3t',
      sort_order: 1,
      ...previewChildMeta,
    },
    {
      id: 'c3',
      display_name: 'Fritz',
      gender: 'boy',
      age: 6,
      todayXp: 30,
      portrait_id: 'Junge_2_4',
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
      todayXp: 18,
      avatar_url: '/avatars/Mann_2_1.webp',
      accent_key: 'rose',
      ...previewParentMeta,
    },
    {
      id: 'p2',
      display_name: 'Ayşe',
      gender: 'female',
      todayXp: 23,
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
      todayXp: 12,
      portrait_id: 'Junge_3_1',
      sort_order: 0,
      ...previewChildMeta,
    },
    {
      id: 'c2',
      display_name: 'Elif',
      gender: 'girl',
      age: 10,
      todayXp: 22,
      portrait_id: 'Mädchen_4_1',
      sort_order: 1,
      ...previewChildMeta,
    },
  ],
}
