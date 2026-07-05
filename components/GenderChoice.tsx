'use client'

import {
  CHILD_GENDER_OPTIONS,
  PARENT_GENDER_OPTIONS,
  type ChildGender,
  type ParentGender,
} from '../lib/family/memberGender'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type GenderChoiceProps = {
  compact?: boolean
} & (
  | {
      kind: 'parent'
      value: ParentGender
      onChange: (value: ParentGender) => void
    }
  | {
      kind: 'child'
      value: ChildGender
      onChange: (value: ChildGender) => void
    }
)

export default function GenderChoice(props: GenderChoiceProps) {
  const { compact = false } = props
  const options = props.kind === 'parent' ? PARENT_GENDER_OPTIONS : CHILD_GENDER_OPTIONS

  return (
    <div>
      <span
        className={`mb-1 block font-semibold text-slate-950 dark:text-slate-200 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        Rolle
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const selected = props.value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (props.kind === 'parent') {
                  props.onChange(option.value as ParentGender)
                } else {
                  props.onChange(option.value as ChildGender)
                }
              }}
              className={`${PRESSABLE_3D_CLASS} flex items-center justify-center rounded-lg border-2 font-semibold ${
                compact ? 'px-2 py-1.5 text-xs' : 'rounded-xl px-3 py-2.5 text-sm'
              } ${
                selected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-slate-300 text-slate-950 dark:border-slate-600 dark:text-slate-100'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
