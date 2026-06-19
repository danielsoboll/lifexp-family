/** Einheiten für Alkohol-Limits (Wert wird in profiles.alcohol_unit_* gespeichert). */
export const ALCOHOL_UNIT_OPTIONS = [
  'Liter',
  'CL (100ml)',
  'Milliliter',
  'Glas 0,02',
  'Glas 0,1L',
  'Glas 0,2L',
  'Glas 0,3L',
  'Glas/ Flasche 0,33L',
  'Glas/ Flasche 0,5L',
  'Flasche 0,7L',
  'Glas/ Flasche 1L',
] as const

export type AlcoholUnit = (typeof ALCOHOL_UNIT_OPTIONS)[number]

/** Getränkart (profiles.alcohol_type_*). */
export const ALCOHOL_DRINK_OPTIONS = [
  'Bier',
  'Sekt',
  'Rotwein',
  'Weißwein',
  'Spirituose 20%',
  'Spirituose 30%',
  'Spirituose 32%',
  'Spirituose 40%',
  'Spirituose 52%',
  'Spirituose 54%',
] as const

export type AlcoholDrink = (typeof ALCOHOL_DRINK_OPTIONS)[number]

/** Max. Menge für wenig/viel-Limits in Zielvorgaben (zwei Ziffern). */
export const ALCOHOL_LIMIT_AMOUNT_MAX = 99

export type AlcoholLimitsFormState = {
  limitLow: string
  unitLow: string
  typeLow: string
  limitHigh: string
  unitHigh: string
  typeHigh: string
}

export const EMPTY_ALCOHOL_LIMITS: AlcoholLimitsFormState = {
  limitLow: '',
  unitLow: '',
  typeLow: '',
  limitHigh: '',
  unitHigh: '',
  typeHigh: '',
}

export function alcoholLimitsFromProfile(settings: {
  alcoholLimitLow: number | null
  alcoholUnitLow: string
  alcoholTypeLow: string
  alcoholLimitHigh: number | null
  alcoholUnitHigh: string
  alcoholTypeHigh: string
}): AlcoholLimitsFormState {
  return {
    limitLow: settings.alcoholLimitLow != null ? String(settings.alcoholLimitLow) : '',
    unitLow: settings.alcoholUnitLow,
    typeLow: settings.alcoholTypeLow,
    limitHigh: settings.alcoholLimitHigh != null ? String(settings.alcoholLimitHigh) : '',
    unitHigh: settings.alcoholUnitHigh,
    typeHigh: settings.alcoholTypeHigh,
  }
}

/** z. B. „4 Glas/ Flasche 0,5L Bier“ */
export function formatAlcoholLimitDisplay(
  amount: number | null,
  unit: string,
  drinkType: string,
): string | null {
  if (amount == null || !Number.isFinite(amount) || amount < 0) return null
  const unitTrim = unit.trim()
  const drinkTrim = drinkType.trim()
  if (!unitTrim || !drinkTrim) return null
  const amountLabel = Number.isInteger(amount)
    ? String(amount)
    : String(amount).replace('.', ',')
  return `${amountLabel} ${unitTrim} ${drinkTrim}`
}

export function parseAlcoholLimitsForm(form: AlcoholLimitsFormState): {
  valid: boolean
  limits?: {
    limitLow: number
    unitLow: string
    typeLow: string
    limitHigh: number
    unitHigh: string
    typeHigh: string
  }
} {
  const limitLow = parseInt(form.limitLow.replace(/\D/g, ''), 10)
  const limitHigh = parseInt(form.limitHigh.replace(/\D/g, ''), 10)
  const unitLow = form.unitLow.trim()
  const unitHigh = form.unitHigh.trim()
  const typeLow = form.typeLow.trim()
  const typeHigh = form.typeHigh.trim()

  if (
    !Number.isFinite(limitLow) ||
    limitLow < 0 ||
    limitLow > ALCOHOL_LIMIT_AMOUNT_MAX ||
    !Number.isFinite(limitHigh) ||
    limitHigh < 0 ||
    limitHigh > ALCOHOL_LIMIT_AMOUNT_MAX ||
    !unitLow ||
    !unitHigh ||
    !typeLow ||
    !typeHigh
  ) {
    return { valid: false }
  }

  return {
    valid: true,
    limits: {
      limitLow,
      unitLow,
      typeLow,
      limitHigh,
      unitHigh,
      typeHigh,
    },
  }
}
