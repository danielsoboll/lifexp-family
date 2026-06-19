'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, PILL_BACK_CLASS } from '../lib/appShell'
import {
  compactIndivFoodOrderForMeal,
  deleteAllIndivFoodItemsForMeal,
  deleteIndivFoodItem,
  fetchIndivFoodItemsForMeal,
  insertIndivFoodItem,
  MAX_INDIV_FOOD_ITEMS_PER_MEAL,
  notifyIndivFoodListChanged,
  reorderIndivFoodItems,
  updateIndivFoodItem,
  type IndivFoodItem,
} from '../lib/foodItemsIndiv'
import {
  fetchFoodItemsForMeal,
  mealFromParam,
  mealOptionForType,
  type FoodItem,
} from '../lib/nutrition'
import { decimalInputProps, integerInputProps, oneLineTextInputProps } from '../lib/formInputAutofill'
import { fetchCurrentProfile, isAlcoholTrackingEnabled } from '../lib/profile'

type PanelMode = 'main' | 'catalog'

const pendingHighlightClass =
  'border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-amber-950 ring-1 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:text-yellow-100 dark:ring-yellow-900/40'

const selectedClass =
  'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'

const primaryActionClass =
  'lifexp-pressable-3d rounded-xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 dark:disabled:border-slate-700 dark:disabled:from-slate-800 dark:disabled:to-slate-900 dark:disabled:text-slate-500'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function NutritionIndivFoodInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mealType = mealFromParam(searchParams.get('meal'))
  const meal = mealOptionForType(mealType)
  const isAlcoholMeal = mealType === 'alcohol'

  const [myItems, setMyItems] = useState<IndivFoodItem[]>([])
  const [catalogItems, setCatalogItems] = useState<FoodItem[]>([])
  const [panel, setPanel] = useState<PanelMode>('main')
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<number>>(() => new Set())
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editKcal, setEditKcal] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionChanged, setSessionChanged] = useState(false)

  const backToGenau = `/ernaehrung/genau?meal=${encodeURIComponent(mealType)}`

  const markSessionChanged = () => setSessionChanged(true)

  const savedNames = useMemo(() => {
    return new Set(myItems.map((item) => normalizeName(item.name)))
  }, [myItems])

  const slotsLeft = MAX_INDIV_FOOD_ITEMS_PER_MEAL - myItems.length

  const reload = useCallback(async () => {
    const [{ items, error }, { items: catalog, error: catalogError }] = await Promise.all([
      fetchIndivFoodItemsForMeal(mealType),
      fetchFoodItemsForMeal(mealType),
    ])
    if (error) {
      setErrorMessage(error.message)
      return
    }
    if (catalogError) {
      setErrorMessage(catalogError.message)
      return
    }
    setMyItems(items)
    setCatalogItems(catalog)
    setErrorMessage('')
  }, [mealType])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (mealType === 'alcohol') {
        const { settings, error } = await fetchCurrentProfile()
        if (!cancelled && !error && !isAlcoholTrackingEnabled(settings.alcoholMode)) {
          router.replace('/ernaehrung')
          return
        }
      }
      await reload()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [mealType, reload, router])

  const isNameTaken = (name: string, exceptId?: number) => {
    const key = normalizeName(name)
    return myItems.some((item) => item.id !== exceptId && normalizeName(item.name) === key)
  }

  const clearEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditKcal('')
    setEditProtein('')
  }

  const startEdit = (item: IndivFoodItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditKcal(String(item.kcal))
    setEditProtein(isAlcoholMeal ? '0' : String(item.protein))
    setErrorMessage('')
  }

  const canSaveEdit = useMemo(() => {
    if (editingId === null) return false
    const name = editName.trim()
    const kcal = parseInt(editKcal, 10)
    const protein = Number(editProtein)
    if (!name || isNameTaken(name, editingId)) return false
    if (editKcal.trim() === '' || !Number.isFinite(kcal) || kcal < 0) return false
    if (isAlcoholMeal) return true
    return editProtein.trim() !== '' && Number.isFinite(protein) && protein >= 0
  }, [editName, editKcal, editProtein, editingId, isAlcoholMeal, myItems])

  const canAdoptCustom = useMemo(() => {
    const name = customName.trim()
    const kcal = parseInt(customKcal, 10)
    const protein = Number(customProtein)
    if (!name || isNameTaken(name) || slotsLeft <= 0) return false
    if (customKcal.trim() === '' || !Number.isFinite(kcal) || kcal < 0) return false
    if (isAlcoholMeal) return true
    return customProtein.trim() !== '' && Number.isFinite(protein) && protein >= 0
  }, [customName, customKcal, customProtein, isAlcoholMeal, myItems, slotsLeft])

  const editingItem = useMemo(
    () => (editingId === null ? null : (myItems.find((item) => item.id === editingId) ?? null)),
    [editingId, myItems],
  )

  const hasUnsavedEdit = useMemo(() => {
    if (!editingItem || !canSaveEdit) return false
    const protein = isAlcoholMeal ? 0 : Number(editProtein)
    return (
      editName.trim() !== editingItem.name ||
      parseInt(editKcal, 10) !== editingItem.kcal ||
      Math.round(protein * 10) !== Math.round(editingItem.protein * 10)
    )
  }, [canSaveEdit, editKcal, editName, editProtein, editingItem, isAlcoholMeal])

  const showSaveAndBack = sessionChanged || hasUnsavedEdit

  const backButtonClass = showSaveAndBack
    ? `${primaryActionClass} inline-flex w-fit items-center gap-1 rounded-full px-4 py-2.5`
    : PILL_BACK_CLASS

  const toggleCatalogSelection = (id: number) => {
    const item = catalogItems.find((entry) => entry.id === id)
    if (!item) return
    if (isNameTaken(item.name)) return

    setSelectedCatalogIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveCatalogSelection = async () => {
    if (saving || selectedCatalogIds.size === 0) return

    const taken = new Set(savedNames)
    const toSave: FoodItem[] = []
    for (const id of selectedCatalogIds) {
      const item = catalogItems.find((entry) => entry.id === id)
      if (!item) continue
      const nameKey = normalizeName(item.name)
      if (taken.has(nameKey)) continue
      taken.add(nameKey)
      toSave.push(item)
    }

    if (toSave.length === 0) {
      setSelectedCatalogIds(new Set())
      setPanel('main')
      return
    }

    if (toSave.length > slotsLeft) {
      setErrorMessage(`Nur noch ${slotsLeft} Plätze frei – bitte Auswahl kürzen.`)
      return
    }

    setSaving(true)
    setErrorMessage('')

    let savedCount = 0
    for (const item of toSave) {
      const { error } = await insertIndivFoodItem({
        mealType,
        name: item.name,
        kcal: item.kcal,
        protein: item.protein,
        sourceFoodItemId: item.id,
      })
      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        await reload()
        return
      }
      savedCount += 1
    }

    setSelectedCatalogIds(new Set())
    setPanel('main')
    setSaving(false)
    setMessage(savedCount === 1 ? 'Gericht gespeichert.' : `${savedCount} Gerichte gespeichert.`)
    markSessionChanged()
    await reload()
    notifyIndivFoodListChanged()
  }

  const handleAdoptCustom = async () => {
    const name = customName.trim()
    const kcal = parseInt(customKcal, 10)
    const protein = isAlcoholMeal ? 0 : Number(customProtein)
    if (!name) {
      setErrorMessage('Bitte einen Namen eingeben.')
      return
    }
    if (isNameTaken(name)) {
      setErrorMessage('Dieser Name ist bereits in deiner Liste.')
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
    if (slotsLeft <= 0) {
      setErrorMessage(`Maximal ${MAX_INDIV_FOOD_ITEMS_PER_MEAL} Einträge.`)
      return
    }

    setSaving(true)
    setErrorMessage('')
    const { error } = await insertIndivFoodItem({
      mealType,
      name,
      kcal,
      protein: Number.isFinite(protein) ? protein : 0,
    })
    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      await reload()
      return
    }

    setCustomName('')
    setCustomKcal('')
    setCustomProtein('')
    setMessage('Gericht gespeichert.')
    markSessionChanged()
    await reload()
    notifyIndivFoodListChanged()
  }

  const handleSaveEdit = async (): Promise<boolean> => {
    if (editingId === null || !canSaveEdit) return false
    const kcal = parseInt(editKcal, 10)
    const protein = isAlcoholMeal ? 0 : Number(editProtein)

    setSaving(true)
    setErrorMessage('')
    const { error } = await updateIndivFoodItem({
      id: editingId,
      mealType,
      name: editName.trim(),
      kcal,
      protein: Number.isFinite(protein) ? protein : 0,
    })
    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return false
    }

    clearEdit()
    setMessage('Änderung gespeichert.')
    markSessionChanged()
    await reload()
    notifyIndivFoodListChanged()
    return true
  }

  const handleBackToGenau = async () => {
    if (saving) return
    if (hasUnsavedEdit && editingId !== null) {
      const saved = await handleSaveEdit()
      if (!saved) return
    }
    if (showSaveAndBack && myItems.length > 0) {
      setSaving(true)
      const { error } = await compactIndivFoodOrderForMeal(mealType)
      setSaving(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      notifyIndivFoodListChanged()
    }
    router.push(backToGenau)
  }

  const handleRemove = async (id: number) => {
    if (saving) return
    if (editingId === id) clearEdit()
    setSaving(true)
    const { error } = await deleteIndivFoodItem(id)
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setMessage('Eintrag entfernt.')
    markSessionChanged()
    await compactIndivFoodOrderForMeal(mealType)
    await reload()
    notifyIndivFoodListChanged()
  }

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= myItems.length) return
    const next = [...myItems]
    const [removed] = next.splice(index, 1)
    next.splice(target, 0, removed!)
    setMyItems(next)
    setSaving(true)
    const { error } = await reorderIndivFoodItems(next.map((item) => item.id))
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      await reload()
      return
    }
    setMessage('')
    markSessionChanged()
    notifyIndivFoodListChanged()
  }

  const handleDeleteAll = async () => {
    if (saving || myItems.length === 0) return
    if (!window.confirm('Alle eigenen Standard-Gerichte für diesen Bereich wirklich löschen?')) return
    setSaving(true)
    const { error } = await deleteAllIndivFoodItemsForMeal(mealType)
    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setPanel('main')
    setMessage('Liste gelöscht.')
    markSessionChanged()
    await reload()
    notifyIndivFoodListChanged()
  }

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <div className="mb-6">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleBackToGenau()}
            className={backButtonClass}
          >
            <span aria-hidden>←</span>
            {showSaveAndBack ? 'Speichern und zurück' : 'Zurück zu Genau'}
          </button>
        </div>

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Eigene Standard-Gerichte und Getränke hinterlegen
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {meal.label} · max. {MAX_INDIV_FOOD_ITEMS_PER_MEAL} Einträge
            {slotsLeft < MAX_INDIV_FOOD_ITEMS_PER_MEAL ? ` · noch ${slotsLeft} frei` : ''}
          </p>
        </header>

        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Wird geladen …</p> : null}

        {errorMessage ? (
          <p className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            {message}
          </p>
        ) : null}

        {panel === 'catalog' ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Auswahl</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tippe die Gerichte an und übernimm sie – sie werden sofort in deiner Liste gespeichert.
            </p>
            {catalogItems.length === 0 ? (
              <p className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-3 py-3 text-sm text-amber-950 dark:border-yellow-700 dark:bg-yellow-950/25 dark:text-yellow-100">
                Für diesen Bereich sind keine Katalog-Gerichte hinterlegt.
              </p>
            ) : (
              catalogItems.map((item) => {
                const taken = isNameTaken(item.name)
                const selected = selectedCatalogIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving || (taken && !selected)}
                    onClick={() => toggleCatalogSelection(item.id)}
                    className={`lifexp-pressable-3d flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3 py-3 text-left disabled:opacity-50 ${
                      selected
                        ? selectedClass
                        : 'border-stone-400 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-300/80 dark:border-stone-600 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.kcal} kcal
                        {!isAlcoholMeal ? ` · ${Math.round(item.protein)} g Protein` : ''}
                        {taken ? ' · bereits in Liste' : ''}
                      </p>
                    </div>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                        selected ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700 dark:bg-stone-600 dark:text-stone-100'
                      }`}
                      aria-hidden
                    >
                      {selected ? '✓' : '+'}
                    </span>
                  </button>
                )
              })
            )}
            <button
              type="button"
              disabled={saving || selectedCatalogIds.size === 0}
              onClick={() => void saveCatalogSelection()}
              className={primaryActionClass}
            >
              Übernehmen
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCatalogIds(new Set())
                setPanel('main')
              }}
              className="lifexp-pressable-3d rounded-2xl border-2 border-stone-400 bg-stone-100 px-4 py-3 text-sm font-bold text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              Zurück
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border-2 border-emerald-300/80 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/25">
              {myItems.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Noch nichts gespeichert – unten Auswahl oder eigenes Gericht hinzufügen. Reihenfolge und Inhalt
                  bleiben in deinem Profil gespeichert.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {myItems.map((item, index) => (
                    <li key={item.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-900/85">
                        <span
                          className="w-4 shrink-0 text-center text-[10px] font-bold tabular-nums leading-none text-emerald-800/70 dark:text-emerald-300/80"
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.kcal} kcal
                            {!isAlcoholMeal ? ` · ${Math.round(item.protein)} g Protein` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => (editingId === item.id ? clearEdit() : startEdit(item))}
                            className="lifexp-pressable-3d flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-xs font-bold text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                            aria-label={`${item.name} bearbeiten`}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            disabled={saving || index === 0}
                            onClick={() => void moveItem(index, -1)}
                            className="lifexp-pressable-3d flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-xs font-bold text-stone-700 disabled:opacity-35 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                            aria-label={`${item.name} nach oben`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={saving || index === myItems.length - 1}
                            onClick={() => void moveItem(index, 1)}
                            className="lifexp-pressable-3d flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-xs font-bold text-stone-700 disabled:opacity-35 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                            aria-label={`${item.name} nach unten`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleRemove(item.id)}
                            className="lifexp-pressable-3d flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-lg font-black leading-none text-red-700 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200"
                            aria-label={`${item.name} entfernen`}
                          >
                            −
                          </button>
                        </div>
                      </div>
                      {editingId === item.id ? (
                        <div className="rounded-xl border-2 border-slate-300/90 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/90">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Name
                            <input
                              {...oneLineTextInputProps('lifexp-food-edit-name')}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </label>
                          <div className={`mt-2 grid gap-2 ${isAlcoholMeal ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              kcal
                              <input
                                {...integerInputProps('lifexp-food-edit-kcal')}
                                value={editKcal}
                                onChange={(e) => setEditKcal(e.target.value.replace(/\D/g, ''))}
                                className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </label>
                            {!isAlcoholMeal ? (
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Protein (g)
                                <input
                                  {...decimalInputProps('lifexp-food-edit-protein')}
                                  value={editProtein}
                                  onChange={(e) => setEditProtein(e.target.value)}
                                  className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                />
                              </label>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            disabled={saving || !canSaveEdit}
                            onClick={() => void handleSaveEdit()}
                            className={`${primaryActionClass} mt-3 w-full`}
                          >
                            Speichern
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPanel('catalog')}
                disabled={saving || slotsLeft === 0}
                className={`lifexp-pressable-3d w-full rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold disabled:opacity-50 ${myItems.length === 0 ? pendingHighlightClass : 'border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-slate-800 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100'}`}
              >
                Auswahl
              </button>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                eigenes Gericht / Getränk
              </p>
            </div>

            <section className="mt-2 rounded-2xl border-2 border-slate-300/90 bg-white p-4 dark:border-slate-600 dark:bg-slate-900/90">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Name
                <input
                  {...oneLineTextInputProps('lifexp-food-name')}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="z. B. Haferflocken mit Beeren"
                />
              </label>
              <div className={`mt-3 grid gap-3 ${isAlcoholMeal ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  kcal
                  <input
                    {...integerInputProps('lifexp-food-kcal')}
                    pattern="[0-9]*"
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value.replace(/\D/g, ''))}
                    className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                {!isAlcoholMeal ? (
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Protein (g)
                    <input
                      {...decimalInputProps('lifexp-food-protein')}
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                      className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base font-bold tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                ) : null}
              </div>
              <button
                type="button"
                disabled={saving || !canAdoptCustom}
                onClick={() => void handleAdoptCustom()}
                className={`${primaryActionClass} mt-4 w-full`}
              >
                Übernehmen
              </button>
            </section>

            {myItems.length > 0 ? (
              <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDeleteAll()}
                  className="lifexp-pressable-3d w-full rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                >
                  Liste löschen
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

export default function NutritionIndivFoodPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-500">Wird geladen …</p>}>
      <NutritionIndivFoodInner />
    </Suspense>
  )
}
