'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  applyBrunchPartnerNothingIfNeeded,
  brunchDuplicateHintForMeal,
  isBrunchEstimateOption,
  isBrunchPairMeal,
  mealHasBrunchRoughEstimate,
  brunchPartnerMeal,
} from '../lib/brunchPairing'
import { areaInfoHref } from '../lib/areaInfoNav'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS } from '../lib/appShell'
import PageHeaderBar from './PageHeaderBar'
import {
  addMealEntry,
  deleteMealEntriesByIds,
  deleteMealEntryById,
  brunchEstimateForMeal,
  entriesForMeal,
  estimatePresetMealName,
  estimatePresetsForMeal,
  ernaehrungOverviewHref,
  fetchExactSelectionFoodItems,
  findMatchingEstimateOption,
  normalizeMealEntryName,
  fetchTodayMealEntries,
  isExactMealEntry,
  isRoughEstimateEntry,
  mealEntryDisplayName,
  mealFromParam,
  mealOptionForType,
  mealSource,
  mealTypeToDb,
  mealXpSources,
  nutritionTotals,
  type EstimateOption,
  MEAL_XP,
  type FoodItem,
  type MealEntry,
  type MealType,
} from '../lib/nutrition'
import {
  countIndivFoodItemsForMeal,
  INDIV_FOOD_LIST_CHANGED_EVENT,
} from '../lib/foodItemsIndiv'
import { decimalInputProps, integerInputProps, oneLineTextInputProps } from '../lib/formInputAutofill'
import { fetchCurrentProfile, isAlcoholTrackingEnabled } from '../lib/profile'
import {
  deleteTodayXpEventsForCategorySources,
  fetchTodayXpForCategory,
  recordXpEvent,
} from '../lib/xpEvents'

type NutritionMealEntryPageProps = {
  mode: 'estimate' | 'exact'
}

type ExactEntryGroup = {
  key: string
  label: string
  entries: MealEntry[]
  kcal: number
  protein: number
}

function triggerSelectionFeedback() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(35)
  }
}

function NutritionMealEntryInner({ mode }: NutritionMealEntryPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mealType = mealFromParam(searchParams.get('meal'))
  const meal = mealOptionForType(mealType)
  const isAlcoholMeal = mealType === 'alcohol'
  const estimatePresets = estimatePresetsForMeal(mealType)
  const brunchEstimate = brunchEstimateForMeal(mealType)
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [indivItemCount, setIndivItemCount] = useState(0)
  const [usesIndivList, setUsesIndivList] = useState(false)
  const [exactManualName, setExactManualName] = useState('')
  const [exactManualKcal, setExactManualKcal] = useState('')
  const [exactManualProtein, setExactManualProtein] = useState('')

  const selectedButtonClass =
    'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'

  const pendingHighlightClass =
    'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-1 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'

  const indivSetupHref = `/ernaehrung/genau/individuell?meal=${encodeURIComponent(mealType)}`

  const reloadFoodSelection = useCallback(async () => {
    if (mode !== 'exact') return null
    const [{ items, usesIndivList: indivActive, error: itemsError }, { count, error: countError }] =
      await Promise.all([
        fetchExactSelectionFoodItems(mealType),
        countIndivFoodItemsForMeal(mealType),
      ])
    setFoodItems(items)
    setUsesIndivList(indivActive)
    setIndivItemCount(count)
    return itemsError ?? countError ?? null
  }, [mealType, mode])

  useEffect(() => {
    if (mode !== 'exact') return
    const onVisible = () => {
      void reloadFoodSelection()
    }
    window.addEventListener('pageshow', onVisible)
    window.addEventListener(INDIV_FOOD_LIST_CHANGED_EVENT, onVisible)
    return () => {
      window.removeEventListener('pageshow', onVisible)
      window.removeEventListener(INDIV_FOOD_LIST_CHANGED_EVENT, onVisible)
    }
  }, [mode, reloadFoodSelection])

  useEffect(() => {
    if (!isAlcoholMeal) return
    let cancelled = false
    void (async () => {
      const { settings, error } = await fetchCurrentProfile()
      if (cancelled) return
      if (!error && !isAlcoholTrackingEnabled(settings.alcoholMode)) {
        router.replace('/ernaehrung')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAlcoholMeal, router])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      if (mode === 'exact') {
        setFoodItems([])
        setUsesIndivList(false)
        setIndivItemCount(0)
      }
      const { entries: mealEntries, error: entriesError } = await fetchTodayMealEntries()
      const selectionError = mode === 'exact' ? await reloadFoodSelection() : null
      if (cancelled) return
      setLoading(false)
      setEntries(mealEntries)
      const firstError = entriesError ?? selectionError
      setErrorMessage(firstError?.message ?? '')
    })()
    return () => {
      cancelled = true
    }
  }, [mealType, mode, pathname, reloadFoodSelection])

  const currentMealEntries = useMemo(() => entriesForMeal(entries, mealType), [entries, mealType])
  const currentMealTotals = useMemo(() => nutritionTotals(currentMealEntries), [currentMealEntries])
  const estimateEntries = useMemo(
    () =>
      currentMealEntries.filter(
        (entry) => isRoughEstimateEntry(entry) && (entry.kcal > 0 || entry.protein > 0),
      ),
    [currentMealEntries],
  )
  const coarseEntries = useMemo(
    () => currentMealEntries.filter((entry) => isRoughEstimateEntry(entry)),
    [currentMealEntries],
  )
  const estimateTotals = useMemo(() => nutritionTotals(estimateEntries), [estimateEntries])
  const formatMealTotalsLine = (kcal: number, protein: number) =>
    isAlcoholMeal ? `${kcal} kcal` : `${kcal} kcal · ${Math.round(protein)} g Protein`
  const exactEntryGroups = useMemo(() => {
    const groups = new Map<string, ExactEntryGroup>()
    for (const entry of currentMealEntries.filter((mealEntry) => isExactMealEntry(mealEntry))) {
      const label = normalizeMealEntryName(entry.name) || 'Eintrag'
      const key = label.toLowerCase()
      const group = groups.get(key) ?? { key, label, entries: [], kcal: 0, protein: 0 }
      group.entries.push(entry)
      group.kcal += entry.kcal
      group.protein += entry.protein
      groups.set(key, group)
    }
    return [...groups.values()]
  }, [currentMealEntries])

  const hasEstimateSelection = estimateEntries.length > 0
  const selectedFoodItems = foodItems
  const canAddManualExact = exactManualName.trim() !== '' && exactManualKcal.trim() !== ''

  const selectedEstimate = useMemo(() => {
    if (estimateEntries.length !== 1) return null
    const [entry] = estimateEntries
    return findMatchingEstimateOption(entry, mealType)
  }, [estimateEntries, mealType])

  const partnerHasBrunch = useMemo(() => {
    if (!isBrunchPairMeal(mealType)) return false
    const partner = brunchPartnerMeal(mealType)
    return partner ? mealHasBrunchRoughEstimate(entries, partner) : false
  }, [entries, mealType])

  const brunchDuplicateHint =
    isBrunchPairMeal(mealType) && partnerHasBrunch ? brunchDuplicateHintForMeal(mealType) : null

  const applyMealRewards = async (hadMealBefore: boolean) => {
    if (!hadMealBefore) {
      const { error: xpError } = await recordXpEvent({
        category: 'ernaehrung',
        source: mealSource(mealType),
        xp: MEAL_XP,
        metadata: { meal_type: mealTypeToDb(mealType) },
      })
      if (xpError) return xpError
    }
    return null
  }

  const persistExactPortions = async (
    portions: { name: string; kcal: number; protein: number }[],
    baseEntries: MealEntry[],
  ): Promise<{ nextEntries: MealEntry[] | null; errorMessage: string | null }> => {
    if (portions.length === 0) {
      return { nextEntries: baseEntries, errorMessage: null }
    }
    const hadMealBefore = entriesForMeal(baseEntries, mealType).length > 0
    let nextEntries = [...baseEntries]
    for (const portion of portions) {
      const entryName = normalizeMealEntryName(portion.name)
      if (!entryName) continue
      const { entry, error } = await addMealEntry({
        mealType,
        name: entryName,
        kcal: portion.kcal,
        protein: portion.protein,
      })
      if (error || !entry) {
        return { nextEntries: null, errorMessage: error?.message ?? 'Eintrag konnte nicht gespeichert werden.' }
      }
      nextEntries = [...nextEntries, entry]
    }
    const rewardError = await applyMealRewards(hadMealBefore)
    if (rewardError) {
      return { nextEntries: null, errorMessage: rewardError.message }
    }
    return { nextEntries, errorMessage: null }
  }

  const saveExactFromFoodItem = async (item: FoodItem) => {
    if (saving) return
    setSaving(true)
    setErrorMessage('')
    const { nextEntries, errorMessage: persistError } = await persistExactPortions(
      [{ name: item.name, kcal: item.kcal, protein: item.protein }],
      entries,
    )
    if (persistError || !nextEntries) {
      setErrorMessage(persistError ?? 'Eintrag konnte nicht gespeichert werden.')
      setSaving(false)
      return
    }
    setEntries(nextEntries)
    await reloadFoodSelection()
    triggerSelectionFeedback()
    setMessage('Eintrag erfasst.')
    setSaving(false)
  }

  const saveManualExactNow = async () => {
    if (saving || !canAddManualExact) return
    const name = normalizeMealEntryName(exactManualName)
    const kcal = parseInt(exactManualKcal, 10)
    const protein = isAlcoholMeal ? 0 : Number(exactManualProtein)
    if (!name) {
      setErrorMessage('Bitte einen Namen eingeben.')
      return
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setErrorMessage('Bitte gültige Kalorien eingeben.')
      return
    }
    if (!isAlcoholMeal && (!Number.isFinite(protein) || protein < 0)) {
      setErrorMessage('Bitte gültiges Protein eingeben.')
      return
    }
    setSaving(true)
    setErrorMessage('')
    const { nextEntries, errorMessage: persistError } = await persistExactPortions(
      [
        {
          name,
          kcal,
          protein: Number.isFinite(protein) ? protein : 0,
        },
      ],
      entries,
    )
    if (persistError || !nextEntries) {
      setErrorMessage(persistError ?? 'Eintrag konnte nicht gespeichert werden.')
      setSaving(false)
      return
    }
    setEntries(nextEntries)
    setExactManualName('')
    setExactManualKcal('')
    setExactManualProtein('')
    setErrorMessage('')
    await reloadFoodSelection()
    triggerSelectionFeedback()
    setMessage('Eintrag erfasst.')
    setSaving(false)
  }

  const deleteEstimateEntries = async () => {
    if (saving || estimateEntries.length === 0) return
    setSaving(true)
    const estimateIds = estimateEntries.map((entry) => entry.id)
    const nextEntries = entries.filter((entry) => !estimateIds.includes(entry.id))
    const sourcesToDelete: string[] = []
    if (entriesForMeal(nextEntries, mealType).length === 0) {
      sourcesToDelete.push(...mealXpSources(mealType))
    }

    const { error } = await deleteMealEntriesByIds(estimateIds)
    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }
    const { error: xpDeleteError } = await deleteTodayXpEventsForCategorySources({
      category: 'ernaehrung',
      sources: sourcesToDelete,
    })
    if (xpDeleteError) {
      setErrorMessage(xpDeleteError.message)
      setSaving(false)
      return
    }
    setEntries(nextEntries)
    setMessage('Grobe Schätzung gelöscht.')
    setErrorMessage('')
    setSaving(false)
  }

  const deleteOneExactEntry = async (group: ExactEntryGroup) => {
    if (saving) return
    const entryToDelete = group.entries[group.entries.length - 1]
    if (!entryToDelete) return
    setSaving(true)
    const nextEntries = entries.filter((entry) => entry.id !== entryToDelete.id)
    const sourcesToDelete: string[] = []
    if (entriesForMeal(nextEntries, mealType).length === 0) {
      sourcesToDelete.push(...mealXpSources(mealType))
    }

    const { error } = await deleteMealEntryById(entryToDelete.id)
    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }
    const { error: xpDeleteError } = await deleteTodayXpEventsForCategorySources({
      category: 'ernaehrung',
      sources: sourcesToDelete,
    })
    if (xpDeleteError) {
      setErrorMessage(xpDeleteError.message)
      setSaving(false)
      return
    }

    setEntries(nextEntries)
    setMessage('Eintrag reduziert.')
    setErrorMessage('')
    setSaving(false)
  }

  const saveEstimateEntry = async ({
    kcal,
    protein,
    name,
    message,
    applyBrunchPartnerDefault = false,
  }: {
    kcal: number
    protein: number
    name: string
    message: string
    applyBrunchPartnerDefault?: boolean
  }) => {
    if (saving) return
    setSaving(true)
    const hadMealBefore = currentMealEntries.length > 0
    const coarseIds = coarseEntries.map((entry) => entry.id)
    const { error: deleteError } = await deleteMealEntriesByIds(coarseIds)
    if (deleteError) {
      setErrorMessage(deleteError.message)
      setSaving(false)
      return
    }

    const { entry, error } = await addMealEntry({
      mealType,
      name: normalizeMealEntryName(name),
      kcal,
      protein,
    })
    if (error || !entry) {
      setErrorMessage(error?.message ?? 'Eintrag konnte nicht gespeichert werden.')
      setSaving(false)
      return
    }

    let nextEntries = [...entries.filter((entryItem) => !coarseIds.includes(entryItem.id)), entry]
    const rewardError = await applyMealRewards(hadMealBefore)
    if (rewardError) {
      setErrorMessage(rewardError.message)
      setSaving(false)
      return
    }

    if (applyBrunchPartnerDefault) {
      const { entries: pairedEntries, error: pairError } = await applyBrunchPartnerNothingIfNeeded(
        nextEntries,
        mealType,
      )
      if (pairError) {
        setErrorMessage(pairError.message)
        setSaving(false)
        return
      }
      nextEntries = pairedEntries
    }

    await fetchTodayXpForCategory('ernaehrung')
    setEntries(nextEntries)
    setMessage(message)
    setErrorMessage('')
    setSaving(false)

    if (mode === 'estimate') {
      window.setTimeout(() => {
        router.push(ernaehrungOverviewHref(mealType))
      }, 1500)
    }
  }

  const saveExclusiveEstimate = async (estimate: EstimateOption) => {
    if (saving) return
    if (selectedEstimate?.label === estimate.label) {
      await deleteEstimateEntries()
      return
    }

    if (isBrunchEstimateOption(estimate) && isBrunchPairMeal(mealType) && partnerHasBrunch) {
      setErrorMessage(brunchDuplicateHintForMeal(mealType))
      setMessage('')
      return
    }

    await saveEstimateEntry({
      kcal: estimate.kcal,
      protein: estimate.protein,
      name: estimatePresetMealName(estimate.label),
      message: isAlcoholMeal
        ? `${estimate.label} (${estimate.kcal} kcal) gespeichert.`
        : `${estimate.label} gespeichert.`,
      applyBrunchPartnerDefault: isBrunchEstimateOption(estimate) && isBrunchPairMeal(mealType),
    })
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar
          backHref="/ernaehrung"
          infoHref={areaInfoHref(mode === 'estimate' ? '/ernaehrung/grob' : '/ernaehrung/genau')}
          infoLabel={mode === 'estimate' ? 'Info zu Grob schätzen' : 'Info zu Genau'}
          headerSecondaryAction={
            mode === 'exact' ? (
              <Link
                href={indivSetupHref}
                className={`lifexp-pressable-3d inline-flex items-center justify-center rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                  indivItemCount > 0 ? selectedButtonClass : pendingHighlightClass
                }`}
              >
                Eigene
              </Link>
            ) : null
          }
        />

        <header className="mb-5 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800/60"
            aria-hidden
          >
            {meal.emoji}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {mode === 'estimate' ? 'Grob schätzen' : 'Genauer eingeben'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{meal.label}</p>
          </div>
        </header>

        <section className="rounded-2xl border-2 border-slate-300/90 bg-white p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] dark:border-slate-600 dark:bg-slate-900/90">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Bereits erfasst
          </p>
          {currentMealEntries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Noch nichts eingetragen.</p>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatMealTotalsLine(currentMealTotals.kcal, currentMealTotals.protein)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentMealEntries.length} Eintrag{currentMealEntries.length === 1 ? '' : 'e'} heute
              </p>
              {mode === 'exact' && hasEstimateSelection ? (
                <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50/80 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950/25">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-xs font-bold text-amber-950 dark:text-yellow-100">
                        {mealEntryDisplayName(estimateEntries[0]?.name ?? '') || 'Grobe Schätzung'}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {formatMealTotalsLine(estimateTotals.kcal, estimateTotals.protein)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteEstimateEntries()}
                      disabled={saving}
                      className="lifexp-pressable-3d flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-lg font-black leading-none text-red-700 hover:border-red-400 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                      aria-label="Grobe Schätzung löschen"
                    >
                      −
                    </button>
                  </div>
                </div>
              ) : null}
              {mode === 'exact' && exactEntryGroups.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {exactEntryGroups.map((group) => (
                      <div
                        key={group.key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/75 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/35"
                      >
                        <div className="min-w-0 text-left">
                          <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                            {group.entries.length}× {group.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatMealTotalsLine(group.kcal, group.protein)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteOneExactEntry(group)}
                          disabled={saving}
                          className="lifexp-pressable-3d flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-lg font-black leading-none text-red-700 hover:border-red-400 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                          aria-label={`${group.label} um eins reduzieren`}
                        >
                          −
                        </button>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        {loading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Wird geladen …</p> : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            {message}
          </p>
        ) : null}

        {mode === 'estimate' ? (
          <section className="mt-5 rounded-2xl border-2 border-yellow-300 bg-yellow-50/80 p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] dark:border-yellow-700 dark:bg-yellow-950/25">
            {isAlcoholMeal ? (
              <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">Nur Kalorien – ohne Protein.</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {estimatePresets.map((estimate) => (
                <button
                  key={estimate.label}
                  type="button"
                  disabled={saving}
                  onClick={() => void saveExclusiveEstimate(estimate)}
                  className={`lifexp-pressable-3d rounded-xl border-2 px-2 py-3 text-sm font-bold capitalize disabled:opacity-60 ${
                    selectedEstimate?.label === estimate.label
                      ? selectedButtonClass
                      : 'border-yellow-300 bg-white text-amber-950 dark:border-yellow-700 dark:bg-slate-900 dark:text-yellow-100'
                  }`}
                >
                  <span className="block">{estimate.label}</span>
                  {!isAlcoholMeal ? (
                    <>
                      <span className="mt-1 block text-xs font-semibold normal-case tabular-nums">
                        {estimate.kcal} kcal
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold normal-case tabular-nums">
                        {estimate.protein} g Protein
                      </span>
                    </>
                  ) : (
                    <span className="mt-0.5 block text-xs font-semibold normal-case tabular-nums">
                      {estimate.kcal} kcal
                    </span>
                  )}
                </button>
              ))}
            </div>
            {brunchEstimate ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveExclusiveEstimate(brunchEstimate)}
                className={`lifexp-pressable-3d mt-2 w-full rounded-xl border-2 px-3 py-3 text-sm font-bold disabled:opacity-60 ${
                  selectedEstimate?.label === brunchEstimate.label
                    ? selectedButtonClass
                    : 'border-yellow-300 bg-white text-amber-950 dark:border-yellow-700 dark:bg-slate-900 dark:text-yellow-100'
                }`}
              >
                {brunchEstimate.label} {brunchEstimate.kcal} Kcal – Protein {brunchEstimate.protein} g
              </button>
            ) : null}
            {brunchDuplicateHint ? (
              <p className="mt-2 rounded-xl border border-amber-300/90 bg-amber-50/90 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                {brunchDuplicateHint}
              </p>
            ) : null}
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-4 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] dark:border-emerald-700 dark:bg-emerald-950/25">
            {usesIndivList ? (
              <p className="mb-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Deine Standard-Gerichte für {meal.label}
              </p>
            ) : (
              <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
                Tippe auf + – der Eintrag wird sofort erfasst.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {selectedFoodItems.length === 0 ? (
                <p className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-3 py-3 text-sm text-amber-950 dark:border-yellow-700 dark:bg-yellow-950/25 dark:text-yellow-100">
                  {loading
                    ? 'Lebensmittel werden geladen …'
                    : 'Für diesen Bereich sind noch keine Lebensmittel hinterlegt.'}
                </p>
              ) : (
                selectedFoodItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving}
                    onClick={() => void saveExactFromFoodItem(item)}
                    className="lifexp-pressable-3d flex items-center justify-between gap-3 rounded-xl border-2 border-stone-400 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-300/80 px-3 py-3 text-left hover:border-emerald-400 disabled:opacity-60 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {item.portionLabel} · {item.kcal} kcal · {Math.round(item.protein)} g Protein
                      </span>
                    </span>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-white"
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                ))
              )}
            </div>
            </section>

            <section className="mt-4 rounded-2xl border-2 border-slate-300/90 bg-white p-4 dark:border-slate-600 dark:bg-slate-900/90">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Manuell
              <input
                {...oneLineTextInputProps('lifexp-meal-name')}
                value={exactManualName}
                onChange={(event) => setExactManualName(event.target.value)}
                placeholder={isAlcoholMeal ? 'z. B. Bier, Wein' : 'z. B. Salat, Joghurt'}
                className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <div className={`mt-3 grid gap-3 ${isAlcoholMeal ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                kcal
                <input
                  {...integerInputProps('lifexp-meal-kcal')}
                  value={exactManualKcal}
                  onChange={(event) => setExactManualKcal(event.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              {!isAlcoholMeal ? (
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Protein
                  <input
                    {...decimalInputProps('lifexp-meal-protein')}
                    value={exactManualProtein}
                    onChange={(event) => setExactManualProtein(event.target.value)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void saveManualExactNow()}
              disabled={saving || !canAddManualExact}
              className="lifexp-pressable-3d mt-3 w-full rounded-xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 dark:disabled:border-slate-700 dark:disabled:from-slate-800 dark:disabled:to-slate-900 dark:disabled:text-slate-500"
            >
              Übernehmen
            </button>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default function NutritionMealEntryPage(props: NutritionMealEntryPageProps) {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-500 dark:text-slate-400">Wird geladen …</p>}>
      <NutritionMealEntryInner {...props} />
    </Suspense>
  )
}
