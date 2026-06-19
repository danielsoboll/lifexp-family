'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import HomeScreen, { type AreaStatuses, type StreakPrompt } from './HomeScreen'
import { confirmHomeCelebrationPlayed, readLastHomeDailyXp, readLastHomeTotalXp, shouldCelebrateOnHomeLoad } from '../lib/homeCelebration'
import {
  getDailyKnowledgeQuestions,
  getKnowledgeAnswerResults,
  isDailyKnowledgeComplete,
} from '../lib/knowledgeRound'
import {
  getAvatarImageMeta,
  getAvatarTierFromLevel,
  type AvatarGender,
} from '../lib/avatarLibrary'
import {
  getCachedAvatarDisplaySnapshot,
  saveAvatarDisplayCache,
  warmAvatarDisplayCache,
} from '../lib/avatarDisplayCache'
import { fetchCurrentProfile } from '../lib/profile'
import { fetchKnowledgeQuestions } from '../lib/supabase'
import {
  MEAL_OPTIONS,
  mealTypesWithEntries,
  fetchTodayMealEntries,
  type StandardMealType,
} from '../lib/nutrition'
import {
  isYesterdayViewActive,
  LIFEXP_VIEW_DATE_CHANGED_EVENT,
  setTodayView,
  setYesterdayView,
  stripYesterdayEntryFocusFromUrl,
  YESTERDAY_ENTRY_ELEMENT_ID,
  YESTERDAY_ENTRY_FOCUS_PARAM,
} from '../lib/activeEventDate'
import {
  fetchCetTodayDailyTotalXp,
  fetchTodayHasEventForCategorySource,
  fetchTodayQuizAnswerResults,
  fetchTodayXpByCategory,
  syncProfileXpFromEvents,
} from '../lib/xpEvents'
import { fetchPlannerTasks, plannerTodayDate, plannerYesterdayDate } from '../lib/tasks'
import { LIFEXP_ACTIVE_USER_CHANGED_EVENT } from '../lib/user'
import {
  computeHomeFlowState,
  computeYesterdayHomeFlowState,
  enrichHomeFlowWithZieleHint,
} from '../lib/homeFlow'
import { syncDailyScoresBackfillForStreak, syncYesterdayDailyScore } from '../lib/dailyScores'
import { reconcileProfileStreakDaysIfBehind } from '../lib/streakDays'
import { slowScrollToElement } from '../lib/slowScroll'
import { WAS_JETZT_TUN_HOME_ELEMENT_ID } from './WasJetztTunHomeButton'

const CELEBRATE_MS = 2000
const DAY1_YESTERDAY_HINT_MS = 2000

export const DAY1_YESTERDAY_BLOCKED_MESSAGE =
  'Tag 1 deiner Challenge - diese Funktion ist ab morgen verfügbar'

function stripCelebrateQueryFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('celebrate') !== '1') return false
  params.delete('celebrate')
  const q = params.toString()
  const path = window.location.pathname
  const next = q ? `${path}?${q}` : path
  window.history.replaceState(null, '', `${next}${window.location.hash}`)
  return true
}

function readHomeDisplayBootstrap() {
  const snap = getCachedAvatarDisplaySnapshot()
  const sessionTotalXp = readLastHomeTotalXp()
  const sessionDailyXp = readLastHomeDailyXp()
  const totalXp = sessionTotalXp ?? snap.totalXp ?? 0
  const todayAvatarXp = sessionDailyXp ?? snap.dailyXp ?? 0
  const hasCachedDisplay =
    sessionTotalXp !== null || sessionDailyXp !== null || snap.src !== null
  return {
    avatarGender: snap.avatarGender,
    level: snap.level ?? 1,
    totalXp,
    todayAvatarXp,
    hasCachedDisplay,
  }
}

export default function HomeLive() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const boot = readHomeDisplayBootstrap()
  const [totalXp, setTotalXp] = useState(boot.totalXp)
  const [level, setLevel] = useState(boot.level)
  const [avatarGender, setAvatarGender] = useState<AvatarGender>(boot.avatarGender)
  const [todayAvatarXp, setTodayAvatarXp] = useState(boot.todayAvatarXp)
  const [profileReady, setProfileReady] = useState(boot.hasCachedDisplay)
  const [homeFlowReady, setHomeFlowReady] = useState(false)
  const [areaStatuses, setAreaStatuses] = useState<AreaStatuses>({})
  const [showTaskPlannerHint, setShowTaskPlannerHint] = useState(false)
  const [showWasJetztTun, setShowWasJetztTun] = useState(false)
  const [showWasJetztTunHint, setShowWasJetztTunHint] = useState(false)
  const [showZieleHint, setShowZieleHint] = useState(false)
  const [streakPrompt, setStreakPrompt] = useState<StreakPrompt>(null)
  const [celebrateAvatar, setCelebrateAvatar] = useState(false)
  const [celebrateBurstKey, setCelebrateBurstKey] = useState(0)
  const [viewEpoch, setViewEpoch] = useState(0)
  const [challengeDay, setChallengeDay] = useState(0)
  const [dayViewHintMessage, setDayViewHintMessage] = useState<string | null>(null)
  const [showYesterdayEntryHint, setShowYesterdayEntryHint] = useState(false)
  const celebrateRafRef = useRef(0)
  const celebrateEndRef = useRef<number | null>(null)
  const dayViewHintTimerRef = useRef<number | null>(null)
  const wasJetztTunHighlightTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const [highlightWasJetztTunButton, setHighlightWasJetztTunButton] = useState(false)

  const showDayViewHint = useCallback((message: string) => {
    if (typeof window === 'undefined') return
    if (dayViewHintTimerRef.current !== null) {
      window.clearTimeout(dayViewHintTimerRef.current)
      dayViewHintTimerRef.current = null
    }
    setDayViewHintMessage(message)
    dayViewHintTimerRef.current = window.setTimeout(() => {
      setDayViewHintMessage(null)
      dayViewHintTimerRef.current = null
    }, DAY1_YESTERDAY_HINT_MS)
  }, [])

  useEffect(() => {
    const bump = () => setViewEpoch((n) => n + 1)
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
    return () => window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, bump)
  }, [])

  useEffect(() => {
    warmAvatarDisplayCache()
  }, [])

  useEffect(() => {
    if (searchParams.get('focus') !== YESTERDAY_ENTRY_FOCUS_PARAM) {
      setShowYesterdayEntryHint(false)
      return
    }

    setShowYesterdayEntryHint(true)

    const scrollToYesterdayEntry = () => {
      const target = document.getElementById(YESTERDAY_ENTRY_ELEMENT_ID)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToYesterdayEntry)
    })

    stripYesterdayEntryFocusFromUrl()

    return () => window.cancelAnimationFrame(frame)
  }, [searchParams, profileReady, viewEpoch])

  const handleWasJetztTunThoughtBubbleClick = useCallback(() => {
    if (wasJetztTunHighlightTimerRef.current !== null) {
      window.clearTimeout(wasJetztTunHighlightTimerRef.current)
      wasJetztTunHighlightTimerRef.current = null
    }
    setHighlightWasJetztTunButton(false)

    const target = document.getElementById(WAS_JETZT_TUN_HOME_ELEMENT_ID)
    if (target) {
      slowScrollToElement(target, { durationMs: 2000, viewportAnchor: 0.42 })
    }

    wasJetztTunHighlightTimerRef.current = window.setTimeout(() => {
      wasJetztTunHighlightTimerRef.current = null
      if (mountedRef.current) {
        setHighlightWasJetztTunButton(true)
      }
    }, 2000)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const clearCelebrateTimers = () => {
      cancelAnimationFrame(celebrateRafRef.current)
      celebrateRafRef.current = 0
      if (celebrateEndRef.current !== null) {
        window.clearTimeout(celebrateEndRef.current)
        celebrateEndRef.current = null
      }
    }

    const playCelebration = () => {
      clearCelebrateTimers()
      setCelebrateBurstKey((k) => k + 1)
      celebrateRafRef.current = requestAnimationFrame(() => {
        if (!mountedRef.current) return
        confirmHomeCelebrationPlayed()
        setCelebrateAvatar(true)
        celebrateEndRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            setCelebrateAvatar(false)
          }
          celebrateEndRef.current = null
        }, CELEBRATE_MS)
      })
    }

    const refreshTotal = async () => {
      const viewingYesterday = typeof window !== 'undefined' && isYesterdayViewActive()

      await syncProfileXpFromEvents()
      await syncDailyScoresBackfillForStreak()
      await reconcileProfileStreakDaysIfBehind()
      const plannerDate = viewingYesterday ? plannerYesterdayDate() : plannerTodayDate()

      const [
        { settings: profile, error: profileError },
        { total: todayTotal, error: todayTotalError },
        { xp: todayXp, error: todayXpError },
        { hasEvent: hasLoginEvent, error: loginEventError },
        { rows: knowledgeRows, error: knowledgeError },
        { results: quizResults, error: quizError },
        sleepEvent,
        sunAirEvent,
        wellbeingEvent,
        arbeitEvent,
        trainingEvent,
        schritteEvent,
        motivationEvent,
        { entries: mealEntries, error: mealEntriesError },
        { tasks: todayPlannerTasks, error: plannerTasksError },
      ] = await Promise.all([
        fetchCurrentProfile(),
        fetchCetTodayDailyTotalXp(),
        fetchTodayXpByCategory(),
        fetchTodayHasEventForCategorySource({ category: 'plus', source: 'login' }),
        fetchKnowledgeQuestions(20),
        fetchTodayQuizAnswerResults(),
        fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'sleep' }),
        fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'sun_air' }),
        fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'wellbeing' }),
        fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'arbeit' }),
        fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'training' }),
        fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'schritte' }),
        fetchTodayHasEventForCategorySource({ category: 'plus', source: 'motivation' }),
        fetchTodayMealEntries(),
        fetchPlannerTasks(plannerDate),
      ])
      if (!mountedRef.current) return

      const fromUrl = stripCelebrateQueryFromUrl()
      let currentTotalXp = 0
      let currentDailyXp = 0

      if (!profileError) {
        currentTotalXp = profile.totalXp
        setTotalXp(currentTotalXp)
        setLevel(profile.level)
        setAvatarGender(profile.avatarGender)
        setChallengeDay(profile.challengeDay)
        if (profile.challengeDay === 1 && viewingYesterday) {
          setTodayView()
          showDayViewHint(DAY1_YESTERDAY_BLOCKED_MESSAGE)
        }
      }
      if (!todayTotalError) {
        currentDailyXp = todayTotal
        setTodayAvatarXp(todayTotal)
      }
      if (!profileError && !todayTotalError) {
        const tier = getAvatarTierFromLevel(profile.level)
        saveAvatarDisplayCache({
          src: getAvatarImageMeta(tier, todayTotal, profile.avatarGender).src,
          avatarGender: profile.avatarGender,
          dailyXp: todayTotal,
          level: profile.level,
          totalXp: currentTotalXp,
        })
      }
      if (mountedRef.current) {
        setProfileReady(true)
      }
      if (!todayXpError && !loginEventError && !knowledgeError && !quizError) {
        getDailyKnowledgeQuestions(knowledgeRows)
        const localQuizResults = getKnowledgeAnswerResults()
        const allKnowledgeAnswered = isDailyKnowledgeComplete(quizResults, localQuizResults)
        const meinTagFilled =
          sleepEvent.hasEvent && sunAirEvent.hasEvent && wellbeingEvent.hasEvent
        const bewegungSubFilled =
          arbeitEvent.hasEvent && trainingEvent.hasEvent && schritteEvent.hasEvent
        const mealsDone = mealEntriesError ? new Set<StandardMealType>() : mealTypesWithEntries(mealEntries)
        const nutritionSubFilled = MEAL_OPTIONS.every((meal) => mealsDone.has(meal.type))
        const plusSubFilled = motivationEvent.hasEvent
        const flowInput = {
          hasLoginEvent,
          allKnowledgeAnswered,
          meinTagFilled,
          bewegungSubFilled,
          nutritionSubFilled,
          plusSubFilled,
          todayXp,
        }
        if (viewingYesterday) {
          const yesterdayFlow = computeYesterdayHomeFlowState(flowInput)
          setStreakPrompt(null)
          setShowTaskPlannerHint(false)
          setShowZieleHint(false)
          setAreaStatuses(yesterdayFlow.areaStatuses)
          setShowWasJetztTun(false)
          setShowWasJetztTunHint(false)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('lifexp-show-ziele-hint')
          }
        } else {
          const flow = computeHomeFlowState(flowInput)
          const flowWithZiele = await enrichHomeFlowWithZieleHint(flow)

          setStreakPrompt(flowWithZiele.streakPrompt)
          setShowTaskPlannerHint(flowWithZiele.showTaskPlannerHint)
          setShowZieleHint(flowWithZiele.showZieleHint)
          setAreaStatuses(flowWithZiele.areaStatuses)
          setShowWasJetztTunHint(flowWithZiele.showTaskPlannerHint)
        }
      }

      const loginReady = !viewingYesterday && !loginEventError && hasLoginEvent
      if (!viewingYesterday) {
        setShowWasJetztTun(loginReady)
      }

      const shouldCelebrate =
        !viewingYesterday &&
        (fromUrl ||
          (!profileError && !todayTotalError && shouldCelebrateOnHomeLoad(currentTotalXp, currentDailyXp)))
      if (shouldCelebrate) {
        playCelebration()
      }

      if (mountedRef.current && !viewingYesterday) {
        setHomeFlowReady(true)
      }
    }

    const onRevisit = () => {
      void refreshTotal()
    }

    onRevisit()

    window.addEventListener('focus', onRevisit)
    window.addEventListener('pageshow', onRevisit)
    window.addEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onRevisit)
    document.addEventListener('visibilitychange', onVisibility)

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        onRevisit()
      }
    }

    return () => {
      mountedRef.current = false
      if (wasJetztTunHighlightTimerRef.current !== null) {
        window.clearTimeout(wasJetztTunHighlightTimerRef.current)
        wasJetztTunHighlightTimerRef.current = null
      }
      window.removeEventListener('focus', onRevisit)
      window.removeEventListener('pageshow', onRevisit)
      window.removeEventListener(LIFEXP_ACTIVE_USER_CHANGED_EVENT, onRevisit)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pathname, viewEpoch, showDayViewHint])

  const handleDayViewToggle = async () => {
    if (typeof window === 'undefined') return
    if (isYesterdayViewActive()) {
      await syncYesterdayDailyScore(true)
      setTodayView()
      await syncProfileXpFromEvents()
    } else {
      if (challengeDay === 1) {
        showDayViewHint(DAY1_YESTERDAY_BLOCKED_MESSAGE)
        return
      }
      setYesterdayView()
    }
  }

  const yesterdayView = typeof window !== 'undefined' && isYesterdayViewActive()

  return (
    <HomeScreen
      level={level}
      totalXp={totalXp}
      todayAvatarXp={todayAvatarXp}
      avatarGender={avatarGender}
      profileReady={profileReady}
      streakPrompt={streakPrompt}
      areaStatuses={areaStatuses}
      showTaskPlannerHint={showTaskPlannerHint}
      showWasJetztTun={showWasJetztTun}
      thoughtBubbleReady={profileReady && homeFlowReady}
      showWasJetztTunHint={showWasJetztTunHint}
      showZieleHint={showZieleHint}
      celebrateAvatar={celebrateAvatar}
      celebrateBurstKey={celebrateBurstKey}
      yesterdayView={yesterdayView}
      dayViewHintMessage={dayViewHintMessage}
      showYesterdayEntryHint={showYesterdayEntryHint}
      onWasJetztTunThoughtBubbleClick={handleWasJetztTunThoughtBubbleClick}
      highlightWasJetztTunButton={highlightWasJetztTunButton}
      onDayViewToggle={() => void handleDayViewToggle()}
      interactive
    />
  )
}
