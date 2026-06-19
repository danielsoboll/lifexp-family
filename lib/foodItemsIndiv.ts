import {
  mealTypeFromDb,
  mealTypeToDb,
  MEAL_OPTIONS,
  type FoodItem,
  type MealType,
  type MealTypeDb,
  type StandardMealType,
} from './nutrition'
import { getActiveUserId } from './user'
import { supabase } from './supabase'

export type { MealTypeDb } from './nutrition'
export { mealTypeFromDb, mealTypeToDb }

/** Positive IDs in der UI: Katalog. Ab diesem Offset: food_items_indiv. */
export const INDIV_FOOD_ID_OFFSET = 2_000_000_000

export const MAX_INDIV_FOOD_ITEMS_PER_MEAL = 20

export const INDIV_FOOD_LIST_CHANGED_EVENT = 'lifexp-indiv-food-list-changed'

export function notifyIndivFoodListChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(INDIV_FOOD_LIST_CHANGED_EVENT))
}

const MEAL_TYPE_DB_VALUES: MealTypeDb[] = ['breakfast', 'lunch', 'dinner', 'snack', 'alcohol']

export type IndivFoodItem = {
  id: number
  mealType: MealTypeDb
  name: string
  kcal: number
  protein: number
  orderNo: number
  sourceFoodItemId: number | null
}

type IndivFoodRow = Record<string, unknown>

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function activeUserId(): string | null {
  return getActiveUserId()
}

export function isIndivFoodItemId(id: number): boolean {
  return id >= INDIV_FOOD_ID_OFFSET
}

export function indivFoodItemId(indivRowId: number): number {
  return INDIV_FOOD_ID_OFFSET + indivRowId
}

export function indivRowIdFromFoodItemId(id: number): number {
  return id - INDIV_FOOD_ID_OFFSET
}

function rowFromIndiv(row: IndivFoodRow): IndivFoodItem {
  const mealTypeRaw = textValue(row.meal_type).toLowerCase() as MealTypeDb
  const mealType = MEAL_TYPE_DB_VALUES.includes(mealTypeRaw) ? mealTypeRaw : 'breakfast'
  return {
    id: Math.floor(numberValue(row.id)),
    mealType,
    name: textValue(row.name) || 'Gericht',
    kcal: Math.max(0, Math.floor(numberValue(row.kcal))),
    protein: Math.max(0, numberValue(row.protein)),
    orderNo: Math.max(0, Math.floor(numberValue(row.order_no))),
    sourceFoodItemId: null,
  }
}

export function indivFoodItemToFoodItem(item: IndivFoodItem): FoodItem {
  return {
    id: indivFoodItemId(item.id),
    name: item.name,
    mealType: item.mealType,
    portionLabel: '1 Portion',
    kcal: item.kcal,
    protein: item.protein,
  }
}

export async function fetchIndivFoodItemsForMeal(
  mealType: MealType,
): Promise<{ items: IndivFoodItem[]; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { items: [], error: null }

  const mealTypeDb = mealTypeToDb(mealType)
  const { data, error } = await supabase
    .from('food_items_indiv')
    .select('id,meal_type,name,kcal,protein,order_no')
    .eq('user_id', userId)
    .eq('meal_type', mealTypeDb)
    .order('order_no', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    return { items: [], error: new Error(error.message) }
  }

  return {
    items: (Array.isArray(data) ? data : []).map((row) => rowFromIndiv(row as IndivFoodRow)),
    error: null,
  }
}

export async function countIndivFoodItemsForMeal(
  mealType: MealType,
): Promise<{ count: number; error: Error | null }> {
  const { items, error } = await fetchIndivFoodItemsForMeal(mealType)
  return { count: items.length, error }
}

/** Standard-Mahlzeiten ohne mindestens einen Eintrag in food_items_indiv. */
export async function fetchStandardMealsMissingIndivList(): Promise<{
  meals: StandardMealType[]
  error: Error | null
}> {
  const results = await Promise.all(
    MEAL_OPTIONS.map(async (meal) => {
      const { count, error } = await countIndivFoodItemsForMeal(meal.type)
      return { mealType: meal.type, missing: count === 0, error }
    }),
  )

  const firstError = results.find((result) => result.error)?.error ?? null
  if (firstError) {
    return { meals: [], error: firstError }
  }

  return {
    meals: results.filter((result) => result.missing).map((result) => result.mealType),
    error: null,
  }
}

/** Legt ein Gericht in food_items_indiv an, falls noch nicht vorhanden (gleicher Name). */
export async function ensureIndivFoodItemForMeal(input: {
  mealType: MealType
  name: string
  kcal: number
  protein: number
}): Promise<{ error: Error | null }> {
  const name = input.name.trim()
  if (!name) return { error: null }

  const { items, error } = await fetchIndivFoodItemsForMeal(input.mealType)
  if (error) return { error }

  const exists = items.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())
  if (exists) return { error: null }

  const { error: insertError } = await insertIndivFoodItem({
    mealType: input.mealType,
    name,
    kcal: input.kcal,
    protein: input.protein,
  })
  if (insertError?.message.includes(String(MAX_INDIV_FOOD_ITEMS_PER_MEAL))) {
    return { error: null }
  }
  return { error: insertError }
}

async function nextOrderNo(userId: string, mealTypeDb: MealTypeDb): Promise<number> {
  const { data, error } = await supabase
    .from('food_items_indiv')
    .select('order_no')
    .eq('user_id', userId)
    .eq('meal_type', mealTypeDb)
    .order('order_no', { ascending: false })
    .limit(1)

  if (error || !data?.[0]) return 1
  return Math.floor(numberValue((data[0] as IndivFoodRow).order_no)) + 1
}

export async function insertIndivFoodItem(input: {
  mealType: MealType
  name: string
  kcal: number
  protein: number
  sourceFoodItemId?: number | null
}): Promise<{ item: IndivFoodItem | null; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { item: null, error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const mealTypeDb = mealTypeToDb(input.mealType)
  const { count, error: countError } = await countIndivFoodItemsForMeal(input.mealType)
  if (countError) return { item: null, error: countError }
  if (count >= MAX_INDIV_FOOD_ITEMS_PER_MEAL) {
    return {
      item: null,
      error: new Error(`Maximal ${MAX_INDIV_FOOD_ITEMS_PER_MEAL} Standard-Gerichte pro Bereich.`),
    }
  }

  const orderNo = await nextOrderNo(userId, mealTypeDb)
  const { data, error } = await supabase
    .from('food_items_indiv')
    .insert({
      user_id: userId,
      meal_type: mealTypeDb,
      name: input.name.trim(),
      kcal: Math.max(0, Math.floor(input.kcal)),
      protein: Math.max(0, input.protein),
      order_no: orderNo,
    })
    .select('id,meal_type,name,kcal,protein,order_no')
    .single()

  if (error) {
    return { item: null, error: new Error(error.message) }
  }

  return { item: rowFromIndiv(data as IndivFoodRow), error: null }
}

export async function updateIndivFoodItem(input: {
  id: number
  mealType: MealType
  name: string
  kcal: number
  protein: number
}): Promise<{ item: IndivFoodItem | null; error: Error | null }> {
  const userId = activeUserId()
  if (!userId) {
    return { item: null, error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }
  }

  const name = input.name.trim()
  if (!name) {
    return { item: null, error: new Error('Bitte einen Namen eingeben.') }
  }

  const mealTypeDb = mealTypeToDb(input.mealType)
  const { items, error: listError } = await fetchIndivFoodItemsForMeal(input.mealType)
  if (listError) return { item: null, error: listError }

  const nameKey = name.toLowerCase()
  const duplicate = items.some(
    (item) => item.id !== input.id && item.name.trim().toLowerCase() === nameKey,
  )
  if (duplicate) {
    return { item: null, error: new Error('Dieser Name ist bereits in deiner Liste.') }
  }

  const { data, error } = await supabase
    .from('food_items_indiv')
    .update({
      name,
      kcal: Math.max(0, Math.floor(input.kcal)),
      protein: Math.max(0, input.protein),
      meal_type: mealTypeDb,
    })
    .eq('user_id', userId)
    .eq('id', input.id)
    .select('id,meal_type,name,kcal,protein,order_no')
    .maybeSingle()

  if (error) {
    return { item: null, error: new Error(error.message) }
  }
  if (!data) {
    return { item: null, error: new Error('Eintrag nicht gefunden.') }
  }

  return { item: rowFromIndiv(data as IndivFoodRow), error: null }
}

export async function deleteIndivFoodItem(id: number): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const { error } = await supabase
    .from('food_items_indiv')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)

  return { error: error ? new Error(error.message) : null }
}

export async function deleteAllIndivFoodItemsForActiveUser(): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: null }

  const { error } = await supabase.from('food_items_indiv').delete().eq('user_id', userId)
  return { error: error ? new Error(error.message) : null }
}

export async function deleteAllIndivFoodItemsForMeal(
  mealType: MealType,
): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const { error } = await supabase
    .from('food_items_indiv')
    .delete()
    .eq('user_id', userId)
    .eq('meal_type', mealTypeToDb(mealType))

  return { error: error ? new Error(error.message) : null }
}

export async function reorderIndivFoodItems(
  orderedIds: number[],
): Promise<{ error: Error | null }> {
  const userId = activeUserId()
  if (!userId) return { error: new Error('Kein Benutzer. Bitte Onboarding abschließen.') }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('food_items_indiv')
      .update({ order_no: index + 1 })
      .eq('user_id', userId)
      .eq('id', id),
  )

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  return { error: failed?.error ? new Error(failed.error.message) : null }
}

/** order_no fortlaufend 1…n — z. B. nach Löschen oder vor Verlassen der Seite. */
export async function compactIndivFoodOrderForMeal(
  mealType: MealType,
): Promise<{ error: Error | null }> {
  const { items, error } = await fetchIndivFoodItemsForMeal(mealType)
  if (error) return { error }
  if (items.length === 0) return { error: null }
  return reorderIndivFoodItems(items.map((item) => item.id))
}
