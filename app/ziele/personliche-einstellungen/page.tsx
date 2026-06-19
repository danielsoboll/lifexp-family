'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import RecoveryCodePanel from '../../../components/RecoveryCodePanel'
import PwaInstallPanel from '../../../components/PwaInstallPanel'
import ThemeToggle from '../../../components/ThemeToggle'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../../lib/appShell'
import { applyAppIcons } from '../../../lib/appIcon'
import {
  AVATAR_GENDER_LABELS,
  getAvatarImageMeta,
  getAvatarTierFromLevel,
  type AvatarGender,
} from '../../../lib/avatarLibrary'
import {
  getCachedAvatarDisplaySnapshot,
  saveAvatarDisplayCache,
} from '../../../lib/avatarDisplayCache'
import {
  fetchCurrentProfile,
  updateCurrentProfileAvatarGender,
  updateCurrentProfileAppInstalled,
  updateCurrentProfileRecCodeOk,
  type ProfileSettings,
} from '../../../lib/profile'
import { GOAL_LABELS } from '../../../lib/goals'
import {
  clearPwaInstallLater,
  isIosDevice,
  isStandaloneDisplayMode,
} from '../../../lib/pwaInstall'

const GENDER_LABELS: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  divers: 'Divers',
}

const AVATAR_GENDER_OPTIONS: { value: AvatarGender; label: string }[] = [
  { value: 'male', label: AVATAR_GENDER_LABELS.male },
  { value: 'female', label: AVATAR_GENDER_LABELS.female },
]

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-400/90 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100 px-4 py-3 dark:border-slate-600 dark:from-slate-800 dark:via-slate-900/90 dark:to-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

export default function PersonlicheEinstellungenPage() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarSaveError, setAvatarSaveError] = useState('')
  const [browserMode, setBrowserMode] = useState(false)
  const [installDoneSaving, setInstallDoneSaving] = useState(false)
  const [installDoneError, setInstallDoneError] = useState('')
  const [recCodeDoneSaving, setRecCodeDoneSaving] = useState(false)
  const [recCodeDoneError, setRecCodeDoneError] = useState('')

  useEffect(() => {
    setBrowserMode(!isStandaloneDisplayMode())
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { settings, error } = await fetchCurrentProfile()
      if (cancelled) return
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setProfile(settings)
      applyAppIcons(settings.avatarGender)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const genderLabel = profile ? (GENDER_LABELS[profile.gender] ?? profile.gender) : ''
  const goalLabel = profile ? GOAL_LABELS[profile.goalType] : ''

  const handleAvatarGenderChange = async (next: AvatarGender) => {
    if (!profile || profile.avatarGender === next) return
    setAvatarSaveError('')
    setAvatarSaving(true)
    const { error } = await updateCurrentProfileAvatarGender(next)
    setAvatarSaving(false)
    if (error) {
      setAvatarSaveError(error.message)
      return
    }
    const snap = getCachedAvatarDisplaySnapshot()
    const dailyXp = snap.dailyXp ?? 0
    const tier = getAvatarTierFromLevel(profile.level)
    setProfile({ ...profile, avatarGender: next })
    saveAvatarDisplayCache({
      src: getAvatarImageMeta(tier, dailyXp, next).src,
      avatarGender: next,
      level: profile.level,
      dailyXp,
    })
    applyAppIcons(next)
  }

  const handleInstallDone = async () => {
    if (!profile || profile.appInstalled || installDoneSaving) return
    setInstallDoneError('')
    setInstallDoneSaving(true)
    try {
      const { error } = await updateCurrentProfileAppInstalled(true)
      if (error) {
        setInstallDoneError(error.message)
        return
      }
      clearPwaInstallLater()
      setProfile((current) =>
        current ? { ...current, appInstalled: true, appLater: false } : current,
      )
    } finally {
      setInstallDoneSaving(false)
    }
  }

  const handleRecCodeDone = async () => {
    if (!profile || profile.recCodeOk || recCodeDoneSaving || !profile.recCode) return
    setRecCodeDoneError('')
    setRecCodeDoneSaving(true)
    try {
      const { error } = await updateCurrentProfileRecCodeOk(true)
      if (error) {
        setRecCodeDoneError(error.message)
        return
      }
      setProfile((current) => (current ? { ...current, recCodeOk: true } : current))
    } finally {
      setRecCodeDoneSaving(false)
    }
  }

  const showInstallSection = Boolean(profile && (browserMode || profile.appInstalled))
  const installSectionDone = Boolean(profile?.appInstalled)
  const installSectionClass = installSectionDone
    ? 'mt-2 flex flex-col gap-3 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-emerald-100/85 to-teal-50/90 px-4 py-4 ring-2 ring-emerald-400/35 dark:border-emerald-500 dark:from-emerald-950/55 dark:via-emerald-900/45 dark:to-teal-950/50 dark:ring-emerald-500/25'
    : 'mt-2 flex flex-col gap-3 rounded-2xl border-2 border-slate-400/90 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100 px-4 py-4 dark:border-slate-600 dark:from-slate-800 dark:via-slate-900/90 dark:to-slate-900'
  const recCodeSectionDone = Boolean(profile?.recCodeOk)
  const recCodeSectionClass = recCodeSectionDone
    ? installSectionClass
    : 'mt-2 flex flex-col gap-3 rounded-2xl border-2 border-slate-400/90 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100 px-4 py-4 dark:border-slate-600 dark:from-slate-800 dark:via-slate-900/90 dark:to-slate-900'

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/ziele" className={PILL_BACK_CLASS}>
            <span aria-hidden>←</span>
            Zurück zu Ziele
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Persönliche Einstellungen
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          dein Profil aus dem Onboarding – gespeichert in Supabase.
        </p>

        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}

        {!profile && !errorMessage ? (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Profil wird geladen …</p>
        ) : null}

        {profile ? (
          <div className="mt-6 flex flex-col gap-3">
            <ProfileField label="Benutzername" value={profile.username || '–'} />
            <ProfileField label="Alter" value={profile.age > 0 ? `${profile.age} Jahre` : '–'} />
            <ProfileField label="Geschlecht" value={genderLabel || '–'} />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Anzeige Avatar</legend>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={avatarSaving}
                    onClick={() => void handleAvatarGenderChange(option.value)}
                    className={`lifexp-pressable-3d rounded-2xl border-2 px-2 py-2.5 text-center text-xs font-bold leading-snug sm:text-sm disabled:opacity-60 ${
                      profile.avatarGender === option.value
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-slate-900 dark:border-emerald-400 dark:from-emerald-950/55 dark:to-teal-950/45 dark:text-slate-100'
                        : 'border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-stone-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {avatarSaving ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Wird gespeichert …</p>
              ) : null}
              {avatarSaveError ? (
                <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {avatarSaveError}
                </p>
              ) : null}
            </fieldset>
            <ProfileField
              label="Körpergröße"
              value={profile.heightCm > 0 ? `${profile.heightCm} cm` : '–'}
            />
            <ProfileField label="Gewicht" value={profile.weightKg > 0 ? `${profile.weightKg} kg` : '–'} />
            <ProfileField label="Hauptziel" value={goalLabel || '–'} />

            {showInstallSection ? (
              <section className={installSectionClass}>
                <h2
                  className={`text-sm font-semibold ${
                    installSectionDone
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {installSectionDone
                    ? '✓ LifeXP zum Home-Bildschirm hinzugefügt'
                    : 'LifeXP zum Home-Bildschirm zufügen'}
                </h2>
                {installSectionDone ? (
                  <p className="text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                    Erledigt — du startest LifeXP vom Home-Bildschirm.
                  </p>
                ) : null}
                <PwaInstallPanel
                  compact
                  avatarGender={profile.avatarGender}
                  showIosDoneButton={isIosDevice()}
                  iosInstallConfirmed={installSectionDone}
                  iosDoneSaving={installDoneSaving}
                  onIosDone={() => void handleInstallDone()}
                  onInstalled={() => {
                    setProfile((current) =>
                      current ? { ...current, appInstalled: true, appLater: false } : current,
                    )
                  }}
                />
                {installDoneError ? (
                  <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                    {installDoneError}
                  </p>
                ) : null}
              </section>
            ) : null}

            {profile.recCode ? (
              <section className={recCodeSectionClass}>
                <h2
                  className={`text-sm font-semibold ${
                    recCodeSectionDone
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {recCodeSectionDone
                    ? '✓ Recovery-Code gespeichert'
                    : 'Recovery-Code sichern'}
                </h2>
                {recCodeSectionDone ? (
                  <p className="text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                    Erledigt — du hast bestätigt, den Code gespeichert zu haben.
                  </p>
                ) : (
                  <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                    Bitte Screenshot machen und unten bestätigen, wenn du den Code gesichert hast.
                  </p>
                )}
                <RecoveryCodePanel
                  code={profile.recCode}
                  variant="settings"
                  recCodeOk={profile.recCodeOk}
                  hideDoneStatus
                  showDoneButton={!profile.recCodeOk}
                  doneSaving={recCodeDoneSaving}
                  onDone={() => void handleRecCodeDone()}
                />
                {recCodeDoneError ? (
                  <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                    {recCodeDoneError}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  )
}
