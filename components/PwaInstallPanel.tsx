'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'

import {
  canShowNativeInstallPrompt,
  getPwaInstallPlatform,
  isIpadDevice,
  isStandaloneDisplayMode,
  LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT,
  requestPwaInstall,
  type PwaInstallResult,
} from '../lib/pwaInstall'
import { getAppIconPath, applyAppIcons, resolveAppIconGender } from '../lib/appIcon'
import type { AvatarGender } from '../lib/avatarLibrary'

type PwaInstallPanelProps = {
  /** „Später“ / „Vielleicht später“ — nur Overlay. */
  showLaterButton?: boolean
  onLater?: () => void
  onInstalled?: () => void
  /** Kompakter Text für Onboarding-Einstellungen. */
  compact?: boolean
  /** Onboarding: Geschlecht vor Profil-Speicherung. */
  avatarGender?: AvatarGender
  /** iOS Einstellungen: „Erledigt!“ unter den Schritten. */
  showIosDoneButton?: boolean
  iosInstallConfirmed?: boolean
  onIosDone?: () => void
  iosDoneSaving?: boolean
}

const IOS_STEP_ICON_CLASS =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-sky-700 shadow-sm ring-1 ring-sky-200 dark:bg-sky-900/70 dark:text-sky-100 dark:ring-sky-600'

function IosSafariMoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.25" cy="12" r="1.15" />
      <circle cx="12" cy="12" r="1.15" />
      <circle cx="15.75" cy="12" r="1.15" />
    </svg>
  )
}

function IosSafariShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5v8.25" />
      <path d="M8.25 8.25 12 4.5l3.75 3.75" />
      <rect x="5.25" y="10.5" width="13.5" height="9" rx="1.75" />
    </svg>
  )
}

function IosSafariAddToHomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round">
      <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="2" />
      <path d="M12 8.25v7.5" />
      <path d="M8.25 12h7.5" />
    </svg>
  )
}

function IosInstallStep({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <li>
      <span className="flex items-center justify-between gap-3">
        <span>{text}</span>
        {icon ? <span className={IOS_STEP_ICON_CLASS}>{icon}</span> : null}
      </span>
    </li>
  )
}

function IphoneInstallSteps() {
  return (
    <ol className="list-decimal space-y-2 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
      <IosInstallStep text="Unten rechts auf die 3 Punkte tippen" icon={<IosSafariMoreIcon />} />
      <IosInstallStep text="Auf „Teilen“ tippen" icon={<IosSafariShareIcon />} />
      <IosInstallStep text="„Zum Home-Bildschirm“ auswählen" icon={<IosSafariAddToHomeIcon />} />
      <IosInstallStep text="„Hinzufügen“ tippen" />
    </ol>
  )
}

function IpadInstallSteps() {
  return (
    <ol className="list-decimal space-y-2 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
      <IosInstallStep text="Oben in Safari auf „Teilen“ tippen" icon={<IosSafariShareIcon />} />
      <IosInstallStep text="„Zum Home-Bildschirm“ auswählen" icon={<IosSafariAddToHomeIcon />} />
      <IosInstallStep text="„Hinzufügen“ tippen" />
    </ol>
  )
}

function AndroidInstallHint() {
  return (
    <p className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
      Öffne LifeXP Family in Chrome. Wenn der Button unten erscheint, tippe auf „LifeXP Family
      installieren“. Alternativ: Browser-Menü → „App installieren“ oder „Zum Startbildschirm
      hinzufügen“.
    </p>
  )
}

/** @deprecated Alias — iPhone-Schritte */
function IosInstallSteps() {
  return <IphoneInstallSteps />
}

export default function PwaInstallPanel({
  showLaterButton = false,
  onLater,
  onInstalled,
  compact = false,
  avatarGender,
  showIosDoneButton = false,
  iosInstallConfirmed = false,
  onIosDone,
  iosDoneSaving = false,
}: PwaInstallPanelProps) {
  const [canInstall, setCanInstall] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const iconSrc = getAppIconPath(resolveAppIconGender(avatarGender), 192)

  const platform = getPwaInstallPlatform()
  const iosInstallConfirmedVisual = iosInstallConfirmed

  useEffect(() => {
    const refresh = () => setCanInstall(canShowNativeInstallPrompt())
    refresh()
    window.addEventListener(LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT, refresh)
    return () => window.removeEventListener(LIFEXP_PWA_INSTALL_PROMPT_READY_EVENT, refresh)
  }, [])

  useEffect(() => {
    applyAppIcons(resolveAppIconGender(avatarGender))
  }, [avatarGender])

  const handleInstall = async () => {
    if (installing) return
    setInstalling(true)
    setHint(null)
    try {
      const result: PwaInstallResult = await requestPwaInstall()
      if (result === 'installed' || result === 'already-installed') {
        onInstalled?.()
        return
      }
      if (result === 'ios-manual') {
        setHint('Folge den Schritten unten in Safari.')
        return
      }
      if (result === 'dismissed') {
        setHint('Installation abgebrochen.')
        return
      }
      if (platform === 'android' && !canShowNativeInstallPrompt()) {
        setHint('Öffne LifeXP Family in Chrome und warte kurz — dann erscheint „Installieren“.')
      }
    } finally {
      setInstalling(false)
    }
  }

  if (isStandaloneDisplayMode() && !showIosDoneButton) {
    return (
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        ✓ LifeXP Family läuft bereits als App auf deinem Home-Bildschirm.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!compact ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-400/90 bg-slate-100/95 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900/80">
          <Image
            src={iconSrc}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-md ring-2 ring-emerald-500/30"
            priority
          />
          <p className="text-sm leading-snug text-slate-600 dark:text-slate-400">
            LifeXP Family auf dem Home-Bildschirm — schneller Zugriff wie bei einer installierten App.
          </p>
        </div>
      ) : null}

      {platform === 'iphone' ? (
        <div className={iosInstallConfirmedVisual ? 'opacity-80' : undefined}>
          <IphoneInstallSteps />
        </div>
      ) : null}

      {platform === 'ipad' ? (
        <div className={iosInstallConfirmedVisual ? 'opacity-80' : undefined}>
          <IpadInstallSteps />
        </div>
      ) : null}

      {platform === 'android' && !canInstall ? <AndroidInstallHint /> : null}

      {showIosDoneButton && (platform === 'iphone' || platform === 'ipad') ? (
        <button
          type="button"
          disabled={iosInstallConfirmed || iosDoneSaving}
          onClick={onIosDone}
          className={`lifexp-pressable-3d w-full rounded-2xl border-2 px-4 py-3 text-base font-bold disabled:cursor-default ${
            iosInstallConfirmed
              ? 'border-emerald-600 bg-gradient-to-b from-emerald-100 to-emerald-200/90 text-emerald-900 opacity-95 dark:border-emerald-500 dark:from-emerald-900/70 dark:to-emerald-950/80 dark:text-emerald-100'
              : 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500'
          }`}
        >
          {iosDoneSaving ? 'Wird gespeichert …' : 'Erledigt!'}
        </button>
      ) : null}

      {canInstall && platform === 'android' ? (
        <button
          type="button"
          disabled={installing}
          onClick={() => void handleInstall()}
          className="lifexp-pressable-3d w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 dark:border-emerald-500"
        >
          {installing ? 'Wird geöffnet …' : 'LifeXP Family installieren'}
        </button>
      ) : null}

      {hint ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs leading-relaxed text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100">
          {hint}
        </p>
      ) : null}

      {showLaterButton && onLater && !iosInstallConfirmed ? (
        <button
          type="button"
          onClick={onLater}
          className="lifexp-pressable-3d rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 px-4 py-2.5 text-sm font-bold text-stone-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100"
        >
          Später
        </button>
      ) : null}
    </div>
  )
}

export { IosInstallSteps, IphoneInstallSteps, IpadInstallSteps }
