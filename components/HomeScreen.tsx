'use client'

import Link from 'next/link'
import { useCallback } from 'react'

import AvatarCard from './AvatarCard'
import AvatarWasJetztTunThoughtBubble from './AvatarWasJetztTunThoughtBubble'
import DashboardButton from './DashboardButton'
import FlowHintArrow from './FlowHintArrow'
import TaskPlannerHomeButton from './TaskPlannerHomeButton'
import WasJetztTunHomeButton from './WasJetztTunHomeButton'
import ProgressBar from './ProgressBar'
import ThemeToggle from './ThemeToggle'
import { getProgressPercent, getXpRemainingToNextLevel } from '../lib/level'
import type { AvatarGender } from '../lib/avatarLibrary'
import { HOME_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PILL_BACK_CLASS } from '../lib/appShell'
import { useThoughtBubbleVisibility } from '../lib/useThoughtBubbleVisibility'
import { YESTERDAY_ENTRY_ELEMENT_ID } from '../lib/activeEventDate'
import LegalFooterNav from './LegalFooterNav'

/** Unterpunkte erledigt, Tages-Ziel-XP für den Bereich noch nicht erreicht. */
export type AreaButtonStatus =
  | 'done'
  | 'subdone'
  | 'attention'
  | 'pending'
  | 'highlight'
  | undefined

export type AreaStatuses = {
  bewegung?: AreaButtonStatus
  ernaehrung?: AreaButtonStatus
  wissen?: AreaButtonStatus
  meinTag?: AreaButtonStatus
  plus?: AreaButtonStatus
}

export type StreakPrompt = 'overview' | 'wissen' | null

export type HomeScreenProps = {
  level: number
  totalXp: number
  todayAvatarXp: number
  avatarGender: AvatarGender
  /** Startseite: erst nach Profil-Sync vom gepufferten Bild wechseln. */
  profileReady?: boolean
  /** Festes Avatar-Bild (Onboarding-Vorschau). */
  avatarPreviewSrc?: string
  avatarPreviewEpoch?: number
  streakPrompt: StreakPrompt
  areaStatuses: AreaStatuses
  /** Pulsierender Pfeil zum Aufgabenplaner (parallel zur gelben Mein-Tag-Markierung). */
  showTaskPlannerHint?: boolean
  /** „Was jetzt tun?“ nach Streak 1 freischalten; Denkblase erst nach Streak 2 (Wissen). Pfeil in Streak 3. */
  showWasJetztTun?: boolean
  /** Erst nach Home-Flow-Sync (Profil + Streak) — verhindert Denkblase mit veraltetem Streak-Stand. */
  thoughtBubbleReady?: boolean
  showWasJetztTunHint?: boolean
  /** Erster Tag + Mein Tag offen: Ziele oben hervorheben. */
  showZieleHint?: boolean
  celebrateAvatar?: boolean
  celebrateBurstKey?: number
  /** Hintergrund-Vorschau während Onboarding — keine Navigation. */
  interactive?: boolean
  /** Gestern-Modus: Tagesdaten von gestern bearbeiten (Avatar/Level = heute). */
  yesterdayView?: boolean
  /** Zwischen heute und Gestern-Ansicht wechseln (nur wenn `interactive`). */
  onDayViewToggle?: () => void
  /** Hinweis unter dem Gestern-Button (z. B. Tag 1 blockiert). */
  dayViewHintMessage?: string | null
  /** Pfeil auf „Daten für gestern eingeben“ (z. B. von Was jetzt tun). */
  showYesterdayEntryHint?: boolean
  /** Tipp auf Denkblase → Scroll zu „Was jetzt tun?“. */
  onWasJetztTunThoughtBubbleClick?: () => void
  /** Nach Denkblase-Klick: Button hervorheben (weiß, größer). */
  highlightWasJetztTunButton?: boolean
  /** Gestern-Button in der Vorschau anzeigen (ohne Aktion). */
  showDayViewToggle?: boolean
  /** Avatar-Rahmen (px); Intro-Vorschau größer als Startseite. */
  avatarFrameMaxPx?: number
}

function StreakHint({ label }: { label: string }) {
  return (
    <div className="lifexp-streak-hint mx-auto mb-2 flex w-fit flex-col items-center text-center">
      <p className="rounded-full border-2 border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-950 shadow-sm dark:border-yellow-700 dark:bg-yellow-950/35 dark:text-yellow-100">
        {label}
      </p>
      <span className="mt-0.5 text-2xl leading-none text-yellow-500 dark:text-yellow-300" aria-hidden>
        ↓
      </span>
    </div>
  )
}

export default function HomeScreen({
  level,
  totalXp,
  todayAvatarXp,
  avatarGender,
  profileReady = true,
  avatarPreviewSrc,
  avatarPreviewEpoch,
  streakPrompt,
  areaStatuses,
  showTaskPlannerHint = false,
  showWasJetztTun = false,
  thoughtBubbleReady = false,
  showWasJetztTunHint = false,
  showZieleHint = false,
  celebrateAvatar = false,
  celebrateBurstKey = 0,
  interactive = true,
  yesterdayView = false,
  onDayViewToggle,
  dayViewHintMessage = null,
  showYesterdayEntryHint = false,
  onWasJetztTunThoughtBubbleClick,
  highlightWasJetztTunButton = false,
  showDayViewToggle = false,
  avatarFrameMaxPx,
}: HomeScreenProps) {
  const progressPercent = getProgressPercent(totalXp)
  const xpRemaining = getXpRemainingToNextLevel(totalXp)
  const blockNav = !interactive
  const thoughtBubbleEligible =
    !avatarPreviewSrc &&
    thoughtBubbleReady &&
    showWasJetztTun &&
    streakPrompt === null &&
    !yesterdayView &&
    !celebrateAvatar
  const { visible: showThoughtBubble, dismissThoughtBubble } = useThoughtBubbleVisibility({
    eligible: thoughtBubbleEligible,
    totalXp,
  })

  const handleThoughtBubbleActivate = useCallback(() => {
    dismissThoughtBubble()
    onWasJetztTunThoughtBubbleClick?.()
  }, [dismissThoughtBubble, onWasJetztTunThoughtBubbleClick])

  const showZieleHighlight = showZieleHint

  const statsBlock = (
    <>
      {!yesterdayView ? (
        <p className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold tracking-[0.12em] text-yellow-600/90 dark:text-yellow-300/85">
          Übersicht
        </p>
      ) : null}
      <h2 id="stats-heading" className="sr-only">
        Stand
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Level
          </p>
          <p className="text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-slate-100">{level}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Gesamt XP
          </p>
          <p className="text-xl font-bold leading-tight tabular-nums text-emerald-700 dark:text-emerald-400">{totalXp}</p>
        </div>
      </div>
      <div className="mt-2">
        <ProgressBar progress={progressPercent} compact />
      </div>
      <p className="mt-1.5 text-center text-xs leading-tight text-slate-600 dark:text-slate-400">
        Noch <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{xpRemaining}</span> XP bis
        zum nächsten Level
      </p>
    </>
  )

  const statsClassName = `lifexp-pressable-3d relative mt-2 block rounded-2xl border-2 px-3 py-2.5 ring-1 backdrop-blur-sm ${
    !yesterdayView && streakPrompt === 'overview'
      ? 'border-yellow-300 bg-yellow-50/90 ring-yellow-200/70 dark:border-yellow-700 dark:bg-yellow-950/35 dark:ring-yellow-900/45'
      : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 ring-stone-500/20 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:ring-stone-600/35'
  }`

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${HOME_PAGE_INSET_CLASS}`}>
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-stone-50 sm:text-4xl dark:text-slate-100">
                <span aria-hidden className="mr-1.5">
                  🔥
                </span>
                LifeXP
              </h1>
              <p className="mt-1 text-sm text-white/82 dark:text-slate-400">
                Level, Avatar und Bereiche – dein Fortschritt auf einen Blick
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <ThemeToggle />
              <div className="relative flex flex-col items-center">
                {!yesterdayView && showZieleHighlight ? (
                  <FlowHintArrow className="absolute -top-6 right-0 w-auto" />
                ) : null}
                {interactive ? (
                  <Link
                    href="/ziele"
                    className={`${PILL_BACK_CLASS} px-3 py-2 ${
                      !yesterdayView && showZieleHighlight
                        ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-1 ring-yellow-200/60 hover:border-yellow-400 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'
                        : ''
                    }`}
                  >
                    Ziele
                  </Link>
                ) : (
                  <span
                    className={`${PILL_BACK_CLASS} pointer-events-none px-3 py-2 opacity-70`}
                    aria-hidden
                  >
                    Ziele
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <AvatarCard
          level={level}
          dailyXp={todayAvatarXp}
          avatarGender={avatarGender}
          profileReady={profileReady}
          avatarPreviewSrc={avatarPreviewSrc}
          avatarPreviewEpoch={avatarPreviewEpoch}
          celebrate={celebrateAvatar}
          celebrateBurstKey={celebrateBurstKey}
          frameMaxPx={avatarFrameMaxPx}
          frameOverlay={
            showThoughtBubble ? (
              <AvatarWasJetztTunThoughtBubble
                onActivate={handleThoughtBubbleActivate}
              />
            ) : null
          }
        />

        {!yesterdayView && streakPrompt === 'overview' ? <StreakHint label="Streak 1" /> : null}

        {interactive ? (
          <Link href="/xp" className={statsClassName} aria-labelledby="stats-heading">
            {statsBlock}
          </Link>
        ) : (
          <div className={statsClassName} aria-labelledby="stats-heading">
            {statsBlock}
          </div>
        )}

        <section className="mt-8" aria-labelledby="areas-heading">
          <h2
            id="areas-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            Bereiche
          </h2>
          <div className={`flex flex-col gap-3 ${blockNav ? 'pointer-events-none' : ''}`}>
            <DashboardButton
              href="/bewegung"
              emoji="🏃"
              title="Training"
              subtitle="Arbeit, Training, Schritte"
              status={areaStatuses.bewegung}
            />
            <DashboardButton
              href="/ernaehrung"
              emoji="🥗"
              title="Ernährung"
              subtitle="Mahlzeiten, Protein, Kalorien"
              status={areaStatuses.ernaehrung}
            />
            <div>
              {!yesterdayView && streakPrompt === 'wissen' ? (
                <StreakHint label="Streak 2" />
              ) : null}
              <DashboardButton
                href="/wissen"
                emoji="📚"
                title="Wissen"
                subtitle={yesterdayView ? '3 kurze Fragen für gestern' : '3 kurze Fragen für heute'}
                status={areaStatuses.wissen}
              />
            </div>
            <DashboardButton
              href="/mein-tag"
              emoji="🌤️"
              title="Mein Tag"
              subtitle="Schlaf, Stimmung, Fokus"
              status={areaStatuses.meinTag}
            />
            <div className="flex flex-col">
              <DashboardButton
                href="/plus"
                emoji="➕"
                title="Plus"
                subtitle="Streak und deine Aktionen"
                status={areaStatuses.plus}
              />
              <TaskPlannerHomeButton
                plusStatus={areaStatuses.plus}
                interactive={interactive}
                inactive={yesterdayView}
                showHint={!yesterdayView && showTaskPlannerHint}
              />
              {!yesterdayView ? (
                <WasJetztTunHomeButton
                  interactive={interactive}
                  inactive={!showWasJetztTun}
                  locked={!showWasJetztTun}
                  showHint={showWasJetztTunHint}
                  emphasized={highlightWasJetztTunButton}
                />
              ) : showWasJetztTun ? (
                <WasJetztTunHomeButton interactive={interactive} inactive showHint={false} />
              ) : null}
            </div>
          </div>
        </section>

        {interactive && onDayViewToggle ? (
          <div
            id={YESTERDAY_ENTRY_ELEMENT_ID}
            className="mt-6 flex flex-col items-center gap-2 pb-1 scroll-mt-24"
          >
            {showYesterdayEntryHint ? <FlowHintArrow /> : null}
            <button
              type="button"
              onClick={onDayViewToggle}
              className="lifexp-pressable-3d rounded-full border border-emerald-400/80 bg-emerald-50 px-4 py-2 text-xs font-black tracking-wide text-emerald-900 hover:border-emerald-500 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:border-emerald-600"
            >
              {yesterdayView ? 'Wechseln zu heute' : 'Daten für gestern eingeben'}
            </button>
            {dayViewHintMessage ? (
              <p
                role="alert"
                className="max-w-sm px-2 text-center text-sm font-medium leading-snug text-amber-900 dark:text-amber-200"
              >
                {dayViewHintMessage}
              </p>
            ) : null}
          </div>
        ) : showDayViewToggle ? (
          <div className={`mt-6 flex justify-center pb-1 ${blockNav ? 'pointer-events-none' : ''}`}>
            <span
              className="lifexp-pressable-3d inline-block rounded-full border border-emerald-400/80 bg-emerald-50 px-4 py-2 text-xs font-black tracking-wide text-emerald-900 opacity-90 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-100"
              aria-hidden
            >
              Daten für gestern eingeben
            </span>
          </div>
        ) : null}

        {interactive ? <LegalFooterNav className="mt-8 pb-1" /> : null}

        <div
          className="min-h-[max(3.5rem,env(safe-area-inset-bottom))] shrink-0"
          aria-hidden
        />
      </div>
    </main>
  )
}
