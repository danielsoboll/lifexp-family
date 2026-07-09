'use client'

import { useMemo, useRef, type RefObject } from 'react'

import AutofillSafeTextInput from './AutofillSafeTextInput'
import IosContactAutofillDecoy from './IosContactAutofillDecoy'
import MemberAvatarPicker from './MemberAvatarPicker'
import ParentDisplayNameField from './ParentDisplayNameField'
import {
  isParentOnboardingGender,
  ONBOARDING_MEMBER_OPTIONS,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import {
  coerceOnboardingPortrait,
  coercePortraitForCategory,
  memberAvatarCategoryForChild,
  resolveChildAvatar,
  resolveOnboardingAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { parseAgeInput, type ChildGender } from '../lib/family/memberGender'
import { PRESSABLE_3D_CLASS, FORM_FIELD_INPUT_CLASS } from '../lib/appShell'
import { integerInputProps, personLabelInputProps } from '../lib/formInputAutofill'

type OnboardingProfileFieldsProps = {
  displayName: string
  onDisplayNameChange: (value: string) => void
  gender: OnboardingMemberGender
  onGenderChange: (value: OnboardingMemberGender) => void
  ageInput: string
  onAgeInputChange: (value: string) => void
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
  ageInput,
  onAgeInputChange,
  portraitId,
  onPortraitIdChange,
  nameLabel = 'Wie heißt du?',
  sheetScrollRef,
  hideAboveRef,
}: OnboardingProfileFieldsProps) {
  const nameSectionRef = useRef<HTMLDivElement>(null)
  const ageSectionRef = useRef<HTMLDivElement>(null)
  const isChild = !isParentOnboardingGender(gender)
  const parsedAge = useMemo(() => parseAgeInput(ageInput), [ageInput])

  const avatarResolved = useMemo(() => {
    if (isChild) {
      return resolveChildAvatar(gender as ChildGender, parsedAge, portraitId)
    }
    return resolveOnboardingAvatar(gender, portraitId)
  }, [gender, isChild, parsedAge, portraitId])

  const syncChildPortrait = (nextGender: ChildGender, nextAge: number | null, current: AvatarPortraitId | null) => {
    const category = memberAvatarCategoryForChild(nextGender, nextAge)
    const nextPortrait = coercePortraitForCategory(category, current)
    if (nextPortrait) onPortraitIdChange(nextPortrait)
  }

  const handleGenderChange = (next: OnboardingMemberGender) => {
    onGenderChange(next)
    if (isParentOnboardingGender(next)) {
      onPortraitIdChange(coerceOnboardingPortrait(next, portraitId))
      return
    }
    syncChildPortrait(next, parseAgeInput(ageInput), portraitId)
  }

  const handleAgeChange = (value: string) => {
    onAgeInputChange(value)
    if (!isChild) return
    syncChildPortrait(gender as ChildGender, parseAgeInput(value), portraitId)
  }

  return (
    <>
      <IosContactAutofillDecoy />

      <fieldset>
        <legend className="mb-2 block text-sm font-semibold text-slate-950 dark:text-slate-200">Wer bist du?</legend>
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
                    : 'border-slate-300 text-slate-950 dark:border-slate-600 dark:text-slate-100'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div ref={nameSectionRef}>
        {!isChild ? (
          <ParentDisplayNameField
            id="lifexp-onboarding-who"
            gender={gender}
            displayName={displayName}
            onDisplayNameChange={onDisplayNameChange}
            label={nameLabel}
            labelClassName="mb-1 block text-sm font-semibold text-slate-950 dark:text-slate-200"
            autofillSafe
            sheetScrollRef={sheetScrollRef}
            hideAboveRef={hideAboveRef}
            scrollBlockRef={nameSectionRef}
          />
        ) : (
          <>
            <label htmlFor="lifexp-onboarding-who" className="mb-1 block text-sm font-semibold text-slate-950 dark:text-slate-200">
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
          </>
        )}
      </div>

      {isChild ? (
        <div ref={ageSectionRef}>
          <label htmlFor="lifexp-onboarding-age" className="mb-1 block text-sm font-semibold text-slate-950 dark:text-slate-200">
            Wie alt bist du?
          </label>
          <AutofillSafeTextInput
            id="lifexp-onboarding-age"
            required
            min={0}
            max={99}
            value={ageInput}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder="z. B. 8"
            scrollBlockRef={ageSectionRef}
            scrollOnFocus="slow"
            sheetScrollRef={sheetScrollRef}
            hideAboveRef={hideAboveRef}
            scrollTopInsetPx={8}
            className={FORM_FIELD_INPUT_CLASS}
            autofillProps={integerInputProps('lifexp-onboarding-age')}
          />
        </div>
      ) : null}

      <MemberAvatarPicker
        resolved={avatarResolved}
        value={portraitId}
        onChange={onPortraitIdChange}
        legend="Avatar wählen"
      />
    </>
  )
}
