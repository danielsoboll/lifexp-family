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

export const MEMBER_ACCENT_LABELS: Record<MemberAccentKey, string> = {
  amber: 'Gelb',
  rose: 'Rot',
  sky: 'Blau',
  mint: 'Grün',
  lavender: 'Violett',
  peach: 'Orange',
  sand: 'Sand',
  blush: 'Rosa',
}

export type MemberAccentStyle = {
  key: MemberAccentKey
  cardClass: string
  nameClass: string
  chipClass: string
}

const ACCENT_STYLES: Record<MemberAccentKey, MemberAccentStyle> = {
  amber: {
    key: 'amber',
    cardClass:
      'border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-amber-50/40 ring-amber-200/50 dark:border-amber-700/60 dark:from-amber-950/35 dark:via-slate-900/95 dark:to-amber-950/20 dark:ring-amber-900/40',
    nameClass: 'text-amber-950 dark:text-amber-100',
    chipClass: 'bg-amber-200/80 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100',
  },
  rose: {
    key: 'rose',
    cardClass:
      'border-rose-300/70 bg-gradient-to-br from-rose-50/95 via-white to-rose-50/40 ring-rose-200/50 dark:border-rose-800/60 dark:from-rose-950/35 dark:via-slate-900/95 dark:to-rose-950/20 dark:ring-rose-900/40',
    nameClass: 'text-rose-950 dark:text-rose-100',
    chipClass: 'bg-rose-200/80 text-rose-950 dark:bg-rose-900/50 dark:text-rose-100',
  },
  sky: {
    key: 'sky',
    cardClass:
      'border-sky-300/70 bg-gradient-to-br from-sky-50/95 via-white to-sky-50/40 ring-sky-200/50 dark:border-sky-800/60 dark:from-sky-950/35 dark:via-slate-900/95 dark:to-sky-950/20 dark:ring-sky-900/40',
    nameClass: 'text-sky-950 dark:text-sky-100',
    chipClass: 'bg-sky-200/80 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100',
  },
  mint: {
    key: 'mint',
    cardClass:
      'border-emerald-300/60 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/35 ring-emerald-200/45 dark:border-emerald-800/55 dark:from-emerald-950/30 dark:via-slate-900/95 dark:to-emerald-950/15 dark:ring-emerald-900/35',
    nameClass: 'text-emerald-950 dark:text-emerald-100',
    chipClass: 'bg-emerald-200/75 text-emerald-950 dark:bg-emerald-900/45 dark:text-emerald-100',
  },
  lavender: {
    key: 'lavender',
    cardClass:
      'border-violet-300/65 bg-gradient-to-br from-violet-50/95 via-white to-violet-50/40 ring-violet-200/45 dark:border-violet-800/55 dark:from-violet-950/30 dark:via-slate-900/95 dark:to-violet-950/15 dark:ring-violet-900/35',
    nameClass: 'text-violet-950 dark:text-violet-100',
    chipClass: 'bg-violet-200/75 text-violet-950 dark:bg-violet-900/45 dark:text-violet-100',
  },
  peach: {
    key: 'peach',
    cardClass:
      'border-orange-300/65 bg-gradient-to-br from-orange-50/95 via-white to-orange-50/35 ring-orange-200/45 dark:border-orange-800/55 dark:from-orange-950/30 dark:via-slate-900/95 dark:to-orange-950/15 dark:ring-orange-900/35',
    nameClass: 'text-orange-950 dark:text-orange-100',
    chipClass: 'bg-orange-200/75 text-orange-950 dark:bg-orange-900/45 dark:text-orange-100',
  },
  sand: {
    key: 'sand',
    cardClass:
      'border-stone-300/75 bg-gradient-to-br from-stone-50/95 via-white to-stone-100/50 ring-stone-200/50 dark:border-stone-600/60 dark:from-stone-900/40 dark:via-slate-900/95 dark:to-stone-950/25 dark:ring-stone-700/40',
    nameClass: 'text-stone-900 dark:text-stone-100',
    chipClass: 'bg-stone-200/80 text-stone-900 dark:bg-stone-800/60 dark:text-stone-100',
  },
  blush: {
    key: 'blush',
    cardClass:
      'border-pink-300/70 bg-gradient-to-br from-pink-50/95 via-white to-pink-50/40 ring-pink-200/45 dark:border-pink-800/55 dark:from-pink-950/30 dark:via-slate-900/95 dark:to-pink-950/15 dark:ring-pink-900/35',
    nameClass: 'text-pink-950 dark:text-pink-100',
    chipClass: 'bg-pink-200/75 text-pink-950 dark:bg-pink-900/45 dark:text-pink-100',
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
