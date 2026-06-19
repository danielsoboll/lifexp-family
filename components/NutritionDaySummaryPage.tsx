'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { areaInfoHref } from '../lib/areaInfoNav'
import NutritionCompletionHints from './NutritionCompletionHints'
import PageHeaderBar from './PageHeaderBar'
import { CARD_SURFACE_CLASS, MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { applyNutritionDayCompletion } from '../lib/nutritionCompletion'
import {
  calculateNutritionCompletionXp,
  calculateMovementKcalBonus,
  calculateNutritionKcalMax,
  NUTRITION_ALCOHOL_INACTIVE_XP,
  fetchNutritionRule,
  fetchTodayMealEntries,
  mealTypesWithEntries,
  nutritionRequiredMealsComplete,
  nutritionTotalsForOverview,
  type NutritionRule,
} from '../lib/nutrition'
import {
  buildNutritionKcalBandRows,
  buildNutritionProteinBandRows,
  formatNutritionBandXp,
  formatSignedXp,
  nutritionCompletionXpLabel,
  nutritionXpToneClass,
} from '../lib/nutritionSummary'
import { fetchCurrentProfile, isAlcoholTrackingEnabled } from '../lib/profile'
import { fetchTodayXpForCategory } from '../lib/xpEvents'

export default function NutritionDaySummaryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof fetchTodayMealEntries>>['entries']>([])
  const [nutritionRule, setNutritionRule] = useState<NutritionRule | null>(null)
  const [ruleWarning, setRuleWarning] = useState<string | null>(null)
  const [movementXp, setMovementXp] = useState(0)
  const [trackAlcohol, setTrackAlcohol] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [
        { entries: mealEntries, error: entriesError },
        { xp: movementXpToday, error: movementXpError },
        { settings: profile, error: profileError },
      ] = await Promise.all([
        fetchTodayMealEntries(),
        fetchTodayXpForCategory('bewegung'),
        fetchCurrentProfile(),
      ])
      const ruleResult = profileError
        ? { rule: null, error: null, warning: null }
        : await fetchNutritionRule(profile)

      if (cancelled) return
      setLoading(false)
      setEntries(mealEntries)
      setNutritionRule(ruleResult.rule)
      setRuleWarning(ruleResult.warning)
      setMovementXp(movementXpToday)
      setTrackAlcohol(!profileError && isAlcoholTrackingEnabled(profile.alcoholMode))
      setErrorMessage(
        entriesError?.message ?? movementXpError?.message ?? ruleResult.error?.message ?? '',
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const mealDone = useMemo(() => mealTypesWithEntries(entries), [entries])
  const allMealsComplete = nutritionRequiredMealsComplete(mealDone, trackAlcohol)
  const totals = useMemo(() => nutritionTotalsForOverview(entries), [entries])
  const kcalMax = useMemo(
    () => calculateNutritionKcalMax(nutritionRule, movementXp),
    [movementXp, nutritionRule],
  )
  const movementKcalBonus = calculateMovementKcalBonus(nutritionRule, movementXp)
  const completion = useMemo(
    () =>
      calculateNutritionCompletionXp({
        kcal: totals.kcal,
        protein: totals.protein,
        rule: nutritionRule,
        movementXp,
        alcoholTrackingEnabled: trackAlcohol,
      }),
    [movementXp, nutritionRule, totals.kcal, totals.protein, trackAlcohol],
  )
  const kcalBands = useMemo(
    () => buildNutritionKcalBandRows(nutritionRule, totals.kcal, movementXp),
    [movementXp, nutritionRule, totals.kcal],
  )
  const proteinBands = useMemo(
    () => buildNutritionProteinBandRows(nutritionRule, totals.protein),
    [nutritionRule, totals.protein],
  )

  const hasUsableRule = nutritionRule != null && completion != null
  const proteinTooHigh = completion?.proteinBand === 'plus'

  const confirmCompletion = async () => {
    if (saving || !hasUsableRule) return
    setSaving(true)
    setErrorMessage('')

    const { updated, completion: result, leagueAwarded, error } = await applyNutritionDayCompletion({
      kcal: totals.kcal,
      protein: totals.protein,
      rule: nutritionRule,
      movementXp,
      kcalMax,
      alcoholTrackingEnabled: trackAlcohol,
    })

    setSaving(false)
    if (error || !result) {
      setErrorMessage(error?.message ?? 'Abschluss fehlgeschlagen.')
      return
    }

    const xpLabel = `${result.totalXp >= 0 ? '+' : ''}${result.totalXp}`
    const status = updated ? 'updated' : 'completed'
    const league = leagueAwarded ? '1' : '0'
    router.push(
      `/ernaehrung?completed=${status}&xp=${encodeURIComponent(xpLabel)}&league=${league}`,
    )
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/ernaehrung"
          infoHref={areaInfoHref('/ernaehrung')}
          infoLabel="Info zu Ernährung"
        />

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Zusammenfassung
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Individuelle Bewertung nach deinen Zielen und vorgegebenen Werten
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Wird geladen …</p>
        ) : (
          <>
            {ruleWarning ? (
              <p
                className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-100"
                role="status"
              >
                {ruleWarning}
              </p>
            ) : null}

            {!allMealsComplete ? (
              <p
                className="mb-4 rounded-2xl border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950 dark:border-orange-800/70 dark:bg-orange-950/35 dark:text-orange-100"
                role="status"
              >
                Du hast noch nicht alle Bereiche in Ernährung erfasst.
              </p>
            ) : null}

            <section className={`mb-4 grid grid-cols-2 gap-3 ${CARD_SURFACE_CLASS} p-4`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  kcal
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {totals.kcal}{' '}
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    / {kcalMax}
                  </span>
                </p>
                {movementKcalBonus > 0 ? (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    inkl. +{movementKcalBonus} kcal Trainings-Bonus
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Bewertungs-XP
                </p>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums ${nutritionXpToneClass(completion?.totalXp ?? 0)}`}
                >
                  {nutritionCompletionXpLabel(completion)}
                </p>
                {completion ? (
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    kcal{' '}
                    <span className={nutritionXpToneClass(completion.kcalXp)}>
                      {formatSignedXp(completion.kcalXp)}
                    </span>
                    {' · '}Protein{' '}
                    <span className={nutritionXpToneClass(completion.proteinXp)}>
                      {formatSignedXp(completion.proteinXp)}
                    </span>
                    {completion.alcoholInactiveXp > 0 ? (
                      <>
                        {' · '}Alkohol nicht aktiv{' '}
                        <span className={nutritionXpToneClass(completion.alcoholInactiveXp)}>
                          {formatSignedXp(completion.alcoholInactiveXp)}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </section>

            <section className={`mb-4 ${CARD_SURFACE_CLASS} p-4`} aria-label="kcal-Bewertung">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                kcal-Bewertung
              </h2>
              <ul className="mt-3 space-y-2">
                {kcalBands.map((row) => (
                  <li
                    key={row.band}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      row.active
                        ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-emerald-300/70 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50'
                        : 'border-stone-200 bg-stone-50/80 text-slate-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      {row.label}
                      {row.shiftedByMovement ? (
                        <span className="ml-1" aria-label="Trainings-Bonus berücksichtigt">
                          🏃
                        </span>
                      ) : null}
                    </span>
                    <span className={`tabular-nums font-semibold ${nutritionXpToneClass(row.xp)}`}>
                      {formatNutritionBandXp(row.xp)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`mb-4 ${CARD_SURFACE_CLASS} p-4`} aria-label="Protein-Bewertung">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Protein-Bewertung
              </h2>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {Math.round(totals.protein)} g
                </p>
                <p
                  className={`text-sm font-semibold tabular-nums ${nutritionXpToneClass(completion?.proteinXp ?? 0)}`}
                >
                  {completion ? formatNutritionBandXp(completion.proteinXp) : '–'}
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {proteinBands.map((row) => (
                  <li
                    key={row.band}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      row.active
                        ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-emerald-300/70 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50'
                        : 'border-stone-200 bg-stone-50/80 text-slate-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-slate-300'
                    }`}
                  >
                    <span>{row.label}</span>
                    <span className={`tabular-nums font-semibold ${nutritionXpToneClass(row.xp)}`}>
                      {formatNutritionBandXp(row.xp)}
                    </span>
                  </li>
                ))}
              </ul>
              {proteinTooHigh ? (
                <p
                  className="mt-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:border-yellow-700 dark:bg-yellow-950/35 dark:text-yellow-100"
                  role="status"
                >
                  Bitte beachten: zu viel Protein kann schädlich sein
                </p>
              ) : null}
            </section>

            {!trackAlcohol ? (
              <section className={`mb-4 ${CARD_SURFACE_CLASS} p-4`} aria-label="Alkohol nicht aktiv">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Alkohol nicht aktiv
                </h2>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Alkohol-Tracking ist aus — pauschale Bewertung beim Abschluss.
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatNutritionBandXp(NUTRITION_ALCOHOL_INACTIVE_XP)}
                  </p>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Bei Bedarf in den{' '}
                  <Link
                    href="/ziele/zielvorgaben"
                    className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    persönlichen Einstellungen unter „Ziele“
                  </Link>{' '}
                  ändern.
                </p>
              </section>
            ) : null}

            {errorMessage ? (
              <p className="mb-4 text-sm text-red-700 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void confirmCompletion()}
              disabled={saving || loading || !hasUsableRule}
              className={`${PRESSABLE_3D_CLASS} mb-2 w-full rounded-2xl border-2 border-yellow-300 bg-yellow-50/90 px-4 py-4 text-center text-base font-black text-amber-950 hover:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-yellow-700 dark:bg-yellow-950/35 dark:text-yellow-100`}
            >
              {saving
                ? 'Speichern …'
                : allMealsComplete
                  ? 'Abschliessen'
                  : 'Trotzdem abschliessen'}
            </button>
            <NutritionCompletionHints />

            <Link
              href="/ernaehrung"
              className="mt-4 block text-center text-sm font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
            >
              Zurück zur Übersicht
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
