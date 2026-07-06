import type { ReactNode } from 'react'

import { LIFE_XP_NOTICE_CLASS, type LifeXpNoticeTone } from '../lib/lifeXpMessaging'

type LifeXpNoticeProps = {
  tone?: LifeXpNoticeTone
  children: ReactNode
  className?: string
  role?: 'status' | 'alert'
}

/** Inline-Meldung — Hinweise, Warnungen, Fehler auf der Seite (kein Sheet). */
export default function LifeXpNotice({
  tone = 'info',
  children,
  className = '',
  role = tone === 'error' ? 'alert' : 'status',
}: LifeXpNoticeProps) {
  return (
    <div className={`${LIFE_XP_NOTICE_CLASS[tone]} ${className}`.trim()} role={role}>
      {children}
    </div>
  )
}
