'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import DailyXpProgressCard from '../../components/DailyXpProgressCard'
import NutritionCompletionHints, {
  nutritionCompletionCloseLabel,
} from '../../components/NutritionCompletionHints'
import NutritionMealCard from '../../components/NutritionMealCard'
import PageHeaderBar from '../../components/PageHeaderBar'
import { isYesterdayViewActive, LIFEXP_VIEW_DATE_CHANGED_EVENT } from '../../lib/activeEventDate'
import { areaInfoHref } from '../../lib/areaInfoNav'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../../lib/appShell'
import {
  addMealEntry,
  calculateNutritionKcalMax,
  deleteTodayMealEntriesForMeal,
  fetchNutritionRule,
  fetchTodayMealEntries,
  mealSource,
  mealTypeToDb,
  mealTypesWithEntries,
  MEAL_XP,
  ALCOHOL_MEAL,
  entriesForMeal,
  ernaehrungMealSectionId,
  MEAL_OPTIONS,
  NUTRITION_KCAL_MAX,
  NUTRITION_PROTEIN_GOAL,
  NUTRITION_COMPLETION_SOURCE,
  nutritionTotalsForOverview,
  parseErnaehrungMealScrollParam,
  type MealEntry,
  type MealType,
  type NutritionRule,
} from '../../lib/nutrition'
import { brunchPairOverviewHint } from '../../lib/brunchPairing'
import {
  fetchCurrentProfile,
  isAlcoholTrackingEnabled,
  LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT,
} from '../../lib/profile'
import { XP_LIMITS, xpBarMaxForCategory, xpBoostModeForCategory, xpBoostThresholdForCategory, xpBoostUnlockedForCategory, xpTargetForCategory } from '../../lib/xpDisplay'
import { fetchTodayHasEventForCategorySource, fetchTodayXpForCategory, recordXpEvent } from '../../lib/xpEvents'

export default function ErnaehrungPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mealScrollTarget = parseErnaehrungMealScrollParam(searchParams.get('meal'))
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [categoryXp, setCategoryXp] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [kcalMax, setKcalMax] = useState(NUTRITION_KCAL_MAX)
  const [proteinGoal, setProteinGoal] = useState(NUTRITION_PROTEIN_GOAL)
  const [nutritionRule, setNutritionRule] = useState<NutritionRule | null>(null)
  const [movementXp, setMovementXp] = useState(0)
  const [hasKcalMovementBonus, setHasKcalMovementBonus] = useState(false)
  const [trackAlcohol, setTrackAlcohol] = useState(false)
  const [nutritionDayComplete, setNutritionDayComplete] = useState(false)
  const [yesterdayView, setYesterdayView] = useState(false)

  useEffect(() => {
    const syncYesterdayView = () => setYesterdayView(isYesterdayViewActive())
    syncYesterdayView()
    window.addEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, syncYesterdayView)
    window.addEventListener('focus', syncYesterdayView)
    return () => {
      window.removeEventListener(LIFEXP_VIEW_DATE_CHANGED_EVENT, syncYesterdayView)
      window.removeEventListener('focus', syncYesterdayView)
    }
  }, [])

  const syncTrackAlcohol = useCallback(async () => {
    const { settings, error } = await fetchCurrentProfile()
    setTrackAlcohol(!error && isAlcoholTrackingEnabled(settings.alcoholMode))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [
        { entries: mealEntries, error: entriesError },
        { xp, error: xpError },
        { xp: movementXpToday, error: movementXpError },
        { settings: profile, error: profileError },
        { hasEvent: nutritionCompleted, error: nutritionCompleteError },
      ] = await Promise.all([
        fetchTodayMealEntries(),
        fetchTodayXpForCategory('ernaehrung'),
        fetchTodayXpForCategory('bewegung'),
        fetchCurrentProfile(),
        fetchTodayHasEventForCategorySource({
          category: 'ernaehrung',
          source: NUTRITION_COMPLETION_SOURCE,
        }),
      ])
      const { rule, error: ruleError } = profileError
        ? { rule: null, error: null }
        : await fetchNutritionRule(profile).then((result) => ({
            rule: result.rule,
            error: result.error,
          }))
      if (cancelled) return
      setLoading(false)
      setEntries(mealEntries)
      setCategoryXp(xp)
      setNutritionRule(rule)
      setMovementXp(movementXpToday)
      setKcalMax(calculateNutritionKcalMax(rule, movementXpToday))
      setProteinGoal(rule?.protOpt && rule.protOpt > 0 ? rule.protOpt : NUTRITION_PROTEIN_GOAL)
      setHasKcalMovementBonus(movementXpToday > 0 && (rule?.plusBew1 ?? 0) > 0)
      setTrackAlcohol(!profileError && isAlcoholTrackingEnabled(profile.alcoholMode))
      setNutritionDayComplete(nutritionCompleted)
      const firstError = entriesError ?? xpError ?? movementXpError ?? ruleError ?? nutritionCompleteError
      setErrorMessage(firstError?.message ?? '')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onProfileSettingsChanged = () => void syncTrackAlcohol()
    window.addEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged)
    return () => window.removeEventListener(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT, onProfileSettingsChanged)
  }, [syncTrackAlcohol])

  useEffect(() => {
    if (!mealScrollTarget || loading) return
    const sectionId = ernaehrungMealSectionId(mealScrollTarget)
    if (mealScrollTarget === 'alcohol' && !trackAlcohol) return

    const scrollToMeal = () => {
      const section = document.getElementById(sectionId)
      if (!section) return
      section.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const frame = window.requestAnimationFrame(scrollToMeal)
    return () => window.cancelAnimationFrame(frame)
  }, [loading, mealScrollTarget, trackAlcohol])

  useEffect(() => {
    const completed = searchParams.get('completed')
    if (!completed) return

    const xp = searchParams.get('xp') ?? '0'
    const leagueAwarded = searchParams.get('league') === '1'
    const leagueNote = leagueAwarded ? ' · +1 Liga-XP' : ''
    setSuccessMessage(
      completed === 'updated'
        ? `Aktualisiert: ${xp} XP${leagueNote}`
        : `Abgeschlossen: ${xp} XP${leagueNote}`,
    )
    setNutritionDayComplete(true)
    setErrorMessage('')

    void (async () => {
      const { xp: refreshedXp, error } = await fetchTodayXpForCategory('ernaehrung')
      if (!error) setCategoryXp(refreshedXp)
    })()

    router.replace('/ernaehrung', { scroll: false })
  }, [router, searchParams])

  const mealDone = useMemo(() => mealTypesWithEntries(entries), [entries])
  const totals = useMemo(() => nutritionTotalsForOverview(entries), [entries])
  const maxXp = XP_LIMITS.ernaehrung
  const targetXp = xpTargetForCategory('ernaehrung', maxXp)

  const chooseNothing = async (mealType: MealType) => {
    if (saving) return
    setSaving(true)
    const hadMealBefore = mealDone.has(mealType)
    const { error: deleteError } = await deleteTodayMealEntriesForMeal(mealType)
    if (deleteError) {
      setErrorMessage(deleteError.message)
      setSaving(false)
      return
    }
    const { entry, error } = await addMealEntry({ mealType, name: 'Nichts', kcal: 0, protein: 0 })
    if (error || !entry) {
      setErrorMessage(error?.message ?? 'Auswahl konnte nicht gespeichert werden.')
      setSaving(false)
      return
    }
    if (!hadMealBefore) {
      const { error: xpError } = await recordXpEvent({
        category: 'ernaehrung',
        source: mealSource(mealType),
        xp: MEAL_XP,
        metadata: { meal_type: mealTypeToDb(mealType), selection: 'nothing' },
      })
      if (xpError) {
        setErrorMessage(xpError.message)
        setSaving(false)
        return
      }
    }
    const nextEntries = [...entries.filter((entryItem) => entryItem.mealType !== mealType), entry]
    setEntries(nextEntries)
    const { xp, error: xpReloadError } = await fetchTodayXpForCategory('ernaehrung')
    if (!xpReloadError) setCategoryXp(xp)
    setErrorMessage('')
    setSuccessMessage('')
    setSaving(false)
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/"
          infoHref={areaInfoHref('/ernaehrung')}
          infoLabel="Info zu Ernährung"
        />

        <header className="mb-5 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            🥗
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ernährung</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Schnell Mahlzeiten erfassen</p>
          </div>
        </header>

        <DailyXpProgressCard
          label="Ernährungs-XP heute"
          value={categoryXp}
          max={maxXp}
          target={targetXp}
          icon="🥗"
          boostMode={xpBoostModeForCategory('ernaehrung')}
          barMax={xpBarMaxForCategory('ernaehrung')}
          boostThreshold={xpBoostThresholdForCategory('ernaehrung')}
          boostUnlocked={xpBoostUnlockedForCategory('ernaehrung', { nutritionDayComplete })}
          errorMessage={errorMessage}
        />

        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-slate-400/85 bg-slate-100 px-4 py-3 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] dark:border-slate-600 dark:bg-slate-900/90">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">kcal</p>
            <p className="mt-1 flex items-baseline gap-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              <span>{totals.kcal}</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                von max.{' '}
                <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {kcalMax}
                </span>
                {hasKcalMovementBonus ? (
                  <span className="ml-0.5 text-xs" aria-label="Trainingsbonus">
                    🏃
                  </span>
                ) : null}
              </span>
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${CARD_SURFACE_CLASS}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Protein</p>
            <p className="mt-1 flex items-baseline gap-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              <span>{Math.round(totals.protein)} g</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                von min.{' '}
                <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {proteinGoal}
                </span>{' '}
                g
              </span>
            </p>
          </div>
        </section>

        {loading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Ernährung wird geladen …</p> : null}
        {successMessage ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            {successMessage}
          </p>
        ) : null}

        <section className="mt-5 flex flex-col gap-3" aria-label="Mahlzeiten">
          {MEAL_OPTIONS.map((meal) => (
            <div key={meal.type} id={ernaehrungMealSectionId(meal.type)}>
              <NutritionMealCard
                mealType={meal.type}
                label={meal.label}
                emoji={meal.emoji}
                done={mealDone.has(meal.type)}
                mealEntries={entriesForMeal(entries, meal.type)}
                subtitle={brunchPairOverviewHint(meal.type, entries) ?? undefined}
                saving={saving}
                onChooseNothing={() => void chooseNothing(meal.type)}
              />
            </div>
          ))}
          {trackAlcohol ? (
            <div id={ernaehrungMealSectionId('alcohol')}>
              <NutritionMealCard
                key={ALCOHOL_MEAL.type}
                mealType={ALCOHOL_MEAL.type}
                label={ALCOHOL_MEAL.label}
                emoji={ALCOHOL_MEAL.emoji}
                subtitle={ALCOHOL_MEAL.subtitle}
                variant="personal"
                done={mealDone.has('alcohol')}
                mealEntries={entriesForMeal(entries, 'alcohol')}
                saving={saving}
                onChooseNothing={() => void chooseNothing('alcohol')}
              />
            </div>
          ) : null}
        </section>
        <div className="mt-5">
          <Link
            href="/ernaehrung/zusammenfassung"
            className="lifexp-pressable-3d block w-full rounded-2xl border-2 border-yellow-300 bg-yellow-50/90 px-4 py-4 text-center hover:border-yellow-400 dark:border-yellow-700 dark:bg-yellow-950/35"
          >
            <span className="block text-base font-black text-amber-950 dark:text-yellow-100">
              {nutritionCompletionCloseLabel(yesterdayView)}
            </span>
            <span className="mt-1 block text-xs font-bold text-amber-800 dark:text-yellow-200">
              XP berechnen · +1 Liga-XP
            </span>
          </Link>
          <NutritionCompletionHints showEvaluationSubhint />
        </div>
      </div>
    </main>
  )
}
