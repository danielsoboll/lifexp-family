import Link from 'next/link'

import { CARD_BUTTON_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

export type AreaButtonStatus =
  | 'done'
  | 'subdone'
  | 'attention'
  | 'pending'
  | 'highlight'
  | undefined

type DashboardButtonProps = {
  href: string
  emoji: string
  title: string
  subtitle: string
  /** z. B. „1 bis 10 Trainings-XP“ */
  xpHint?: string
  /** Hervorgehobene Empfehlung 1 (dickerer Rahmen). */
  featured?: boolean
  status?: AreaButtonStatus
  /** Lesbare Karten auf grauem Seitenverlauf (Was jetzt tun). */
  tone?: 'default' | 'wjt-primary' | 'wjt-secondary'
}

const TONE_SURFACE_CLASS = {
  'wjt-primary':
    'border-yellow-200/50 bg-slate-700/40 ring-yellow-100/20 backdrop-blur-sm dark:border-yellow-600/45 dark:bg-slate-900/80 dark:ring-yellow-900/35',
  'wjt-secondary':
    'border-white/25 bg-slate-600/35 ring-white/10 backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/65 dark:ring-slate-700/40',
} as const

const TONE_TITLE_CLASS = {
  'wjt-primary': 'text-yellow-50 dark:text-yellow-100',
  'wjt-secondary': 'text-stone-50 dark:text-slate-100',
} as const

const TONE_SUBTITLE_CLASS = {
  'wjt-primary': 'text-yellow-100/90 dark:text-yellow-200/85',
  'wjt-secondary': 'text-white/82 dark:text-slate-300',
} as const

const TONE_XP_CLASS = {
  'wjt-primary': 'text-yellow-100 dark:text-yellow-200/90',
  'wjt-secondary': 'text-white/78 dark:text-emerald-400',
} as const

const TONE_ARROW_CLASS = {
  'wjt-primary': 'text-yellow-100/65 group-hover:text-yellow-50 dark:text-yellow-300/70 dark:group-hover:text-yellow-200',
  'wjt-secondary': 'text-white/55 group-hover:text-white/80 dark:text-slate-500 dark:group-hover:text-emerald-400',
} as const

export default function DashboardButton({
  href,
  emoji,
  title,
  subtitle,
  xpHint,
  featured = false,
  status,
  tone = 'default',
}: DashboardButtonProps) {
  const statusClasses =
    tone !== 'default'
      ? TONE_SURFACE_CLASS[tone]
      : featured
      ? 'border-2 border-emerald-500 bg-gradient-to-b from-emerald-50 via-emerald-100/95 to-teal-200/80 text-emerald-950 ring-2 ring-emerald-300/70 dark:border-emerald-400 dark:from-emerald-950/55 dark:via-emerald-950/40 dark:to-teal-950/50 dark:text-emerald-100 dark:ring-emerald-600/45'
      : status === 'done'
      ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-teal-200/75 text-emerald-950 ring-emerald-200/80 dark:border-emerald-600 dark:from-emerald-900/70 dark:via-emerald-950/55 dark:to-teal-950 dark:text-emerald-100 dark:ring-emerald-800/60'
      : status === 'subdone'
        ? 'border-emerald-300/90 bg-gradient-to-b from-emerald-50/55 via-emerald-50/35 to-emerald-100/45 text-emerald-900 ring-emerald-200/45 dark:border-emerald-700/65 dark:from-emerald-950/30 dark:via-emerald-950/20 dark:to-emerald-900/25 dark:text-emerald-100/95 dark:ring-emerald-800/35'
        : status === 'attention'
          ? 'border-red-300 bg-gradient-to-b from-red-50 via-red-100/80 to-red-200/70 text-red-950 ring-red-200/60 dark:border-red-800 dark:from-red-950/50 dark:via-red-950/35 dark:to-red-900/60 dark:text-red-100 dark:ring-red-900/45'
          : status === 'pending'
            ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'
            : status === 'highlight'
              ? 'border-yellow-200/35 bg-gradient-to-b from-yellow-50/70 via-stone-100 to-yellow-100/55 text-stone-900 ring-1 ring-yellow-100 dark:border-[#fef9c3]/55 dark:from-stone-800 dark:via-yellow-300/[0.12] dark:to-yellow-200/[0.08] dark:text-stone-100 dark:ring-[#fefce8]/45'
              : CARD_BUTTON_SURFACE_CLASS

  const titleClass =
    tone !== 'default' ? TONE_TITLE_CLASS[tone] : 'text-slate-900 dark:text-slate-100'
  const subtitleClass =
    tone !== 'default' ? TONE_SUBTITLE_CLASS[tone] : 'text-slate-600 dark:text-slate-400'
  const xpClass =
    tone !== 'default' ? TONE_XP_CLASS[tone] : 'text-emerald-700 dark:text-emerald-400'
  const arrowClass =
    tone !== 'default'
      ? TONE_ARROW_CLASS[tone]
      : 'text-slate-300 transition group-hover:text-emerald-600 dark:text-slate-600 dark:group-hover:text-emerald-400'

  return (
    <Link
      href={href}
      className={`${PRESSABLE_3D_CLASS} group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border-2 p-4 text-left ring-1 hover:border-emerald-400/90 hover:ring-emerald-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:hover:border-emerald-500/80 ${statusClasses}`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 text-2xl shadow-inner ring-2 ring-slate-300/90 ring-inset dark:from-emerald-900/60 dark:to-emerald-950/40 dark:ring-slate-700/80"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="relative min-w-0 flex-1 pt-0.5">
        {status === 'subdone' ? (
          <span
            className="lifexp-area-subdone-hatch pointer-events-none absolute inset-0 -inset-x-1 rounded-lg"
            aria-hidden
          />
        ) : null}
        <span className={`relative z-[1] block text-lg font-bold tracking-tight ${titleClass}`}>
          {title}
        </span>
        <span className={`relative z-[1] mt-0.5 block text-sm leading-snug ${subtitleClass}`}>
          {subtitle}
        </span>
        {xpHint ? (
          <span className={`relative z-[1] mt-1 block text-sm font-semibold leading-snug ${xpClass}`}>
            {xpHint}
          </span>
        ) : null}
      </span>
      <span className={`mt-2 shrink-0 ${arrowClass}`} aria-hidden>
        →
      </span>
    </Link>
  )
}
