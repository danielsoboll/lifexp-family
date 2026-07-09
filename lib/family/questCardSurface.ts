import type { QuestFulfillmentStatus } from './types'

/** Kartenfläche nach Erledigungs-Status — warm für offen/wartend, grün für erledigt. */
export function questStatusSurfaceClass(status: QuestFulfillmentStatus): string {
  switch (status) {
    case 'open':
      return 'border-amber-400/85 bg-gradient-to-br from-amber-100/95 via-amber-50/85 to-white shadow-sm ring-1 ring-amber-300/45 dark:border-amber-600/70 dark:from-amber-950/55 dark:via-amber-950/35 dark:to-slate-900/95 dark:ring-amber-800/40'
    case 'awaiting_creator':
      return 'border-amber-500/90 bg-gradient-to-br from-yellow-100/90 via-amber-50/80 to-white shadow-sm ring-1 ring-amber-400/50 dark:border-amber-500/75 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-slate-900/95 dark:ring-amber-700/45'
    case 'done':
      return 'border-emerald-400/85 bg-gradient-to-br from-emerald-100/90 via-emerald-50/75 to-emerald-50/50 shadow-sm ring-1 ring-emerald-300/40 dark:border-emerald-600/65 dark:from-emerald-950/50 dark:via-emerald-950/30 dark:to-slate-900/95 dark:ring-emerald-800/35'
  }
}

export const QUEST_STATUS_BADGE_CLASS: Record<QuestFulfillmentStatus, { text: string; className: string }> = {
  open: {
    text: 'Offen',
    className:
      'bg-amber-200/95 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100',
  },
  awaiting_creator: {
    text: 'Wartet auf OK',
    className:
      'bg-yellow-200/95 text-amber-950 dark:bg-amber-900/55 dark:text-yellow-100',
  },
  done: {
    text: 'Erledigt',
    className:
      'bg-emerald-200/95 text-emerald-950 dark:bg-emerald-900/55 dark:text-emerald-100',
  },
}
