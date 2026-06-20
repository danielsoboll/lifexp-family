import Link from 'next/link'
import type { ReactNode } from 'react'

import { PILL_BACK_CLASS } from '../lib/appShell'
import InfoButton from './InfoButton'
import ThemeToggle from './ThemeToggle'

type PageHeaderBarProps = {
  backHref: string
  backLabel?: string
  compact?: boolean
  infoHref?: string
  infoLabel?: string
  /** Optional, z. B. „Eigene“ — wird unter dem Info-Button angezeigt. */
  headerSecondaryAction?: ReactNode
  onBackClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export default function PageHeaderBar({
  backHref,
  backLabel = 'Zurück',
  compact = false,
  infoHref,
  infoLabel,
  headerSecondaryAction,
  onBackClick,
}: PageHeaderBarProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-3' : 'mb-6'}`}>
      <Link href={backHref} onClick={onBackClick} className={`${PILL_BACK_CLASS} mb-0`}>
        <span aria-hidden>←</span>
        {backLabel}
      </Link>
      <div className="flex flex-col items-end gap-2">
        <ThemeToggle />
        {infoHref || headerSecondaryAction ? (
          <div className="flex flex-col items-end gap-1.5">
            {infoHref ? <InfoButton href={infoHref} label={infoLabel ?? 'Info'} /> : null}
            {headerSecondaryAction}
          </div>
        ) : null}
      </div>
    </div>
  )
}
