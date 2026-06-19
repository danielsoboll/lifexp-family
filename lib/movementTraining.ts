import type { PrimaryGoal } from './storage'

export type MovementTrainingChoiceTone = 'default' | 'recovery'

export type MovementTrainingChoice = {
  label: string
  detail?: string
  xp: number
  tone?: MovementTrainingChoiceTone
}

export type PumpTrainingMode = 'pump_training' | 'regeneration'

export const STANDARD_TRAINING_CHOICES: MovementTrainingChoice[] = [
  { label: 'komplettes Workout', xp: 15 },
  { label: 'gutes Training', xp: 10 },
  { label: 'Leichtes/ mittleres Training', xp: 5 },
  {
    label: 'Aktive Erholung',
    detail: '– gestern gut trainiert',
    xp: 5,
    tone: 'recovery',
  },
  { label: 'kein Training', xp: 0 },
]

export function trainingChoiceButtonClass(
  selected: boolean,
  tone: MovementTrainingChoiceTone = 'default',
): string {
  const base =
    'lifexp-pressable-3d flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left ring-1 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'

  if (tone === 'recovery') {
    return `${base} ${
      selected
        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-emerald-200/80 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
        : 'border-stone-500/95 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-900 ring-stone-500/18 hover:border-emerald-500/90 dark:border-stone-500 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-100 dark:ring-stone-600/30 dark:hover:border-emerald-500/80'
    }`
  }

  return `${base} ${
    selected
      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-emerald-200/80 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/60'
      : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-900 ring-stone-500/18 hover:border-emerald-400/90 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-100 dark:ring-stone-600/30 dark:hover:border-emerald-500/80'
  }`
}

export function trainingChoiceXpClass(): string {
  return 'text-sm font-semibold text-emerald-700 dark:text-emerald-400'
}

/** Platzhalter — XP-Logik für Regeneration folgt. */
export const PUMP_REGENERATION_CHOICES: MovementTrainingChoice[] = [
  { label: 'aktive Regeneration', xp: 10 },
  { label: 'leichte Regeneration', xp: 5 },
  { label: 'keine Regeneration', xp: 0 },
]

export function pumpTrainingChoicesForMode(mode: PumpTrainingMode): MovementTrainingChoice[] {
  return mode === 'regeneration' ? PUMP_REGENERATION_CHOICES : STANDARD_TRAINING_CHOICES
}

export function parsePumpTrainingMode(value: unknown): PumpTrainingMode | null {
  return value === 'pump_training' || value === 'regeneration' ? value : null
}

export const PUMP_TRAINING_MODE_LABELS: Record<PumpTrainingMode, string> = {
  pump_training: 'Pump/ Training',
  regeneration: 'Regeneration',
}

export function bewegungTrainingButtonCopy(goal: PrimaryGoal): { title: string; subtitle: string } {
  if (goal === 'pump') {
    return {
      title: PUMP_TRAINING_MODE_LABELS.pump_training,
      subtitle: 'Tag heute · Training oder Regeneration',
    }
  }
  return {
    title: 'Training',
    subtitle: 'Training des Tages eintragen',
  }
}

export function goalToggleButtonClass(active: boolean): string {
  return `lifexp-pressable-3d rounded-2xl border-2 px-2 py-3 text-center text-xs font-bold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:text-sm ${
    active
      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-slate-900 ring-1 ring-emerald-200/80 dark:border-emerald-400 dark:from-emerald-950/55 dark:to-teal-950/45 dark:text-slate-100 dark:ring-emerald-700/45'
      : 'border-stone-400/90 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/70 text-slate-800 ring-1 ring-stone-500/18 hover:border-stone-500 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-slate-200 dark:ring-stone-600/30 dark:hover:border-slate-400'
  }`
}
