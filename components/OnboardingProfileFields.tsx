'use client'

import {
  ONBOARDING_MEMBER_OPTIONS,
  isParentOnboardingGender,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import { PRESSABLE_3D_CLASS, FORM_FIELD_INPUT_CLASS } from '../lib/appShell'
import { displayNameInputProps, integerInputProps } from '../lib/formInputAutofill'

type OnboardingProfileFieldsProps = {
  displayName: string
  onDisplayNameChange: (value: string) => void
  gender: OnboardingMemberGender
  onGenderChange: (value: OnboardingMemberGender) => void
  ageInput: string
  onAgeInputChange: (value: string) => void
  nameLabel?: string
}

export default function OnboardingProfileFields({
  displayName,
  onDisplayNameChange,
  gender,
  onGenderChange,
  ageInput,
  onAgeInputChange,
  nameLabel = 'Dein Name',
}: OnboardingProfileFieldsProps) {
  const showAge = !isParentOnboardingGender(gender)

  return (
    <>
      <div>
        <label htmlFor="onboarding-name" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {nameLabel}
        </label>
        <input
          id="onboarding-name"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className={FORM_FIELD_INPUT_CLASS}
          {...displayNameInputProps()}
        />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Wer bist du?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ONBOARDING_MEMBER_OPTIONS.map((option) => {
            const selected = gender === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onGenderChange(option.value)}
                className={`${PRESSABLE_3D_CLASS} flex items-center justify-center rounded-xl border-2 px-2 py-2.5 text-sm font-semibold ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-slate-300 text-slate-800 dark:border-slate-600 dark:text-slate-100'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {showAge ? (
        <div>
          <label htmlFor="onboarding-age" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Alter
          </label>
          <input
            id="onboarding-age"
            required
            min={0}
            max={99}
            value={ageInput}
            onChange={(e) => onAgeInputChange(e.target.value)}
            placeholder="z. B. 12"
            className={FORM_FIELD_INPUT_CLASS}
            {...integerInputProps('lifexp-onboarding-age')}
          />
        </div>
      ) : null}
    </>
  )
}
