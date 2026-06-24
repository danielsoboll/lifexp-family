'use client'

import { useState } from 'react'

import { isAndroidDevice, isIosDevice } from '../lib/pwaInstall'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type OpenPwaHintProps = {
  /** Recovery-Schritt im Browser — wie LifeXP advanceToNextStep(). */
  onContinueInBrowser: () => void
  /** Draft flushen, dann window.close() (Safari blockiert das meist). */
  onCloseTab?: () => void
}

/** Nach „Erledigt!“ im Browser — App vom Home-Bildschirm öffnen oder im Browser weiter. */
export default function OpenPwaHint({ onContinueInBrowser, onCloseTab }: OpenPwaHintProps) {
  const [closeBlocked, setCloseBlocked] = useState(false)

  const handleCloseTab = () => {
    onCloseTab?.()
    window.setTimeout(() => setCloseBlocked(true), 250)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-pwa-hint-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2
          id="open-pwa-hint-title"
          className="text-balance text-center text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          {closeBlocked
            ? 'Wechsle zum Startbildschirm'
            : isIosDevice()
              ? 'LifeXP Family vom Home-Bildschirm öffnen'
              : isAndroidDevice()
                ? 'LifeXP Family vom Startbildschirm öffnen'
                : 'LifeXP Family als App öffnen'}
        </h2>
        <p className="mt-3 text-balance text-center text-sm leading-relaxed text-slate-950 dark:text-slate-300">
          {closeBlocked
            ? isIosDevice()
              ? 'Safari kann diesen Tab nicht automatisch schließen. Tippe auf das LifeXP-Family-Symbol auf deinem Home-Bildschirm — alle Eingaben sind gespeichert.'
              : 'Dieser Tab bleibt offen. Öffne LifeXP Family über das Symbol auf deinem Startbildschirm — alle Eingaben sind gespeichert.'
            : isIosDevice()
              ? 'Tippe auf das LifeXP-Family-Symbol auf deinem Home-Bildschirm. Alle Eingaben bleiben gespeichert.'
              : isAndroidDevice()
                ? 'Öffne LifeXP Family über das App-Symbol auf deinem Startbildschirm. Alle Eingaben bleiben gespeichert.'
                : 'Öffne LifeXP Family über das Symbol auf deinem Startbildschirm. Alle Eingaben bleiben gespeichert.'}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onContinueInBrowser}
            className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white`}
          >
            Im Browser fortsetzen
          </button>
          {!closeBlocked && onCloseTab ? (
            <>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Alle Eingaben bleiben bestehen.
              </p>
              <button
                type="button"
                onClick={handleCloseTab}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
              >
                Diesen Tab schließen
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
