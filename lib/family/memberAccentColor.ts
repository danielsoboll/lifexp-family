import type { QuestAssignee } from './types'
import type { ParentMember } from './members'
import type { ChildWithTodayXp } from './types'

export const MEMBER_ACCENT_PALETTE = [
  'amber',
  'rose',
  'sky',
  'mint',
  'lavender',
  'peach',
  'sand',
  'blush',
] as const

export type MemberAccentKey = (typeof MEMBER_ACCENT_PALETTE)[number]

export type MemberAccentStyle = {
  key: MemberAccentKey
  cardClass: string
  nameClass: string
  chipClass: string
  /** Vorschau in Admin — entspricht Quest-Karten */
  swatchClass: string
}

const ACCENT_STYLES: Record<MemberAccentKey, MemberAccentStyle> = {
  amber: {
    key: 'amber',
    cardClass:
      'border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-amber-50/40 ring-amber-200/50 dark:border-amber-700/60 dark:from-amber-950/35 dark:via-slate-900/95 dark:to-amber-950/20 dark:ring-amber-900/40',
    nameClass: 'text-amber-950 dark:text-amber-200',
    chipClass: 'bg-amber-200/80 text-amber-950 dark:bg-amber-800/70 dark:text-amber-100',
    swatchClass:
      'border-amber-300/80 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200/90 dark:border-amber-600/70 dark:from-amber-900 dark:via-amber-950 dark:to-amber-800',
  },
  rose: {
    key: 'rose',
    cardClass:
      'border-rose-300/70 bg-gradient-to-br from-rose-50/95 via-white to-rose-50/40 ring-rose-200/50 dark:border-rose-800/60 dark:from-rose-950/35 dark:via-slate-900/95 dark:to-rose-950/20 dark:ring-rose-900/40',
    nameClass: 'text-rose-950 dark:text-rose-200',
    chipClass: 'bg-rose-200/80 text-rose-950 dark:bg-rose-800/65 dark:text-rose-100',
    swatchClass:
      'border-rose-300/80 bg-gradient-to-br from-rose-100 via-rose-50 to-rose-200/90 dark:border-rose-700/70 dark:from-rose-950 dark:via-rose-900 dark:to-rose-800',
  },
  sky: {
    key: 'sky',
    cardClass:
      'border-sky-300/70 bg-gradient-to-br from-sky-50/95 via-white to-sky-50/40 ring-sky-200/50 dark:border-sky-800/60 dark:from-sky-950/35 dark:via-slate-900/95 dark:to-sky-950/20 dark:ring-sky-900/40',
    nameClass: 'text-sky-950 dark:text-sky-200',
    chipClass: 'bg-sky-200/80 text-sky-950 dark:bg-sky-800/65 dark:text-sky-100',
    swatchClass:
      'border-sky-300/80 bg-gradient-to-br from-sky-100 via-sky-50 to-sky-200/90 dark:border-sky-700/70 dark:from-sky-950 dark:via-sky-900 dark:to-sky-800',
  },
  mint: {
    key: 'mint',
    cardClass:
      'border-emerald-300/60 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/35 ring-emerald-200/45 dark:border-emerald-800/55 dark:from-emerald-950/30 dark:via-slate-900/95 dark:to-emerald-950/15 dark:ring-emerald-900/35',
    nameClass: 'text-emerald-950 dark:text-emerald-200',
    chipClass: 'bg-emerald-200/75 text-emerald-950 dark:bg-emerald-800/60 dark:text-emerald-100',
    swatchClass:
      'border-emerald-300/75 bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-200/85 dark:border-emerald-700/65 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-800',
  },
  lavender: {
    key: 'lavender',
    cardClass:
      'border-violet-300/65 bg-gradient-to-br from-violet-50/95 via-white to-violet-50/40 ring-violet-200/45 dark:border-violet-800/55 dark:from-violet-950/30 dark:via-slate-900/95 dark:to-violet-950/15 dark:ring-violet-900/35',
    nameClass: 'text-violet-950 dark:text-violet-200',
    chipClass: 'bg-violet-200/75 text-violet-950 dark:bg-violet-800/60 dark:text-violet-100',
    swatchClass:
      'border-violet-300/75 bg-gradient-to-br from-violet-100 via-violet-50 to-violet-200/85 dark:border-violet-700/65 dark:from-violet-950 dark:via-violet-900 dark:to-violet-800',
  },
  peach: {
    key: 'peach',
    cardClass:
      'border-orange-300/65 bg-gradient-to-br from-orange-50/95 via-white to-orange-50/35 ring-orange-200/45 dark:border-orange-800/55 dark:from-orange-950/30 dark:via-slate-900/95 dark:to-orange-950/15 dark:ring-orange-900/35',
    nameClass: 'text-orange-950 dark:text-orange-200',
    chipClass: 'bg-orange-200/75 text-orange-950 dark:bg-orange-800/60 dark:text-orange-100',
    swatchClass:
      'border-orange-300/75 bg-gradient-to-br from-orange-100 via-orange-50 to-orange-200/85 dark:border-orange-700/65 dark:from-orange-950 dark:via-orange-900 dark:to-orange-800',
  },
  sand: {
    key: 'sand',
    cardClass:
      'border-stone-300/75 bg-gradient-to-br from-stone-50/95 via-white to-stone-100/50 ring-stone-200/50 dark:border-stone-600/60 dark:from-stone-900/40 dark:via-slate-900/95 dark:to-stone-950/25 dark:ring-stone-700/40',
    nameClass: 'text-stone-900 dark:text-stone-200',
    chipClass: 'bg-stone-200/80 text-stone-900 dark:bg-stone-700/70 dark:text-stone-100',
    swatchClass:
      'border-stone-400/80 bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300/90 dark:border-stone-500/70 dark:from-stone-800 dark:via-stone-700 dark:to-stone-600',
  },
  blush: {
    key: 'blush',
    cardClass:
      'border-pink-300/70 bg-gradient-to-br from-pink-50/95 via-white to-pink-50/40 ring-pink-200/45 dark:border-pink-800/55 dark:from-pink-950/30 dark:via-slate-900/95 dark:to-pink-950/15 dark:ring-pink-900/35',
    nameClass: 'text-pink-950 dark:text-pink-200',
    chipClass: 'bg-pink-200/75 text-pink-950 dark:bg-pink-800/60 dark:text-pink-100',
    swatchClass:
      'border-pink-300/75 bg-gradient-to-br from-pink-100 via-pink-50 to-pink-200/85 dark:border-pink-700/65 dark:from-pink-950 dark:via-pink-900 dark:to-pink-800',
  },
}

export function normalizeMemberAccentKey(value: unknown): MemberAccentKey {
  const raw = typeof value === 'string' ? value.trim() : ''
  if ((MEMBER_ACCENT_PALETTE as readonly string[]).includes(raw)) {
    return raw as MemberAccentKey
  }
  return 'amber'
}

export function memberAccentStyle(key: unknown): MemberAccentStyle {
  return ACCENT_STYLES[normalizeMemberAccentKey(key)]
}

export function pickAccentKeyByIndex(index: number): MemberAccentKey {
  const n = Math.max(0, Math.floor(index))
  return MEMBER_ACCENT_PALETTE[n % MEMBER_ACCENT_PALETTE.length] ?? 'amber'
}

export function pickNextMemberAccentKey(usedKeys: ReadonlyArray<string | null | undefined>): MemberAccentKey {
  const used = new Set(usedKeys.map((key) => normalizeMemberAccentKey(key)))
  for (const key of MEMBER_ACCENT_PALETTE) {
    if (!used.has(key)) return key
  }
  return pickAccentKeyByIndex(used.size)
}

export function accentKeyForAssignee(
  assignee: QuestAssignee | null,
  parents: ReadonlyArray<Pick<ParentMember, 'id' | 'accent_key'>>,
  children: ReadonlyArray<Pick<ChildWithTodayXp, 'id' | 'accent_key'>>,
): MemberAccentKey {
  if (!assignee) return 'amber'
  if (assignee.type === 'parent') {
    const parent = parents.find((p) => p.id === assignee.id)
    return normalizeMemberAccentKey(parent?.accent_key)
  }
  const child = children.find((c) => c.id === assignee.id)
  return normalizeMemberAccentKey(child?.accent_key)
}
