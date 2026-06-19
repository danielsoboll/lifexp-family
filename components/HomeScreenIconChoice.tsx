'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import {
  canShowNativeInstallPrompt,
  isIosDevice,
  isStandaloneDisplayMode,
  loadHomeScreenIconPreference,
  requestPwaInstall,
  saveHomeScreenIconPreference,
  type HomeScreenIconPreference,
  type PwaInstallResult,
} from '../lib/pwaInstall'
import { IosInstallSteps } from './PwaInstallPanel'

const choiceButtonClass = (selected: boolean) =>
  `lifexp-pressable-3d rounded-2xl border-2 px-3 py-3 text-center text-sm font-bold ${
    selected
      ? 'border-emerald-500 bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-teal-200/70 text-slate-900 dark:border-emerald-400 dark:from-emerald-900/65 dark:via-emerald-950/50 dark:to-teal-950 dark:text-slate-100'
      : 'border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-slate-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200'
  }`

type HomeScreenIconChoiceProps = {
  value: HomeScreenIconPreference | null
  onChange: (value: HomeScreenIconPreference) => void
  hintMessage?: string | null
  onHintChange?: (message: string | null) => void
  /** Beim Tippen auf „Ja“ direkt Installationsdialog starten. */
  autoInstallOnYes?: boolean
}

function hintForResult(result: PwaInstallResult): string | null {
  switch (result) {
    case 'installed':
      return 'LifeXP wurde auf deinem Homescreen installiert.'
    case 'already-installed':
      return 'LifeXP läuft bereits als App auf deinem Homescreen.'
    case 'ios-manual':
      return 'Folge den Schritten unten in Safari — zuerst die 3 Punkte unten rechts, dann Teilen.'
    case 'dismissed':
      return 'Installation abgebrochen. Du kannst es später in den Einstellungen erneut versuchen.'
    case 'unavailable':
      return 'Öffne LifeXP in Safari (iOS) oder Chrome (Android) und wähle „Zum Startbildschirm hinzufügen“ im Browser-Menü.'
    default:
      return null
  }
}

export default function HomeScreenIconChoice({
  value,
  onChange,
  hintMessage,
  onHintChange,
  autoInstallOnYes = true,
}: HomeScreenIconChoiceProps) {
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandaloneDisplayMode())
    const saved = loadHomeScreenIconPreference()
    if (!value && saved) {
      onChange(saved)
    }
  }, [onChange, value])

  const applyChoice = async (choice: HomeScreenIconPreference) => {
    onChange(choice)
    saveHomeScreenIconPreference(choice)
    onHintChange?.(null)

    if (choice === 'no') return
    if (!autoInstallOnYes || installed) return

    const result = await requestPwaInstall()
    const hint = hintForResult(result)
    onHintChange?.(hint)
    if (result === 'installed' || result === 'already-installed') {
      setInstalled(true)
    }
  }

  const showIosSteps = hintMessage?.includes('Teilen') || (value === 'yes' && isIosDevice() && !installed)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-400/90 bg-slate-100/95 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900/80">
        <Image
          src="/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl shadow-md ring-2 ring-emerald-500/30"
          priority
        />
        <p className="text-xs leading-snug text-slate-600 dark:text-slate-400">
          LifeXP als App-Icon auf dem Homescreen – schneller Zugriff wie bei einer installierten App.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Icon auf dem Homescreen anlegen?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void applyChoice('yes')}
            className={choiceButtonClass(value === 'yes')}
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => void applyChoice('no')}
            className={choiceButtonClass(value === 'no')}
          >
            Nein
          </button>
        </div>
      </fieldset>

      {value === 'yes' && !installed && canShowNativeInstallPrompt() ? (
        <button
          type="button"
          onClick={() => void applyChoice('yes')}
          className="lifexp-pressable-3d rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 dark:border-emerald-500"
        >
          Jetzt installieren
        </button>
      ) : null}

      {showIosSteps ? (
        <div className="text-xs [&_ol]:text-xs">
          <IosInstallSteps />
        </div>
      ) : null}

      {hintMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs leading-relaxed text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100">
          {hintMessage}
        </p>
      ) : null}

      {installed ? (
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">✓ Als App installiert</p>
      ) : null}
    </div>
  )
}
