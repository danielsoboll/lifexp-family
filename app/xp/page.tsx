'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import DailyXpProgressCard from '../../components/DailyXpProgressCard'
import ThemeToggle from '../../components/ThemeToggle'
import type { AvatarGender } from '../../lib/avatarLibrary'
import { loadCachedAvatarGender } from '../../lib/avatarDisplayCache'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../../lib/appShell'
import { syncDailyScoresBackfillForStreak } from '../../lib/dailyScores'
import {
  isWasJetztTunBubblePending,
  markWasJetztTunBubblePendingAfterLogin,
  WJT_BUBBLE_QUERY_PARAM,
} from '../../lib/homeWasJetztTunBubble'
import { fetchCurrentProfile, incrementProfileStreakDayAfterLogin } from '../../lib/profile'
import { LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../../lib/user'
import { clampLigaXp, getLigaTierTitle, LIGA_XP_MAX } from '../../lib/liga'
import { grantLeagueXpOnce, LEAGUE_XP_SOURCE, LOGIN_LEAGUE_XP } from '../../lib/leagueXp'
import { NUTRITION_COMPLETION_SOURCE } from '../../lib/nutrition'
import { useLeagueStatus } from '../../lib/useLeagueStatus'
import {
  isYesterdayViewActive,
  LIFEXP_VIEW_DATE_CHANGED_EVENT,
} from '../../lib/activeEventDate'
import {
  XP_LIMITS,
  xpBarMaxForCategory,
  xpBoostModeForCategory,
  xpBoostThresholdForCategory,
  xpBoostUnlockedForCategory,
  xpTargetForCategory,
} from '../../lib/xpDisplay'
import { xpHistoryPath } from '../../lib/xpHistory'
import {
  emptyTodayXp,
  fetchTodayHasEventForCategorySource,
  fetchTodayXpByCategory,
  recordXpEvent,
  type TodayXpByCategory,
} from '../../lib/xpEvents'

const LOGIN_XP = 2
/** Nach „Bin dabei!“ kurz „Heute dabei!“ zeigen, dann Startseite. */
const RETURN_HOME_AFTER_LOGIN_MS = 1500

export default function XpPage() {
  const router = useRouter()
  const returnHomeTimerRef = useRef<number | null>(null)
  const [xp, setXp] = useState<TodayXpByCategory>(() => emptyTodayXp())
  const { ligaXp, ligaTierId, reload: reloadLeague } = useLeagueStatus()
  const [claimedLoginXp, setClaimedLoginXp] = useState(false)
  const [isClaimingLoginXp, setIsClaimingLoginXp] = useState(false)
  const [challengeDay, setChallengeDay] = useState(0)
  const [avatarGender, setAvatarGender] = useState<AvatarGender>(loadCachedAvatarGender)
  const [errorMessage, setErrorMessage] = useState('')
  const [viewDateEpoch, setViewDateEpoch] = useState(0)
  const [homeHref, setHomeHref] = useState('/')
  const [nutritionDayComplete, setNutritionDayComplete] = useState(false)

  useEffect(() => {
    const bump = () => setViewDateEpoch((n) => n + 1)
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
      window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, bump)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (returnHomeTimerRef.current !== null) {
        window.clearTimeout(returnHomeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isWasJetztTunBubblePending()) {
      setHomeHref(`/?${WJT_BUBBLE_QUERY_PARAM}=1`)
    }
  }, [])

  const yesterdayView = typeof window !== 'undefined' && isYesterdayViewActive()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [
        { xp, error },
        { hasEvent: claimedToday, error: loginEventError },
        { settings: profile, error: profileError },
        { hasEvent: nutritionCompleted, error: nutritionCompleteError },
      ] = await Promise.all([
        fetchTodayXpByCategory(),
        fetchTodayHasEventForCategorySource({ category: 'plus', source: 'login' }),
        fetchCurrentProfile(),
        fetchTodayHasEventForCategorySource({
          category: 'ernaehrung',
          source: NUTRITION_COMPLETION_SOURCE,
        }),
      ])
      if (cancelled) return
      setChallengeDay(profileError ? 0 : profile.challengeDay)
      if (!profileError) {
        setAvatarGender(profile.avatarGender)
      }
      if (error) {
        setErrorMessage(error.message)
        return
      }
      if (loginEventError) {
        setErrorMessage(loginEventError.message)
        return
      }
      if (nutritionCompleteError) {
        setErrorMessage(nutritionCompleteError.message)
        return
      }
      setErrorMessage('')
      setXp(xp)
      setClaimedLoginXp(claimedToday)
      setNutritionDayComplete(nutritionCompleted)
    })()
    return () => {
      cancelled = true
    }
  }, [viewDateEpoch])

  const limits = XP_LIMITS
  const ligaProgress = clampLigaXp(ligaXp)
  const currentLigaTitle = getLigaTierTitle(ligaTierId, avatarGender)

  const claimLoginXp = async () => {
    if (claimedLoginXp || isClaimingLoginXp) return
    setIsClaimingLoginXp(true)
    const { error } = await recordXpEvent({
      category: 'plus',
      source: 'login',
      xp: LOGIN_XP,
      metadata: { action: 'bin_dabei' },
    })
    if (error) {
      setErrorMessage(error.message)
      setIsClaimingLoginXp(false)
      return
    }
    if (!isYesterdayViewActive()) {
      markWasJetztTunBubblePendingAfterLogin()
      setHomeHref(`/?${WJT_BUBBLE_QUERY_PARAM}=1`)
    }
    const viewingYesterday = isYesterdayViewActive()
    let challengeError: Error | null = null
    if (!viewingYesterday) {
      const { challengeDay: nextChallengeDay, error: chErr } =
        await incrementProfileStreakDayAfterLogin()
      challengeError = chErr
      if (!challengeError) {
        setChallengeDay(nextChallengeDay)
      }
      if (!challengeError && nextChallengeDay > 0) {
        const { error: dailyScoreError } = await syncDailyScoresBackfillForStreak()
        if (dailyScoreError) {
          challengeError = dailyScoreError
        }
      }
    }
    const { error: leagueError } = await grantLeagueXpOnce({
      source: LEAGUE_XP_SOURCE.login,
      amount: LOGIN_LEAGUE_XP,
      scope: 'day',
    })
    setXp((current) => ({ ...current, plus: current.plus + LOGIN_XP }))
    await reloadLeague()
    setClaimedLoginXp(true)
    setErrorMessage(leagueError?.message ?? challengeError?.message ?? '')
    setIsClaimingLoginXp(false)

    if (!viewingYesterday) {
      const target = `/?${WJT_BUBBLE_QUERY_PARAM}=1`
      if (returnHomeTimerRef.current !== null) {
        window.clearTimeout(returnHomeTimerRef.current)
      }
      returnHomeTimerRef.current = window.setTimeout(() => {
        returnHomeTimerRef.current = null
        router.push(target)
      }, RETURN_HOME_AFTER_LOGIN_MS)
    }
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex h-dvh max-h-dvh w-full max-w-md flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(3.5rem,calc(2.75rem+env(safe-area-inset-bottom)))]`}>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <Link href={homeHref} className={`${PILL_BACK_CLASS} mb-0 px-3 py-2 text-sm`}>
            <span aria-hidden>←</span>
            Zurück
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-1.5 shrink-0">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {yesterdayView ? 'XP-Übersicht (Gestern)' : 'XP-Übersicht heute'}
          </h1>
          {yesterdayView ? (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Level, Gesamt-XP und Liga wie heute — Balken für gestern.
            </p>
          ) : null}
        </header>

        <Link
          href="/xp/liga"
          className="lifexp-pressable-3d group mb-1.5 flex min-h-[4.5rem] shrink-0 items-center gap-3 rounded-2xl border-2 border-blue-700/50 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-4 py-3.5 ring-2 ring-blue-400/35 hover:from-blue-600 hover:via-blue-500 hover:to-sky-400 dark:border-blue-500/60 dark:from-blue-800 dark:via-blue-700 dark:to-sky-600 dark:ring-blue-400/25"
          aria-label={`Liga: ${currentLigaTitle}, ${ligaProgress} von ${LIGA_XP_MAX} Liga-XP`}
        >
          <span className="text-3xl leading-none drop-shadow-sm" aria-hidden>
            🌱
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/95">Liga</p>
            <p className="mt-0.5 text-base font-bold leading-tight text-white">{currentLigaTitle}</p>
            <p className="text-[10px] font-medium text-blue-100/85">Starter · Tippe für die Liga-Leiter</p>
          </div>
          <div className="w-[5rem] shrink-0">
            <p className="mb-1 text-right text-[10px] font-bold tabular-nums text-white">
              {ligaProgress}/{LIGA_XP_MAX}
            </p>
            <div
              className="h-2 overflow-hidden rounded-full bg-blue-950/35 shadow-inner"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-200 to-white"
                style={{ width: `${(ligaProgress / LIGA_XP_MAX) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[9px] font-semibold uppercase tracking-wide text-blue-100/90">
              Liga-XP
            </p>
          </div>
          <span
            className="shrink-0 text-lg font-bold text-white/90 transition group-hover:translate-x-0.5"
            aria-hidden
          >
            →
          </span>
        </Link>

        {!yesterdayView ? (
        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2">
          <section className={`flex min-h-[3.5rem] flex-col justify-center rounded-xl px-3 py-2.5 ${CARD_SURFACE_CLASS}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Challenge Tag
            </p>
            <p className="mt-0.5 text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-slate-100">
              {challengeDay}
            </p>
            {errorMessage ? (
              <p className="mt-1 text-xs text-red-700 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </section>

          <div className="relative">
            {!claimedLoginXp ? (
              <span
                className="lifexp-streak-hint pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 text-xl leading-none text-yellow-500 drop-shadow-sm dark:text-yellow-300"
                aria-hidden
              >
                ↓
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void claimLoginXp()}
              disabled={claimedLoginXp || isClaimingLoginXp}
              className="lifexp-pressable-3d flex min-h-[3.5rem] w-full flex-col justify-center rounded-xl border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/75 px-3 py-2.5 text-left ring-1 ring-yellow-400/25 hover:border-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 disabled:cursor-default disabled:border-emerald-300 disabled:from-emerald-50 disabled:via-emerald-100/90 disabled:to-teal-200/70 disabled:opacity-90 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/50 dark:ring-yellow-900/45 dark:disabled:border-emerald-700 dark:disabled:from-emerald-950/45 dark:disabled:via-emerald-950/35 dark:disabled:to-teal-950/40"
            >
              <span className="block text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
                {claimedLoginXp ? 'Heute dabei!' : isClaimingLoginXp ? 'Speichern...' : 'Bin dabei!'}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                2 Plus-XP · 2 Liga-XP
              </span>
            </button>
          </div>
        </div>
        ) : null}

        <div className="grid gap-1.5">
          <DailyXpProgressCard
            compact
            href={xpHistoryPath('bewegung')}
            label="Trainings-XP"
            value={xp.bewegung}
            icon="🏃"
            max={limits.bewegung}
            target={xpTargetForCategory('bewegung', limits.bewegung)}
            boostMode={xpBoostModeForCategory('bewegung')}
            barMax={xpBarMaxForCategory('bewegung')}
            boostThreshold={xpBoostThresholdForCategory('bewegung')}
          />
          <DailyXpProgressCard
            compact
            href={xpHistoryPath('ernaehrung')}
            label="Ernährungs-XP"
            value={xp.ernaehrung}
            icon="🥗"
            max={limits.ernaehrung}
            target={xpTargetForCategory('ernaehrung', limits.ernaehrung)}
            boostMode={xpBoostModeForCategory('ernaehrung')}
            barMax={xpBarMaxForCategory('ernaehrung')}
            boostThreshold={xpBoostThresholdForCategory('ernaehrung')}
            boostUnlocked={xpBoostUnlockedForCategory('ernaehrung', { nutritionDayComplete })}
          />
          <DailyXpProgressCard
            compact
            href={xpHistoryPath('wissen')}
            label="Wissens-XP"
            value={xp.wissen}
            icon="📚"
            max={limits.wissen}
            target={xpTargetForCategory('wissen', limits.wissen)}
          />
          <DailyXpProgressCard
            compact
            href={xpHistoryPath('mein_tag')}
            label="Mein Tag-XP"
            value={xp.meinTag}
            icon="🌤️"
            max={limits.mein_tag}
            target={xpTargetForCategory('mein_tag', limits.mein_tag)}
          />
          <DailyXpProgressCard
            compact
            href={xpHistoryPath('plus')}
            label="Plus-XP"
            value={xp.plus}
            icon="➕"
            max={limits.plus}
            target={xpTargetForCategory('plus', limits.plus)}
          />
        </div>
      </div>
    </main>
  )
}
