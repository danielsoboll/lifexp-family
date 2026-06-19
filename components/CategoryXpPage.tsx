'use client'

import { useCallback, useEffect, useState } from 'react'
import DailyXpProgressCard from './DailyXpProgressCard'
import DashboardButton from './DashboardButton'
import PageHeaderBar from './PageHeaderBar'
import PlusIndividualGoals from './PlusIndividualGoals'
import PlusPersonalTasks from './PlusPersonalTasks'
import { loadPrimaryGoal, type PrimaryGoal, type XpCategory } from '../lib/storage'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../lib/appShell'
import { bewegungTrainingButtonCopy } from '../lib/movementTraining'
import {
  fetchCurrentProfile,
  isAlcoholTrackingEnabled,
  LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT,
} from '../lib/profile'
import {
  XP_LIMITS,
  xpBarMaxForCategory,
  xpBoostModeForCategory,
  xpBoostThresholdForCategory,
  xpTargetForCategory,
} from '../lib/xpDisplay'
import {
  fetchLatestTodaySelection,
  fetchTodayXpForCategory,
  xpEventCategoryFromAppCategory,
} from '../lib/xpEvents'

const CATEGORY_UI: Record<
  XpCategory,
  { title: string; xpLabel: string; href: string; infoHref: string }
> = {
  bewegung: { title: 'Training', xpLabel: 'Trainings-XP', href: '/bewegung', infoHref: '/bewegung/info' },
  ernaehrung: { title: 'Ernährung', xpLabel: 'Ernährungs-XP', href: '/ernaehrung', infoHref: '/ernaehrung/info' },
  meinTag: { title: 'Mein Tag', xpLabel: 'Mein-Tag-XP', href: '/mein-tag', infoHref: '/mein-tag/info' },
  plus: { title: 'Plus', xpLabel: 'Plus-XP', href: '/plus', infoHref: '/plus/info' },
}

const CATEGORY_EMOJI: Record<XpCategory, string> = {
  bewegung: '🏃',
  ernaehrung: '🥗',
  meinTag: '🌤️',
  plus: '➕',
}

type CategoryXpPageProps = {
  category: XpCategory
}

export default function CategoryXpPage({ category }: CategoryXpPageProps) {
  const [categoryXp, setCategoryXp] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [movementDone, setMovementDone] = useState<Record<string, boolean>>({})
  const [showIndividualAlcohol, setShowIndividualAlcohol] = useState(false)
  const [showIndividualGlaubenssatz, setShowIndividualGlaubenssatz] = useState(false)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('fit')
  const ui = CATEGORY_UI[category]
  const emoji = CATEGORY_EMOJI[category]
  const eventCategory = xpEventCategoryFromAppCategory(category)
  const maxXp = XP_LIMITS[eventCategory]
  const targetXp = xpTargetForCategory(eventCategory, maxXp)
  const trainingButton = bewegungTrainingButtonCopy(primaryGoal)

  const reloadCategoryXp = useCallback(async () => {
    const { xp, error } = await fetchTodayXpForCategory(eventCategory)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setCategoryXp(xp)
  }, [eventCategory])

  const syncPlusIndividualGoals = useCallback(async () => {
    if (category !== 'plus') return
    const { settings, error: profileError } = await fetchCurrentProfile()
    const alcoholOn = !profileError && isAlcoholTrackingEnabled(settings.alcoholMode)
    const motivationOn = !profileError && settings.motivationMode === true
    setShowIndividualAlcohol(alcoholOn)
    setShowIndividualGlaubenssatz(motivationOn)
  }, [category])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [{ xp, error }, { settings: profile, error: profileError }] = await Promise.all([
        fetchTodayXpForCategory(eventCategory),
        fetchCurrentProfile(),
      ])
      if (cancelled) return
      setPrimaryGoal(profileError ? loadPrimaryGoal() : profile.goalType)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      setCategoryXp(xp)
      if (category === 'bewegung') {
        const results = await Promise.all([
          fetchLatestTodaySelection({ category: 'bewegung', source: 'arbeit' }),
          fetchLatestTodaySelection({ category: 'bewegung', source: 'training' }),
          fetchLatestTodaySelection({ category: 'bewegung', source: 'schritte' }),
        ])
        if (cancelled) return
        const selectionError = results.find((result) => result.error)?.error
        if (selectionError) {
          setErrorMessage(selectionError.message)
          return
        }
        setMovementDone({
          arbeit: Boolean(results[0].selection),
          training: Boolean(results[1].selection),
          schritte: Boolean(results[2].selection),
        })
      }
      if (category === 'meinTag') {
        const results = await Promise.all([
          fetchLatestTodaySelection({ category: 'mein_tag', source: 'sleep' }),
          fetchLatestTodaySelection({ category: 'mein_tag', source: 'sun_air' }),
          fetchLatestTodaySelection({ category: 'mein_tag', source: 'wellbeing' }),
        ])
        if (cancelled) return
        const selectionError = results.find((result) => result.error)?.error
        if (selectionError) {
          setErrorMessage(selectionError.message)
          return
        }
        setMovementDone({
          sleep: Boolean(results[0].selection),
          sunAir: Boolean(results[1].selection),
          wellbeing: Boolean(results[2].selection),
        })
      }
      if (category === 'plus') {
        const profileSettings = profileError ? null : profile
        const [motivationResult, alcoholResult, glaubenssatzResult] = await Promise.all([
          fetchLatestTodaySelection({ category: 'plus', source: 'motivation' }),
          fetchLatestTodaySelection({ category: 'plus', source: 'alcohol' }),
          fetchLatestTodaySelection({ category: 'plus', source: 'glaubenssatz' }),
        ])
        if (cancelled) return
        const selectionError =
          motivationResult.error ?? alcoholResult.error ?? glaubenssatzResult.error
        if (selectionError) {
          setErrorMessage(selectionError.message)
          return
        }
        const alcoholOn = profileSettings ? isAlcoholTrackingEnabled(profileSettings.alcoholMode) : false
        const motivationOn = profileSettings?.motivationMode === true
        setShowIndividualAlcohol(alcoholOn)
        setShowIndividualGlaubenssatz(motivationOn)
        setMovementDone({
          motivation: Boolean(motivationResult.selection),
          alcohol: Boolean(alcoholResult.selection),
          glaubenssatz: Boolean(glaubenssatzResult.selection),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category, eventCategory])

  useEffect(() => {
    if (category !== 'plus') return
    const onProfileSettingsChanged = () => void syncPlusIndividualGoals()
    window.addEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged)
    return () => window.removeEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged)
  }, [category, syncPlusIndividualGoals])

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/"
          infoHref={ui.infoHref}
          infoLabel={`Info zu ${ui.title}`}
        />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-3xl ring-1 ring-slate-400/80 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            {emoji}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{ui.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">XP für diesen Bereich sammeln</p>
          </div>
        </header>

        <section
          aria-label={`${ui.title} Tages-XP`}
        >
          <DailyXpProgressCard
            label={`${ui.xpLabel} heute`}
            value={categoryXp}
            max={maxXp}
            target={targetXp}
            boostMode={xpBoostModeForCategory(eventCategory)}
            barMax={xpBarMaxForCategory(eventCategory)}
            boostThreshold={xpBoostThresholdForCategory(eventCategory)}
            icon={emoji}
            errorMessage={errorMessage}
          />
        </section>

        <section className="mt-8 flex flex-col gap-3" aria-label="Aktionen">
          {category === 'bewegung' ? (
            <>
              <DashboardButton
                href="/bewegung/arbeit"
                emoji="🧰"
                title="Arbeit"
                subtitle="Körperliche Tätigkeit einschätzen"
                status={movementDone.arbeit ? 'done' : undefined}
              />
              <DashboardButton
                href="/bewegung/training"
                emoji="💪"
                title={trainingButton.title}
                subtitle={trainingButton.subtitle}
                status={movementDone.training ? 'done' : undefined}
              />
              <DashboardButton
                href="/bewegung/schritte"
                emoji="🚶"
                title="Schritte"
                subtitle="deine Schrittzahl auswählen"
                status={movementDone.schritte ? 'done' : undefined}
              />
            </>
          ) : category === 'meinTag' ? (
            <>
              <DashboardButton
                href="/mein-tag/schlaf"
                emoji="😴"
                title="Schlaf"
                subtitle="Wie hast du geschlafen?"
                status={movementDone.sleep ? 'done' : undefined}
              />
              <DashboardButton
                href="/mein-tag/sonne-frische-luft"
                emoji="☀️"
                title="Sonne/frische Luft"
                subtitle="Etwas Freiheit"
                status={movementDone.sunAir ? 'done' : undefined}
              />
              <DashboardButton
                href="/mein-tag/befinden"
                emoji="🙂"
                title="Befinden"
                subtitle="Wie geht es dir heute?"
                status={movementDone.wellbeing ? 'done' : undefined}
              />
            </>
          ) : category === 'plus' ? (
            <>
              <DashboardButton
                href="/plus/motivation"
                emoji="💪"
                title="Motivation"
                subtitle="Dranbleiben"
                status={movementDone.motivation ? 'done' : undefined}
              />
              <PlusIndividualGoals
                showAlcohol={showIndividualAlcohol}
                showGlaubenssatz={showIndividualGlaubenssatz}
                alcoholDone={movementDone.alcohol}
                glaubenssatzDone={movementDone.glaubenssatz}
              />
              <PlusPersonalTasks onTaskCompleted={() => void reloadCategoryXp()} />
            </>
          ) : (
            null
          )}
        </section>
      </div>
    </main>
  )
}
