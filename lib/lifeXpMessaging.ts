import type { ReactNode } from 'react'

/** Inline-Meldungen (Hinweise, Warnungen, Fehler) — nicht mit Info-Sheets verwechseln. */
export type LifeXpNoticeTone = 'info' | 'warning' | 'error' | 'success'

export const LIFE_XP_NOTICE_CLASS: Record<LifeXpNoticeTone, string> = {
  info:
    'rounded-2xl border-2 border-sky-300/80 bg-gradient-to-b from-sky-50/95 to-sky-100/55 px-3.5 py-3 text-sm font-semibold leading-relaxed text-sky-950 dark:border-sky-700/70 dark:from-sky-950/40 dark:to-sky-900/30 dark:text-sky-100',
  warning:
    'rounded-2xl border-2 border-amber-300/85 bg-gradient-to-b from-amber-50/95 to-amber-100/55 px-3.5 py-3 text-sm font-semibold leading-relaxed text-amber-950 dark:border-amber-700/70 dark:from-amber-950/45 dark:to-amber-900/30 dark:text-amber-50',
  error:
    'rounded-2xl border-2 border-red-300/85 bg-gradient-to-b from-red-50/95 to-red-100/45 px-3.5 py-3 text-sm font-semibold leading-relaxed text-red-900 dark:border-red-800/70 dark:from-red-950/45 dark:to-red-900/30 dark:text-red-100',
  success:
    'rounded-2xl border-2 border-emerald-300/85 bg-gradient-to-b from-emerald-50/95 to-emerald-100/55 px-3.5 py-3 text-sm font-semibold leading-relaxed text-emerald-950 dark:border-emerald-700/70 dark:from-emerald-950/45 dark:to-emerald-900/30 dark:text-emerald-50',
}

/** Info-Sheets und Bestätigungs-Sheets — getrennt von Inline-Meldungen. */
export type LifeXpSheetVariant = 'sky' | 'amber' | 'emerald'

export type LifeXpSheetHighlight = {
  emoji: string
  label: string
}

export type LifeXpSheetVariantStyle = {
  shell: string
  handle: string
  glow: string
  iconBox: string
  eyebrow: string
  title: string
  body: string
  footer: string
  primaryButton: string
  secondaryButton: string
}

export const LIFE_XP_SHEET_VARIANT: Record<LifeXpSheetVariant, LifeXpSheetVariantStyle> = {
  sky: {
    shell:
      'overflow-hidden rounded-t-[1.75rem] border-2 border-sky-300/80 bg-gradient-to-b from-sky-50 via-white to-white shadow-[0_-12px_48px_-12px_rgba(14,165,233,0.28)] dark:border-sky-700/70 dark:from-sky-950/90 dark:via-slate-950 dark:to-slate-950',
    handle: 'bg-sky-300/80 dark:bg-sky-700/80',
    glow: 'from-sky-200/40 to-transparent dark:from-sky-800/25',
    iconBox:
      'border-sky-400/90 bg-gradient-to-b from-sky-100 via-sky-50 to-sky-200/80 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.4)] ring-sky-200/60 dark:border-sky-600/80 dark:from-sky-950/70 dark:via-sky-900/40 dark:to-sky-950/60 dark:ring-sky-800/40',
    eyebrow: 'text-sky-800/90 dark:text-sky-300/90',
    title: 'text-sky-950 dark:text-sky-50',
    body: 'text-slate-950 dark:text-slate-200',
    footer:
      'border-sky-300/70 bg-gradient-to-b from-sky-50/95 to-sky-100/50 text-sky-950 dark:border-sky-800/50 dark:from-sky-950/50 dark:to-sky-900/30 dark:text-sky-50',
    primaryButton:
      'border-sky-500 bg-gradient-to-b from-sky-300 to-sky-500 text-sky-950 shadow-[0_4px_14px_-4px_rgba(14,165,233,0.45)] ring-sky-400/30 dark:border-sky-600 dark:from-sky-900/80 dark:via-sky-950/70 dark:to-sky-950 dark:text-sky-100 dark:ring-sky-600/40',
    secondaryButton:
      'border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100',
  },
  amber: {
    shell:
      'overflow-hidden rounded-t-[1.75rem] border-2 border-amber-300/80 bg-gradient-to-b from-amber-50 via-white to-white shadow-[0_-12px_48px_-12px_rgba(217,119,6,0.35)] dark:border-amber-700/70 dark:from-amber-950/90 dark:via-slate-950 dark:to-slate-950',
    handle: 'bg-amber-300/80 dark:bg-amber-700/80',
    glow: 'from-amber-200/40 to-transparent dark:from-amber-800/25',
    iconBox:
      'border-amber-400/90 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200/80 shadow-[0_8px_24px_-8px_rgba(217,119,6,0.45)] ring-amber-200/60 dark:border-amber-600/80 dark:from-amber-950/70 dark:via-amber-900/40 dark:to-amber-950/60 dark:ring-amber-800/40',
    eyebrow: 'text-amber-800/90 dark:text-amber-300/90',
    title: 'text-amber-950 dark:text-amber-50',
    body: 'text-slate-950 dark:text-slate-200',
    footer:
      'border-amber-300/70 bg-gradient-to-b from-amber-50/95 to-amber-100/50 text-amber-950 dark:border-amber-800/50 dark:from-amber-950/50 dark:to-amber-900/30 dark:text-amber-50',
    primaryButton:
      'border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.55)] ring-amber-400/30 dark:border-amber-600 dark:from-amber-900/80 dark:via-amber-950/70 dark:to-amber-950 dark:text-amber-100 dark:ring-amber-600/40',
    secondaryButton:
      'border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100',
  },
  emerald: {
    shell:
      'overflow-hidden rounded-t-[1.75rem] border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50 via-white to-white shadow-[0_-12px_48px_-12px_rgba(5,150,105,0.32)] dark:border-emerald-700/70 dark:from-emerald-950/90 dark:via-slate-950 dark:to-slate-950',
    handle: 'bg-emerald-300/80 dark:bg-emerald-700/80',
    glow: 'from-emerald-200/40 to-transparent dark:from-emerald-800/25',
    iconBox:
      'border-emerald-400/90 bg-gradient-to-b from-emerald-100 via-emerald-50 to-emerald-200/80 shadow-[0_8px_24px_-8px_rgba(5,150,105,0.4)] ring-emerald-200/60 dark:border-emerald-600/80 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-emerald-950/60 dark:ring-emerald-800/40',
    eyebrow: 'text-emerald-800/90 dark:text-emerald-300/90',
    title: 'text-emerald-950 dark:text-emerald-50',
    body: 'text-slate-950 dark:text-slate-200',
    footer:
      'border-emerald-300/70 bg-gradient-to-b from-emerald-50/95 to-emerald-100/50 text-emerald-950 dark:border-emerald-800/50 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:text-emerald-50',
    primaryButton:
      'border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.45)] ring-emerald-400/30 dark:border-emerald-600 dark:from-emerald-800 dark:to-emerald-950 dark:text-emerald-50 dark:ring-emerald-600/40',
    secondaryButton:
      'border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100',
  },
}

export type LifeXpInfoSheetProps = {
  titleId?: string
  eyebrow?: string
  title: string
  emoji?: string
  body?: ReactNode
  footer?: ReactNode
  highlights?: LifeXpSheetHighlight[]
  variant?: LifeXpSheetVariant
  dismissLabel?: string
  onClose: () => void
}

export type LifeXpConfirmSheetProps = {
  titleId?: string
  eyebrow?: string
  title: string
  emoji?: string
  body?: ReactNode
  variant?: LifeXpSheetVariant
  confirmLabel: string
  cancelLabel?: string
  confirmBusy?: boolean
  onConfirm: () => void
  onCancel: () => void
}
