import Link from 'next/link'

import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import type { AreaButtonStatus } from './HomeScreen'

function plusConnectorLineClass(status: AreaButtonStatus | undefined): string {
  switch (status) {
    case 'done':
      return 'bg-emerald-400 dark:bg-emerald-600'
    case 'subdone':
      return 'bg-emerald-300/90 dark:bg-emerald-700/80'
    case 'attention':
      return 'bg-red-300 dark:bg-red-800'
    case 'pending':
      return 'bg-yellow-300 dark:bg-yellow-700'
    case 'highlight':
      return 'bg-yellow-200 dark:bg-[#fef9c3]/70'
    default:
      return 'bg-stone-400 dark:bg-stone-600'
  }
}

type TaskPlannerHomeButtonProps = {
  plusStatus?: AreaButtonStatus
  interactive?: boolean
  showHint?: boolean
  /** Gestern-Modus: sichtbar, aber nicht nutzbar. */
  inactive?: boolean
}

const INACTIVE_BUTTON_CLASS =
  'pointer-events-none cursor-not-allowed rounded-2xl border-2 border-stone-300/90 bg-gradient-to-b from-stone-100 via-stone-200/70 to-stone-300/50 px-4 py-3.5 text-left opacity-55 ring-1 ring-stone-400/25 dark:border-stone-600 dark:from-stone-800/80 dark:via-stone-900/70 dark:to-stone-950 dark:ring-stone-700/40'

export default function TaskPlannerHomeButton({
  plusStatus,
  interactive = true,
  showHint = false,
  inactive = false,
}: TaskPlannerHomeButtonProps) {
  const lineClass = inactive ? 'bg-stone-300 dark:bg-stone-600' : plusConnectorLineClass(plusStatus)

  const buttonInner = (
    <>
      <span className="text-2xl" aria-hidden>
        📋
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-center sm:text-left">
        <span
          className={`block text-lg font-bold tracking-tight ${
            inactive ? 'text-stone-500 dark:text-stone-400' : 'text-violet-950 dark:text-violet-100'
          }`}
        >
          Aufgabenplaner
        </span>
        <span
          className={`mt-0.5 block text-sm leading-snug ${
            inactive ? 'text-stone-500/90 dark:text-stone-500' : 'text-violet-800/85 dark:text-violet-200/80'
          }`}
        >
          {inactive ? 'Nur für heute verfügbar' : 'Prioritäten für den Tag setzen'}
        </span>
      </span>
    </>
  )

  const buttonClassName = inactive
    ? `flex w-full items-start justify-center gap-3 ${INACTIVE_BUTTON_CLASS}`
    : `${PRESSABLE_3D_CLASS} flex w-full items-start justify-center gap-3 rounded-2xl border-2 border-violet-400/90 bg-gradient-to-b from-violet-50 via-violet-100/95 to-violet-300/80 px-4 py-3.5 text-left ring-1 ring-violet-300/40 hover:border-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-violet-600 dark:from-violet-950/55 dark:via-violet-900/45 dark:to-violet-950 dark:ring-violet-800/35 dark:hover:border-violet-500`

  const canNavigate = interactive && !inactive

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="flex h-5 items-stretch justify-center gap-1.5"
        aria-hidden
      >
        <span className={`w-0.5 shrink-0 rounded-full ${lineClass}`} />
        <span className={`w-0.5 shrink-0 rounded-full ${lineClass}`} />
      </div>
      {showHint ? (
        <div className="lifexp-task-planner-hint flex w-full justify-center py-0.5" aria-hidden>
          <span className="text-xl leading-none text-yellow-500 dark:text-yellow-300">↓</span>
        </div>
      ) : null}
      <div className="w-[60%] min-w-[11rem] max-w-full">
        {canNavigate ? (
          <Link href="/plus/aufgabenplaner" className={buttonClassName}>
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
