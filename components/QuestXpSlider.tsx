'use client'

import { QUEST_XP_MAX, QUEST_XP_MIN } from '../lib/family/questRules'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type QuestXpSliderProps = {
  value: number
  onChange: (next: number) => void
  maxAllowed?: number
  disabled?: boolean
}

export default function QuestXpSlider({ value, onChange, maxAllowed = QUEST_XP_MAX, disabled = false }: QuestXpSliderProps) {
  const cap = Math.min(QUEST_XP_MAX, Math.max(QUEST_XP_MIN, maxAllowed))
  const clamped = Math.min(cap, Math.max(QUEST_XP_MIN, value))
  const percent = ((clamped - QUEST_XP_MIN) / (QUEST_XP_MAX - QUEST_XP_MIN)) * 100

  return (
    <div className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor="quest-xp-slider" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          XP-Belohnung
        </label>
        <span className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">+{clamped} XP</span>
      </div>
      <div className="relative pt-1">
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          id="quest-xp-slider"
          type="range"
          min={QUEST_XP_MIN}
          max={cap}
          step={1}
          value={clamped}
          disabled={disabled}
          onChange={(event) => onChange(parseInt(event.target.value, 10))}
          className="absolute inset-x-0 top-0 h-3 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-700 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>
      <div className="flex justify-between text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
        <span>{QUEST_XP_MIN} XP</span>
        <span>{QUEST_XP_MAX} XP max.</span>
      </div>
    </div>
  )
}
