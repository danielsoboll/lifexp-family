'use client'

import { useEffect } from 'react'

import PwaInstallPanel from './PwaInstallPanel'
import { flushOnboardingBridge } from '../lib/family/onboardingBridge'
import {
  getPwaInstallPlatform,
  isIosDevice,
  isStandaloneDisplayMode,
  recordPwaInstallLaterChoice,
  savePwaInstallLater,
} from '../lib/pwaInstall'
import { applyAppIcons } from '../lib/appIcon'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type OnboardingPwaStepProps = {
  onInstallDone: () => void
  onInstallLater: () => void
  disabled?: boolean
}

export default function OnboardingPwaStep({ onInstallDone, onInstallLater, disabled = false }: OnboardingPwaStepProps) {
  const platform = getPwaInstallPlatform()
  const isIos = isIosDevice()

  useEffect(() => {
    applyAppIcons()
    flushOnboardingBridge()
  }, [])

  const handleLater = () => {
    savePwaInstallLater()
    void recordPwaInstallLaterChoice({ persistToProfile: false })
    onInstallLater()
  }

  const handleNativeInstalled = () => {
    if (isStandaloneDisplayMode()) {
      onInstallDone()
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/50 p-4 dark:border-emerald-600/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          Fast geschafft
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          App auf den Home-Bildschirm
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-300">
          {isIos
            ? 'Einmal hinzufügen — danach startest du die App ohne Browser-Leiste, direkt vom Startbildschirm.'
            : platform === 'android'
              ? 'Installiere LifeXP Family auf deinem Startbildschirm — ein Tipp, und die App ist da.'
              : 'So startest du LifeXP Family schneller vom Home-Bildschirm oder Startmenü.'}
        </p>
      </div>

      <PwaInstallPanel prominent onInstalled={handleNativeInstalled} />

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleLater}
          disabled={disabled}
          className={`${PRESSABLE_3D_CLASS} flex-1 rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-3 text-sm font-bold text-stone-800 disabled:opacity-45 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
        >
          Vielleicht später
        </button>
        <button
          type="button"
          onClick={onInstallDone}
          disabled={disabled}
          className={`${PRESSABLE_3D_CLASS} flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-45`}
        >
          Erledigt!
        </button>
      </div>
    </div>
  )
}
