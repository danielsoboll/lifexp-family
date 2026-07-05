'use client'

import { RECURRING_SCHEDULE_OPTIONS, RECURRING_WEEKDAY_LABELS_DE } from '../lib/family/recurringQuestSchedule'
import type { RecurringQuestSchedule } from '../lib/family/types'
import { cetWeekdayIndex, cetToday } from '../lib/cetDate'

type RecurringQuestSchedulePickerProps = {
  schedule: RecurringQuestSchedule
  weeklyWeekday: number
  onScheduleChange: (schedule: RecurringQuestSchedule) => void
  onWeeklyWeekdayChange: (weekday: number) => void
}

const OPTION_CLASS =
  'rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors'

export default function RecurringQuestSchedulePicker({
  schedule,
  weeklyWeekday,
  onScheduleChange,
  onWeeklyWeekdayChange,
}: RecurringQuestSchedulePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Rhythmus</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {RECURRING_SCHEDULE_OPTIONS.map((option) => {
            const active = schedule === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onScheduleChange(option.id)}
                className={`${OPTION_CLASS} ${
                  active
                    ? 'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100'
                    : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                }`}
              >
                <span className="block">{option.label}</span>
                {option.hint ? (
                  <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-slate-400">
                    {option.hint}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {schedule === 'weekly' ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Wochentag</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RECURRING_WEEKDAY_LABELS_DE.map((label, index) => {
              const active = weeklyWeekday === index
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onWeeklyWeekdayChange(index)}
                  className={`${OPTION_CLASS} ${
                    active
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {schedule === 'every_other_day' ? (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Start: heute ({RECURRING_WEEKDAY_LABELS_DE[cetWeekdayIndex(cetToday())]}) — dann jeden zweiten Tag.
        </p>
      ) : null}
    </div>
  )
}
