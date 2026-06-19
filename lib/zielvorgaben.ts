import {
  alcoholLimitsFromProfile,
  EMPTY_ALCOHOL_LIMITS,
  parseAlcoholLimitsForm,
  type AlcoholLimitsFormState,
} from './alcoholUnits'
import { fetchCurrentProfile, isAlcoholTrackingEnabled, type ProfileSettings } from './profile'

const ZIELVORGABEN_COMPLETE_KEY = 'lifexp-zielvorgaben-complete'
const ZIELVORGABEN_DRAFT_KEY = 'lifexp-zielvorgaben-draft'

export type ZielvorgabenDraft = {
  alcoholTrack: boolean | null
  motivationDaily: boolean | null
  alcoholLimits: AlcoholLimitsFormState
}

function normalizeAlcoholLimits(raw: unknown): AlcoholLimitsFormState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ALCOHOL_LIMITS }
  const o = raw as Record<string, unknown>
  return {
    limitLow: typeof o.limitLow === 'string' ? o.limitLow : '',
    unitLow: typeof o.unitLow === 'string' ? o.unitLow : '',
    typeLow: typeof o.typeLow === 'string' ? o.typeLow : '',
    limitHigh: typeof o.limitHigh === 'string' ? o.limitHigh : '',
    unitHigh: typeof o.unitHigh === 'string' ? o.unitHigh : '',
    typeHigh: typeof o.typeHigh === 'string' ? o.typeHigh : '',
  }
}

function draftHasAnyInput(draft: ZielvorgabenDraft): boolean {
  if (draft.alcoholTrack !== null || draft.motivationDaily !== null) return true
  const limits = draft.alcoholLimits
  return (
    limits.limitLow !== '' ||
    limits.unitLow !== '' ||
    limits.typeLow !== '' ||
    limits.limitHigh !== '' ||
    limits.unitHigh !== '' ||
    limits.typeHigh !== ''
  )
}

/** Ungespeicherte Eingaben (z. B. nach Info-Seite) in sessionStorage. */
export function loadZielvorgabenDraft(): ZielvorgabenDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ZIELVORGABEN_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      alcoholTrack?: unknown
      motivationDaily?: unknown
      alcoholLimits?: unknown
    }
    const draft: ZielvorgabenDraft = {
      alcoholTrack: typeof parsed.alcoholTrack === 'boolean' ? parsed.alcoholTrack : null,
      motivationDaily:
        typeof parsed.motivationDaily === 'boolean' ? parsed.motivationDaily : null,
      alcoholLimits: normalizeAlcoholLimits(parsed.alcoholLimits),
    }
    return draftHasAnyInput(draft) ? draft : null
  } catch {
    return null
  }
}

export function saveZielvorgabenDraft(draft: ZielvorgabenDraft): void {
  if (typeof window === 'undefined') return
  if (!draftHasAnyInput(draft)) {
    clearZielvorgabenDraft()
    return
  }
  sessionStorage.setItem(
    ZIELVORGABEN_DRAFT_KEY,
    JSON.stringify({
      alcoholTrack: draft.alcoholTrack,
      motivationDaily: draft.motivationDaily,
      alcoholLimits: draft.alcoholLimits,
    }),
  )
}

export function clearZielvorgabenDraft(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ZIELVORGABEN_DRAFT_KEY)
}

export function isZielvorgabenCompleteLocal(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ZIELVORGABEN_COMPLETE_KEY) === '1'
}

export function markZielvorgabenCompleteLocal(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ZIELVORGABEN_COMPLETE_KEY, '1')
}

export function clearZielvorgabenCompleteLocal(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ZIELVORGABEN_COMPLETE_KEY)
  clearZielvorgabenDraft()
}

/** Beide Ja/Nein-Fragen + ggf. vollständige Alkohol-Limits (wenig + viel). */
export function isZielvorgabenCompleteFromSettings(settings: ProfileSettings): boolean {
  if (settings.motivationMode === null) return false

  if (!isAlcoholTrackingEnabled(settings.alcoholMode)) {
    return true
  }

  return parseAlcoholLimitsForm(alcoholLimitsFromProfile(settings)).valid
}

/** Formular auf der Zielvorgaben-Seite (lokaler State). */
export function isZielvorgabenFormComplete(
  alcoholTrack: boolean | null,
  motivationDaily: boolean | null,
  alcoholLimits: AlcoholLimitsFormState,
): boolean {
  if (alcoholTrack === null || motivationDaily === null) return false
  if (alcoholTrack && !parseAlcoholLimitsForm(alcoholLimits).valid) return false
  return true
}

export type ZielvorgabenHintSection = 'alkohol' | 'motivation' | 'save'

/** Erste noch offene Sektion für den Pfeil-Hinweis. */
export function zielvorgabenHintSection(
  alcoholTrack: boolean | null,
  motivationDaily: boolean | null,
  alcoholLimits: AlcoholLimitsFormState,
): ZielvorgabenHintSection | null {
  if (isZielvorgabenFormComplete(alcoholTrack, motivationDaily, alcoholLimits)) {
    return null
  }
  if (alcoholTrack === null) return 'alkohol'
  if (alcoholTrack && !parseAlcoholLimitsForm(alcoholLimits).valid) return 'alkohol'
  if (motivationDaily === null) return 'motivation'
  return 'save'
}

export async function fetchZielvorgabenComplete(): Promise<{
  complete: boolean
  error: Error | null
}> {
  const { settings, error } = await fetchCurrentProfile()
  if (error) {
    return { complete: isZielvorgabenCompleteLocal(), error }
  }

  const complete = isZielvorgabenCompleteFromSettings(settings)
  if (complete) {
    markZielvorgabenCompleteLocal()
  }
  return { complete, error: null }
}
