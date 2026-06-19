import { fetchStandardMealsMissingIndivList } from './foodItemsIndiv'
import { bewegungTrainingButtonCopy, STANDARD_TRAINING_CHOICES } from './movementTraining'
import {
  getDailyKnowledgeQuestions,
  getKnowledgeAnswerResults,
  type KnowledgeRoundQuestion,
} from './knowledgeRound'
import {
  ALCOHOL_MEAL,
  entriesForMeal,
  ernaehrungOverviewHref,
  fetchNutritionRule,
  fetchTodayMealEntries,
  MEAL_OPTIONS,
  mealOptionForType,
  mealTypeToDb,
  MEAL_XP,
  NUTRITION_COMPLETION_SOURCE,
  NUTRITION_PROTEIN_GOAL,
  nutritionTotalsForOverview,
  type MealType,
  type StandardMealType,
} from './nutrition'
import { PLUS_XP_GLAUBENSSATZ_MAX } from './plusXpBudget'
import { DEFAULT_PRIMARY_GOAL, type PrimaryGoal } from './goals'
import { yesterdayEntryHomeHref } from './activeEventDate'
import { cetYesterday } from './cetDate'
import { fetchCurrentProfile, isAlcoholTrackingEnabled } from './profile'
import { fetchKnowledgeQuestions } from './supabase'
import { fetchOpenPlannerTasksForToday, type PlannerTask } from './tasks'
import { isZielvorgabenCompleteFromSettings } from './zielvorgaben'
import {
  fetchHasEventForCategorySourceOnDate,
  fetchLatestTodaySelection,
  fetchTodayHasEventForCategorySource,
  fetchTodayQuizAnswerResults,
  fetchTodayXpByCategory,
  fetchTodayXpForCategory,
  type QuizAnswerStatus,
  type TodayXpByCategory,
} from './xpEvents'
import { XP_TARGETS } from './xpDisplay'

export type WasJetztTunPriority = 1 | '1a'

export type WasJetztTunStep = {
  id: string
  title: string
  subtitle: string
  emoji: string
  href: string
  /** z. B. „1 bis 10 Trainings-XP“ — grün in der UI */
  xpHint?: string
  /** 1a = Streak (Tagesübersicht / Wissen), blockiert Prio 1 bis erledigt. */
  priority?: WasJetztTunPriority
}

export type WasJetztTunState = {
  suggestedSteps: WasJetztTunStep[]
  error: Error | null
}

type WasJetztTunBuildInput = {
  hasLoginEvent: boolean
  zielvorgabenComplete: boolean
  sleep: boolean
  sunAir: boolean
  wellbeing: boolean
  arbeit: boolean
  training: boolean
  schritte: boolean
  schritteSelectedXp: number | null
  motivation: boolean
  glaubenssatz: boolean
  showGlaubenssatz: boolean
  mealsDone: Set<MealType>
  trackAlcoholMeal: boolean
  proteinTotal: number
  proteinGoal: number
  /** Gestern „Abschliessen für heute“ (nutrition_completion) noch offen. */
  suggestYesterdayNutritionClose: boolean
  dailyQuestions: KnowledgeRoundQuestion[]
  quizResults: Record<string, QuizAnswerStatus>
  goal: PrimaryGoal
  openTasks: PlannerTask[]
  mealsMissingIndivList: StandardMealType[]
  /** Heutige Trainings-XP (Tagesziel: 15). */
  movementXpToday: number
  /** Hinweis: erste Aufgabe im Aufgabenplaner anlegen. */
  suggestCreateTaskHint: boolean
}

const SCHritte_WALK_SUBTITLE =
  '15min spazierengehen um die Anzahl der Schritte zu erhöhen'
const PROTEIN_SHAKE_SUBTITLE = 'Trinke einen Proteinshake um deine Bilanz zu verbessern'
const MAIN_MEAL_HEALTHY_SUBTITLE =
  'Ernähre dich gesund und proteinreich, dann trage den Stand ein'
const ALCOHOL_WJT_SUBTITLE =
  'Trinke nichts oder wenig und trage den tatsächlichen Stand heute oder morgen ein (wichtig)'

const MAIN_MEAL_TYPES: StandardMealType[] = ['Frühstück', 'Mittagessen', 'Abendessen']

const MEAL_WJT_XP_HINT = `${MEAL_XP} Ernährungs-XP + Bewertung`

const INDIV_FOOD_SETUP_SUBTITLE =
  'Erfasse deine individuellen Standard-Gerichte oder Getränke'

const CREATE_TASK_HINT_TOTAL_XP_MAX = 40
const CREATE_TASK_HINT_TODAY_XP_MAX = 10
/** Zusätzlich zu total_xp < 40: gelegentlich bei wenig Tages-XP. */
const CREATE_TASK_HINT_RANDOM_CHANCE = 0.5

const CREATE_TASK_HINT_SUBTITLE =
  'Erstelle dir eine Aufgabe „kaufe proteinreiche Produkte" (wie Proteinmilch) z.B. mit 2 Plus-XP, erledige diese und hake die Aufgabe ab um Plus-XP zu erhalten'

const MOVEMENT_KCAL_LIMIT_SUBTITLE =
  'Training und Bewegung erhöhen dein Kalorienlimit'

function ernaehrungGenauHref(mealType: StandardMealType): string {
  return `/ernaehrung/genau?meal=${encodeURIComponent(mealTypeToDb(mealType))}`
}
const YESTERDAY_CLOSE_SUBTITLE =
  'Gestern fehlt noch „Abschliessen für heute“ — starte mit den Gestern-Daten'

/** 8.000+-Stufe vergibt 10 Trainings-XP — darunter gilt „unter 8.000“. */
const SCHritte_8000_TIER_XP = 10

function xpRangeHint(min: number, max: number, categoryLabel: string): string {
  if (min === max) return `${max} ${categoryLabel}`
  return `${min} bis ${max} ${categoryLabel}`
}

function xpRangeFromChoices(choices: { xp: number }[], categoryLabel: string): string {
  const amounts = choices.map((choice) => choice.xp)
  return xpRangeHint(Math.min(...amounts), Math.max(...amounts), categoryLabel)
}

function sumTodayXp(xp: TodayXpByCategory): number {
  return xp.bewegung + xp.ernaehrung + xp.wissen + xp.meinTag + xp.plus
}

/** Frühe Nutzer (Gesamt-XP) oder gelegentlich bei wenig Tages-XP. */
export function shouldSuggestCreateTaskHint(
  totalXp: number,
  todayTotalXp: number,
  randomRoll: number,
): boolean {
  if (totalXp < CREATE_TASK_HINT_TOTAL_XP_MAX) return true
  if (todayTotalXp < CREATE_TASK_HINT_TODAY_XP_MAX && randomRoll < CREATE_TASK_HINT_RANDOM_CHANCE) {
    return true
  }
  return false
}

function firstUnansweredWissenSlot(
  questions: KnowledgeRoundQuestion[],
  quizResults: Record<string, QuizAnswerStatus>,
): number | null {
  const local = getKnowledgeAnswerResults()
  for (let slot = 0; slot < questions.length; slot += 1) {
    const key = questions[slot]?.key
    if (!key) continue
    if (!quizResults[key] && !local[key]) return slot
  }
  return null
}

function firstOpenMainMeal(mealsDone: Set<MealType>): StandardMealType | null {
  for (const mealType of MAIN_MEAL_TYPES) {
    if (!mealsDone.has(mealType)) return mealType
  }
  return null
}

function isStreakComplete(input: WasJetztTunBuildInput): boolean {
  if (!input.hasLoginEvent) return false
  return firstUnansweredWissenSlot(input.dailyQuestions, input.quizResults) === null
}

/** Streak 1 (Tagesübersicht) / Streak 2 (Wissen) — intern Prio 1a. */
function buildStreakPoolItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  if (!input.hasLoginEvent) {
    return [
      {
        id: 'login',
        title: 'Tagesübersicht',
        subtitle: 'Mit dem Tag starten — Bin dabei!',
        emoji: '🌅',
        href: '/xp',
        xpHint: '2 Plus-XP',
        priority: '1a',
      },
    ]
  }

  const wissenSlot = firstUnansweredWissenSlot(input.dailyQuestions, input.quizResults)
  if (wissenSlot !== null) {
    return [
      {
        id: 'wissen',
        title: 'Wissensfrage',
        subtitle: `Frage ${wissenSlot + 1} von ${input.dailyQuestions.length}`,
        emoji: '📚',
        href: `/wissen/frage?slot=${wissenSlot}`,
        xpHint: xpRangeHint(0, 5, 'Wissens-XP'),
        priority: '1a',
      },
    ]
  }

  return []
}

function buildFoundationPriorityItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  if (!isStreakComplete(input)) {
    return []
  }

  if (!input.zielvorgabenComplete) {
    return [
      {
        id: 'zielvorgaben',
        title: 'Zielvorgaben',
        subtitle: 'Persönliche Ziele festlegen',
        emoji: '🎯',
        href: '/ziele/zielvorgaben',
        priority: 1,
      },
    ]
  }

  return []
}

type WasJetztTunPoolItem = WasJetztTunStep

function buildBewegungPoolItem(input: WasJetztTunBuildInput): WasJetztTunPoolItem | null {
  const trainingCopy = bewegungTrainingButtonCopy(input.goal)

  if (!input.arbeit) {
    return {
      id: 'arbeit',
      title: 'Arbeit',
      subtitle: 'Körperliche Tätigkeit einschätzen',
      emoji: '🧰',
      href: '/bewegung/arbeit',
      xpHint: xpRangeHint(1, 10, 'Trainings-XP'),
    }
  }

  if (!input.schritte) {
    return {
      id: 'schritte',
      title: 'Schritte',
      subtitle: 'Trage deinen Zwischenstand ein',
      emoji: '🚶',
      href: '/bewegung/schritte',
      xpHint: xpRangeHint(0, 15, 'Trainings-XP'),
    }
  }

  if (!input.training) {
    return {
      id: 'training',
      title: trainingCopy.title,
      subtitle: trainingCopy.subtitle,
      emoji: '💪',
      href: '/bewegung/training',
      xpHint: xpRangeFromChoices(STANDARD_TRAINING_CHOICES, 'Trainings-XP'),
    }
  }

  return {
    id: 'schritte-boost',
    title: 'Schritte',
    subtitle: 'Erhöhe deine Schritte für heute',
    emoji: '🚶',
    href: '/bewegung/schritte',
    xpHint: xpRangeHint(0, 15, 'Trainings-XP'),
  }
}

function buildErnaehrungPoolItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  const items: WasJetztTunPoolItem[] = []

  const openMainMeal = firstOpenMainMeal(input.mealsDone)
  if (openMainMeal) {
    const meal = mealOptionForType(openMainMeal)
    items.push({
      id: `meal-${openMainMeal}`,
      title: meal.label,
      subtitle: MAIN_MEAL_HEALTHY_SUBTITLE,
      emoji: meal.emoji,
      href: ernaehrungOverviewHref(openMainMeal),
      xpHint: MEAL_WJT_XP_HINT,
      priority: 1,
    })
  }

  const proteinUnderGoal = input.proteinTotal < input.proteinGoal
  if (proteinUnderGoal && !input.mealsDone.has('Snack')) {
    const snack = mealOptionForType('Snack')
    items.push({
      id: 'meal-snack-shake',
      title: snack.label,
      subtitle: PROTEIN_SHAKE_SUBTITLE,
      emoji: snack.emoji,
      href: ernaehrungOverviewHref('Snack'),
      xpHint: MEAL_WJT_XP_HINT,
      priority: 1,
    })
  } else if (!input.mealsDone.has('Snack')) {
    const snack = mealOptionForType('Snack')
    items.push({
      id: 'meal-Snack',
      title: snack.label,
      subtitle: MAIN_MEAL_HEALTHY_SUBTITLE,
      emoji: snack.emoji,
      href: ernaehrungOverviewHref('Snack'),
      xpHint: MEAL_WJT_XP_HINT,
    })
  }

  if (input.trackAlcoholMeal && !input.mealsDone.has('alcohol')) {
    items.push({
      id: 'meal-alcohol',
      title: ALCOHOL_MEAL.label,
      subtitle: ALCOHOL_WJT_SUBTITLE,
      emoji: ALCOHOL_MEAL.emoji,
      href: ernaehrungOverviewHref('alcohol'),
      xpHint: `${MEAL_XP} Ernährungs-XP`,
    })
  }

  return items
}

function buildMovementKcalLimitPoolItem(input: WasJetztTunBuildInput): WasJetztTunPoolItem | null {
  if (input.movementXpToday >= XP_TARGETS.bewegung) return null

  return {
    id: 'movement-kcal-limit',
    title: 'Training',
    subtitle: MOVEMENT_KCAL_LIMIT_SUBTITLE,
    emoji: '🏃',
    href: '/bewegung',
  }
}

function buildIndivFoodSetupPoolItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  return input.mealsMissingIndivList.map((mealType) => {
    const meal = mealOptionForType(mealType)
    return {
      id: `indiv-setup-${mealType}`,
      title: meal.label,
      subtitle: INDIV_FOOD_SETUP_SUBTITLE,
      emoji: meal.emoji,
      href: ernaehrungGenauHref(mealType),
    }
  })
}

function buildMeinTagPoolItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  const items: WasJetztTunPoolItem[] = []

  if (!input.sleep) {
    items.push({
      id: 'sleep',
      title: 'Schlaf',
      subtitle: 'Wie hast du geschlafen?',
      emoji: '😴',
      href: '/mein-tag/schlaf',
      xpHint: xpRangeHint(0, 10, 'Mein Tag-XP'),
    })
  }

  if (!input.sunAir) {
    items.push({
      id: 'sun_air',
      title: 'Sonne/frische Luft',
      subtitle: 'Etwas Freiheit',
      emoji: '☀️',
      href: '/mein-tag/sonne-frische-luft',
      xpHint: xpRangeHint(0, 5, 'Mein Tag-XP'),
    })
  }

  if (!input.wellbeing) {
    items.push({
      id: 'wellbeing',
      title: 'Befinden',
      subtitle: 'Wie geht es dir heute?',
      emoji: '🙂',
      href: '/mein-tag/befinden',
      xpHint: xpRangeHint(0, 5, 'Mein Tag-XP'),
    })
  }

  return items
}

function buildPlusPoolItems(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  const items: WasJetztTunPoolItem[] = []

  if (!input.motivation) {
    items.push({
      id: 'motivation',
      title: 'Motivation',
      subtitle: 'Dranbleiben',
      emoji: '💪',
      href: '/plus/motivation',
      xpHint: xpRangeHint(0, 2, 'Plus-XP'),
    })
  }

  if (input.showGlaubenssatz && !input.glaubenssatz) {
    items.push({
      id: 'glaubenssatz',
      title: 'Glaubenssatz',
      subtitle: 'Dein Satz für heute',
      emoji: '✨',
      href: '/plus/glaubenssatz',
      xpHint: `${PLUS_XP_GLAUBENSSATZ_MAX} Plus-XP`,
    })
  }

  for (const task of input.openTasks) {
    items.push({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: 'Aufgabe bei Plus erledigen',
      emoji: '✅',
      href: '/plus',
      xpHint: `${task.xpReward} Plus-XP`,
    })
  }

  return items
}

function upsertPoolItem(
  pool: WasJetztTunPoolItem[],
  item: WasJetztTunPoolItem,
): WasJetztTunPoolItem[] {
  const index = pool.findIndex((entry) => entry.id === item.id)
  if (index < 0) return [...pool, item]
  const next = [...pool]
  next[index] = { ...next[index], ...item }
  return next
}

function applyDynamicPriorities(
  pool: WasJetztTunPoolItem[],
  input: WasJetztTunBuildInput,
): WasJetztTunPoolItem[] {
  let next = [...pool]

  const schritteUnder8000 =
    input.schritte &&
    input.schritteSelectedXp != null &&
    input.schritteSelectedXp < SCHritte_8000_TIER_XP

  if (schritteUnder8000) {
    const schritteItem: WasJetztTunPoolItem = {
      id: 'schritte-walk',
      title: 'Schritte',
      subtitle: SCHritte_WALK_SUBTITLE,
      emoji: '🚶',
      href: '/bewegung/schritte',
      xpHint: xpRangeHint(0, 15, 'Trainings-XP'),
      priority: 1,
    }
    const existingId = next.find((entry) =>
      ['schritte', 'schritte-boost', 'schritte-walk'].includes(entry.id),
    )?.id
    if (existingId) {
      next = next.map((entry) =>
        entry.id === existingId
          ? {
              ...entry,
              priority: 1,
              subtitle: SCHritte_WALK_SUBTITLE,
            }
          : entry,
      )
    } else {
      next.push(schritteItem)
    }
  }

  if (input.suggestYesterdayNutritionClose) {
    next = upsertPoolItem(next, {
      id: 'yesterday-nutrition-close',
      title: 'Gestern abschliessen',
      subtitle: YESTERDAY_CLOSE_SUBTITLE,
      emoji: '📅',
      href: yesterdayEntryHomeHref(),
      xpHint: 'Ernährungs-XP für gestern',
      priority: 1,
    })
  }

  if (input.suggestCreateTaskHint) {
    next = upsertPoolItem(next, {
      id: 'plus-create-task-hint',
      title: 'Aufgabe anlegen',
      subtitle: CREATE_TASK_HINT_SUBTITLE,
      emoji: '✅',
      href: '/plus/aufgabenplaner/heute',
      xpHint: '2 Plus-XP',
      priority: 1,
    })
  }

  return next
}

/** Interne Tabelle aller noch offenen Aktionen (Vorrat). */
export function buildWasJetztTunPool(input: WasJetztTunBuildInput): WasJetztTunPoolItem[] {
  const pool: WasJetztTunPoolItem[] = [
    ...buildStreakPoolItems(input),
    ...buildFoundationPriorityItems(input),
  ]

  const bewegung = buildBewegungPoolItem(input)
  if (bewegung) pool.push(bewegung)

  pool.push(...buildErnaehrungPoolItems(input))
  pool.push(...buildIndivFoodSetupPoolItems(input))

  const movementKcalLimit = buildMovementKcalLimitPoolItem(input)
  if (movementKcalLimit) pool.push(movementKcalLimit)

  pool.push(...buildMeinTagPoolItems(input))
  pool.push(...buildPlusPoolItems(input))

  return applyDynamicPriorities(pool, input)
}

function shuffleSteps(steps: WasJetztTunPoolItem[]): WasJetztTunPoolItem[] {
  const copy = [...steps]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function pickRandomFromPool(
  pool: WasJetztTunPoolItem[],
  count: number,
  excludeIds: Set<string>,
): WasJetztTunPoolItem[] {
  const candidates = pool.filter((step) => !excludeIds.has(step.id))
  return shuffleSteps(candidates).slice(0, count)
}

/** Prio 1a (Streak) zuerst — blockiert Prio 1. Danach Prio 1, sonst 3 zufällige. */
export function pickWasJetztTunSuggestions(pool: WasJetztTunPoolItem[]): WasJetztTunStep[] {
  const streakItems = pool.filter((step) => step.priority === '1a')
  if (streakItems.length > 0) {
    const topStreak = shuffleSteps(streakItems)[0]
    const regularItems = pool.filter((step) => step.priority !== 1 && step.priority !== '1a')
    const filler = pickRandomFromPool(regularItems, 2, new Set([topStreak.id]))
    return [topStreak, ...filler].slice(0, 3)
  }

  const prioItems = pool.filter((step) => step.priority === 1)
  const regularItems = pool.filter((step) => step.priority !== 1 && step.priority !== '1a')

  if (prioItems.length === 0) {
    return shuffleSteps(pool).slice(0, 3)
  }

  const shuffledPrio = shuffleSteps(prioItems)
  const topPrio = shuffledPrio[0]
  const otherPrio = shuffledPrio.slice(1)
  const selected: WasJetztTunPoolItem[] = [topPrio, ...otherPrio]
  const excludeIds = new Set(selected.map((step) => step.id))
  const remaining = Math.max(0, 3 - selected.length)
  const filler = pickRandomFromPool(regularItems, remaining, excludeIds)

  return [...selected, ...filler].slice(0, 3)
}

export async function fetchWasJetztTunState(): Promise<WasJetztTunState> {
  const [
    { hasEvent: hasLoginEvent, error: loginError },
    sleepEvent,
    sunAirEvent,
    wellbeingEvent,
    arbeitEvent,
    trainingEvent,
    schritteEvent,
    schritteSelection,
    motivationEvent,
    glaubenssatzEvent,
    { settings, error: profileError },
    { entries: mealEntries, error: mealError },
    { rows: knowledgeRows, error: knowledgeError },
    { results: quizResults, error: quizError },
    { tasks: openTasks, error: tasksError },
    { meals: mealsMissingIndivList, error: indivListError },
    { xp: movementXpToday, error: movementXpError },
    { xp: todayXpByCategory, error: todayXpError },
  ] = await Promise.all([
    fetchTodayHasEventForCategorySource({ category: 'plus', source: 'login' }),
    fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'sleep' }),
    fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'sun_air' }),
    fetchTodayHasEventForCategorySource({ category: 'mein_tag', source: 'wellbeing' }),
    fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'arbeit' }),
    fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'training' }),
    fetchTodayHasEventForCategorySource({ category: 'bewegung', source: 'schritte' }),
    fetchLatestTodaySelection({ category: 'bewegung', source: 'schritte' }),
    fetchTodayHasEventForCategorySource({ category: 'plus', source: 'motivation' }),
    fetchTodayHasEventForCategorySource({ category: 'plus', source: 'glaubenssatz' }),
    fetchCurrentProfile(),
    fetchTodayMealEntries(),
    fetchKnowledgeQuestions(20),
    fetchTodayQuizAnswerResults(),
    fetchOpenPlannerTasksForToday(),
    fetchStandardMealsMissingIndivList(),
    fetchTodayXpForCategory('bewegung'),
    fetchTodayXpByCategory(),
  ])

  const { rule: nutritionRule, error: nutritionRuleError } = profileError
    ? { rule: null, error: null }
    : await fetchNutritionRule(settings).then((result) => ({
        rule: result.rule,
        error: result.error,
      }))

  const error =
    loginError ??
    sleepEvent.error ??
    sunAirEvent.error ??
    wellbeingEvent.error ??
    arbeitEvent.error ??
    trainingEvent.error ??
    schritteEvent.error ??
    schritteSelection.error ??
    motivationEvent.error ??
    glaubenssatzEvent.error ??
    profileError ??
    mealError ??
    knowledgeError ??
    quizError ??
    tasksError ??
    nutritionRuleError ??
    indivListError ??
    movementXpError ??
    todayXpError ??
    null

  const mealsDone = new Set<MealType>()
  for (const meal of MEAL_OPTIONS) {
    if (entriesForMeal(mealEntries, meal.type).length > 0) {
      mealsDone.add(meal.type)
    }
  }
  if (entriesForMeal(mealEntries, 'alcohol').length > 0) {
    mealsDone.add('alcohol')
  }

  const nutritionTotals = nutritionTotalsForOverview(mealEntries)
  const proteinGoal =
    nutritionRule?.protOpt && nutritionRule.protOpt > 0
      ? nutritionRule.protOpt
      : NUTRITION_PROTEIN_GOAL

  const trackAlcoholMeal = !profileError && isAlcoholTrackingEnabled(settings.alcoholMode)
  const dailyQuestions = getDailyKnowledgeQuestions(knowledgeRows)
  const goal = profileError ? DEFAULT_PRIMARY_GOAL : settings.goalType
  const zielvorgabenComplete = profileError
    ? false
    : isZielvorgabenCompleteFromSettings(settings)
  const yesterday = cetYesterday()
  const challengeDay = profileError ? 0 : settings.challengeDay
  const canCheckYesterday =
    !profileError && challengeDay > 1 && settings.startDate <= yesterday

  let suggestYesterdayNutritionClose = false
  if (canCheckYesterday) {
    const { hasEvent, error: yesterdayCloseError } = await fetchHasEventForCategorySourceOnDate({
      category: 'ernaehrung',
      source: NUTRITION_COMPLETION_SOURCE,
      eventDate: yesterday,
    })
    if (yesterdayCloseError) {
      return { suggestedSteps: [], error: yesterdayCloseError }
    }
    suggestYesterdayNutritionClose = !hasEvent
  }

  const totalXp = profileError ? 0 : settings.totalXp
  const todayTotalXp = sumTodayXp(todayXpByCategory)
  const streakComplete =
    hasLoginEvent && firstUnansweredWissenSlot(dailyQuestions, quizResults) === null
  const suggestCreateTaskHint =
    streakComplete &&
    openTasks.length === 0 &&
    shouldSuggestCreateTaskHint(totalXp, todayTotalXp, Math.random())

  const buildInput: WasJetztTunBuildInput = {
    hasLoginEvent,
    zielvorgabenComplete,
    sleep: sleepEvent.hasEvent,
    sunAir: sunAirEvent.hasEvent,
    wellbeing: wellbeingEvent.hasEvent,
    arbeit: arbeitEvent.hasEvent,
    training: trainingEvent.hasEvent,
    schritte: schritteEvent.hasEvent,
    schritteSelectedXp: schritteSelection.selection?.selectedXp ?? null,
    motivation: motivationEvent.hasEvent,
    glaubenssatz: glaubenssatzEvent.hasEvent,
    showGlaubenssatz: !profileError && settings.motivationMode === true,
    mealsDone,
    trackAlcoholMeal,
    proteinTotal: Math.round(nutritionTotals.protein),
    proteinGoal,
    suggestYesterdayNutritionClose,
    dailyQuestions,
    quizResults,
    goal,
    openTasks,
    mealsMissingIndivList,
    movementXpToday,
    suggestCreateTaskHint,
  }

  const pool = buildWasJetztTunPool(buildInput)
  const suggestedSteps = pickWasJetztTunSuggestions(pool)

  return { suggestedSteps, error }
}
