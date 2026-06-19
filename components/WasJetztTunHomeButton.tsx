import Link from 'next/link'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'

/** Gleicher Look wie Bereichs-Buttons im Status „pending“ (orange/gelb). */
const PENDING_BUTTON_CLASS =
  'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'

const EMPHASIZED_BUTTON_CLASS =
  'border-white bg-white text-slate-900 ring-2 ring-white/95 shadow-[0_10px_28px_rgb(15_23_42/0.24)] dark:border-slate-100 dark:bg-white dark:text-slate-900 dark:ring-white/85'

export const WAS_JETZT_TUN_HOME_ELEMENT_ID = 'was-jetzt-tun-home'

type WasJetztTunHomeButtonProps = {
  interactive?: boolean
  showHint?: boolean
  inactive?: boolean
  /** Grauer Zustand, weil Mein Tag / Planer noch fehlt (nicht Gestern-Modus). */
  locked?: boolean
  /** Nach Denkblase-Klick: weißer Hintergrund und vergrößert. */
  emphasized?: boolean
}

const INACTIVE_BUTTON_CLASS =
  'pointer-events-none cursor-not-allowed rounded-2xl border-2 border-stone-300/90 bg-gradient-to-b from-stone-100 via-stone-200/70 to-stone-300/50 px-4 py-3.5 text-left opacity-70 ring-1 ring-stone-400/25 dark:border-stone-600 dark:from-stone-800/80 dark:via-stone-900/70 dark:to-stone-950 dark:ring-stone-700/40'

export default function WasJetztTunHomeButton({
  interactive = true,
  showHint = false,
  inactive = false,
  locked = false,
  emphasized = false,
}: WasJetztTunHomeButtonProps) {
  const activeSurfaceClass = emphasized ? EMPHASIZED_BUTTON_CLASS : PENDING_BUTTON_CLASS
  const activeHoverClass = emphasized
    ? 'hover:border-slate-200 focus-visible:outline-slate-600 dark:hover:border-slate-300'
    : 'hover:border-yellow-400 focus-visible:outline-amber-600 dark:hover:border-yellow-600'

  const buttonClassName = inactive
    ? `flex w-full items-start justify-center gap-3 ${INACTIVE_BUTTON_CLASS}`
    : `${PRESSABLE_3D_CLASS} flex w-full items-start justify-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left ring-1 transition-all duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${activeHoverClass} ${activeSurfaceClass}`

  const canNavigate = interactive && !inactive

  const buttonInner = (
    <>
      <span className="text-2xl" aria-hidden>
        🎯
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-center sm:text-left">
        <span
          className={`block text-lg font-bold tracking-tight ${
            inactive ? 'text-stone-500 dark:text-stone-400' : ''
          }`}
        >
          Was jetzt tun?
        </span>
        {inactive && !locked ? (
          <span className="mt-0.5 block text-sm leading-snug text-stone-500/90 dark:text-stone-500">
            Nur für heute verfügbar
          </span>
        ) : null}
        {locked ? (
          <span className="mt-0.5 block text-sm leading-snug text-stone-500/90 dark:text-stone-500">
            Erst Streak 1: Bin dabei!
          </span>
        ) : null}
      </span>
    </>
  )

  return (
    <div
      id={WAS_JETZT_TUN_HOME_ELEMENT_ID}
      className="mt-3 flex w-full scroll-mt-28 flex-col items-center"
    >
      {showHint ? (
        <div className="lifexp-task-planner-hint flex w-full justify-center py-0.5" aria-hidden>
          <span className="text-xl leading-none text-yellow-500 dark:text-yellow-300">↓</span>
        </div>
      ) : null}
      <div
        className={`w-[60%] min-w-[11rem] max-w-full origin-center transition-transform duration-500 ease-out ${
          emphasized ? 'scale-110' : 'scale-100'
        }`}
      >
        {canNavigate ? (
          <Link href="/was-jetzt-tun" className={buttonClassName}>
            {buttonInner}
          </Link>
        ) : (
          <div
            className={buttonClassName}
            aria-hidden={!inactive}
            aria-disabled={inactive}
            role={inactive ? 'presentation' : undefined}
          >
            {buttonInner}
          </div>
        )}
      </div>
    </div>
  )
}
