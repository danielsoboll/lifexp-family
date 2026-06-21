import Link from 'next/link'

import { PILL_BACK_CLASS } from '../lib/appShell'

type HeaderActionPillProps = {
  label: string
  href?: string
  /** Vorschau ohne Navigation (Startbildschirm). */
  preview?: boolean
  setupGuideTarget?: string
  highlightClass?: string
}

export default function HeaderActionPill({
  label,
  href,
  preview = false,
  setupGuideTarget,
  highlightClass = '',
}: HeaderActionPillProps) {
  if (preview || !href) {
    return (
      <span className={`${PILL_BACK_CLASS} pointer-events-none px-3 py-2 opacity-70`} aria-hidden>
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      data-setup-guide-target={setupGuideTarget}
      className={`${PILL_BACK_CLASS} px-3 py-2 ${highlightClass}`}
    >
      {label}
    </Link>
  )
}
