'use client'

import PwaInstallPanel from './PwaInstallPanel'
import {
  isStandaloneDisplayMode,
  recordPwaInstallLaterChoice,
  savePwaInstallLater,
} from '../lib/pwaInstall'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import type { OnboardingDevicePrefs } from '../lib/family/onboardingMember'

type OnboardingPwaStepProps = {
  onContinue: (prefs: OnboardingDevicePrefs) => void
  disabled?: boolean
}

export default function OnboardingPwaStep({ onContinue, disabled = false }: OnboardingPwaStepProps) {
  const handleLater = () => {
    savePwaInstallLater()
    void recordPwaInstallLaterChoice({ persistToProfile: false })
    onContinue({ appInstalled: false, appLater: true })
  }

  const handleDone = () => {
    onContinue({
      appInstalled: isStandaloneDisplayMode(),
      appLater: false,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          LifeXP Family zum Home-Bildschirm
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          So startest du die App wie auf dem Home-Bildschirm — ohne Browser-Leiste.
        </p>
      </div>

      <PwaInstallPanel compact />

      <div className="flex gap-2">
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
          onClick={handleDone}
          disabled={disabled}
          className={`${PRESSABLE_3D_CLASS} flex-1 rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white disabled:opacity-45`}
        >
          Erledigt!
        </button>
      </div>
    </div>
  )
}
