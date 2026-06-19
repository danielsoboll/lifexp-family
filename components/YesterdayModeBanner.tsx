'use client'

import { useEffect, useState } from 'react'

import { isYesterdayViewActive, LIFEXP_VIEW_DATE_CHANGED_EVENT } from '../lib/activeEventDate'
import { getActiveUsername } from '../lib/user'

export default function YesterdayModeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const sync = () => {
      setVisible(Boolean(getActiveUsername()) && isYesterdayViewActive())
    }
    sync()
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[150] bg-slate-900/[0.03] dark:bg-black/10"
      aria-hidden
    >
      <div className="flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="rounded-full border border-white/25 bg-slate-900/50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-md dark:bg-black/45">
          Gestern
        </div>
      </div>
    </div>
  )
}
