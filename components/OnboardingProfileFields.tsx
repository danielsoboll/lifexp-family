'use client'

import { useMemo, useRef, type RefObject } from 'react'

import AutofillSafeTextInput from './AutofillSafeTextInput'
import IosContactAutofillDecoy from './IosContactAutofillDecoy'
import MemberAvatarPicker from './MemberAvatarPicker'
import {
  ONBOARDING_MEMBER_OPTIONS,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import {
  coerceOnboardingPortrait,
  resolveOnboardingAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { PRESSABLE_3D_CLASS, FORM_FIELD_INPUT_CLASS } from '../lib/appShell'
import { personLabelInputProps } from '../lib/formInputAutofill'

type OnboardingProfileFieldsProps = {
  displayName: string
  onDisplayNameChange: (value: string) => void
  gender: OnboardingMemberGender
  onGenderChange: (value: OnboardingMemberGender) => void
  portraitId: AvatarPortraitId | null
  onPortraitIdChange: (portraitId: AvatarPortraitId) => void
  nameLabel?: string
  sheetScrollRef?: RefObject<HTMLElement | null>
  hideAboveRef?: RefObject<HTMLElement | null>
}

export default function OnboardingProfileFields({
  displayName,
  onDisplayNameChange,
  gender,
  onGenderChange,
  portraitId,
  onPortraitIdChange,
  nameLabel = 'Wie heißt du?',
  sheetScrollRef,
  hideAboveRef,
}: OnboardingProfileFieldsProps) {
  const nameSectionRef = useRef<HTMLDivElement>(null)

  const avatarResolved = useMemo(
    () => resolveOnboardingAvatar(gender, portraitId),
    [gender, portraitId],
  )

  const handleGenderChange = (next: OnboardingMemberGender) => {
    onGenderChange(next)
    onPortraitIdChange(coerceOnboardingPortrait(next, portraitId))
  }

  return (
    <>
      <IosContactAutofillDecoy />
      <div ref={nameSectionRef}>
        <label htmlFor="lifexp-onboarding-who" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {nameLabel}
        </label>
        <AutofillSafeTextInput
          id="lifexp-onboarding-who"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          scrollBlockRef={nameSectionRef}
          scrollOnFocus="slow"
          sheetScrollRef={sheetScrollRef}
          hideAboveRef={hideAboveRef}
          scrollTopInsetPx={8}
          className={FORM_FIELD_INPUT_CLASS}
          autofillProps={personLabelInputProps()}
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
                onClick={() => handleGenderChange(option.value)}
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

      <MemberAvatarPicker
        resolved={avatarResolved}
        value={portraitId}
        onChange={onPortraitIdChange}
        legend="Avatar wählen"
      />
    </>
  )
}
