import type {
  NutritionCompletionResult,
  NutritionKcalBand,
  NutritionProteinBand,
  NutritionRule,
} from './nutrition'
import {
  isNutritionRuleUsable,
  resolveNutritionKcalBandWithMovement,
  resolveNutritionProteinBand,
} from './nutrition'

export type NutritionKcalBandRow = {
  band: NutritionKcalBand
  label: string
  xp: number
  active: boolean
  shiftedByMovement?: boolean
}

export type NutritionProteinBandRow = {
  band: NutritionProteinBand
  label: string
  xp: number
  active: boolean
}

function formatKcal(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('de-DE')
}

function formatProtein(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('de-DE')
}

function formatXp(value: number): string {
  const amount = Math.floor(value)
  return amount >= 0 ? `+${amount}` : `${amount}`
}

/** XP-Anzeige: negativ rot (schlecht), positiv grün, null neutral. */
export function nutritionXpToneClass(xp: number): string {
  if (xp < 0) return 'text-red-600 dark:text-red-400'
  if (xp > 0) return 'text-emerald-700 dark:text-emerald-400'
  return 'text-slate-600 dark:text-slate-400'
}

export function formatSignedXp(value: number): string {
  return formatXp(value)
}

/** Zeilen für die kcal-Bewertung — Grenzwert-Texte roh; Zone via effektive kcal (minus Bewegungs-Bonus). */
export function buildNutritionKcalBandRows(
  rule: NutritionRule | null,
  currentKcal: number,
  movementXp = 0,
): NutritionKcalBandRow[] {
  if (!isNutritionRuleUsable(rule)) return []

  const { band: activeBand, shiftedByMovement } = resolveNutritionKcalBandWithMovement(
    currentKcal,
    rule,
    movementXp,
  )

  return [
    {
      band: 'low',
      label: `< ${formatKcal(rule.kcalLow)} kcal`,
      xp: rule.xpKcalLow,
      active: activeBand === 'low',
      shiftedByMovement: activeBand === 'low' && shiftedByMovement,
    },
    {
      band: 'min',
      label: `${formatKcal(rule.kcalLow)} – ${formatKcal(rule.kcalMin)} kcal`,
      xp: rule.xpKcalMin,
      active: activeBand === 'min',
      shiftedByMovement: activeBand === 'min' && shiftedByMovement,
    },
    {
      band: 'opt',
      label: `${formatKcal(rule.kcalMin)} – ${formatKcal(rule.kcalOpt)} kcal`,
      xp: rule.xpKcalOpt,
      active: activeBand === 'opt',
      shiftedByMovement: activeBand === 'opt' && shiftedByMovement,
    },
    {
      band: 'high',
      label: `${formatKcal(rule.kcalOpt)} – ${formatKcal(rule.kcalHigh)} kcal`,
      xp: rule.xpKcalHigh,
      active: activeBand === 'high',
      shiftedByMovement: activeBand === 'high' && shiftedByMovement,
    },
    {
      band: 'ext',
      label: `${formatKcal(rule.kcalHigh)} – ${formatKcal(rule.kcalExt)} kcal`,
      xp: rule.xpKcalExt,
      active: activeBand === 'ext',
      shiftedByMovement: activeBand === 'ext' && shiftedByMovement,
    },
    {
      band: 'high_plus',
      label: `> ${formatKcal(rule.kcalExt)} kcal`,
      xp: rule.xpHighPlus,
      active: activeBand === 'high_plus',
      shiftedByMovement: activeBand === 'high_plus' && shiftedByMovement,
    },
  ]
}

/** Zeilen für die Protein-Bewertung aus nutrition_rules. */
export function buildNutritionProteinBandRows(
  rule: NutritionRule | null,
  currentProtein: number,
): NutritionProteinBandRow[] {
  if (!isNutritionRuleUsable(rule)) return []

  const activeBand = resolveNutritionProteinBand(currentProtein, rule).band

  return [
    {
      band: 'low',
      label: `< ${formatProtein(rule.protLow)} g`,
      xp: rule.xpProtLow,
      active: activeBand === 'low',
    },
    {
      band: 'min',
      label: `${formatProtein(rule.protLow)} – ${formatProtein(rule.protMin)} g`,
      xp: rule.xpProtMin,
      active: activeBand === 'min',
    },
    {
      band: 'opt',
      label: `${formatProtein(rule.protMin)} – ${formatProtein(rule.protOpt)} g`,
      xp: rule.xpProtOpt,
      active: activeBand === 'opt',
    },
    {
      band: 'ext',
      label: `${formatProtein(rule.protOpt)} – ${formatProtein(rule.protExt)} g`,
      xp: rule.xpProtExt,
      active: activeBand === 'ext',
    },
    {
      band: 'plus',
      label: `> ${formatProtein(rule.protExt)} g`,
      xp: rule.xpProtPlus,
      active: activeBand === 'plus',
    },
  ]
}

export function formatNutritionBandXp(xp: number): string {
  return `${formatXp(xp)} XP`
}

export function nutritionCompletionXpLabel(completion: NutritionCompletionResult | null): string {
  if (!completion) return '–'
  return formatNutritionBandXp(completion.totalXp)
}
