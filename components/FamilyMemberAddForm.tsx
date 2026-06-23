'use client'

import { useMemo, useState } from 'react'

import MemberAvatarPicker from './MemberAvatarPicker'
import { useFamily } from './FamilyProvider'
import { createChild } from '../lib/family/children'
import {
  isChildLimitReached,
  MAX_CHILDREN_PER_FAMILY,
} from '../lib/family/memberLimits'
import {
  coerceOnboardingPortrait,
  coercePortraitForOptions,
  portraitSrc,
  resolveChildAvatar,
  resolveOnboardingAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import {
  ADULT_MEMBER_OPTIONS,
  type OnboardingMemberGender,
} from '../lib/family/onboardingMember'
import { CHILD_GENDER_OPTIONS, parseAgeInput, type ChildGender, type ParentGender } from '../lib/family/memberGender'
import { createParentForFamily } from '../lib/family/parents'
import { CARD_SURFACE_CLASS, FORM_FIELD_INPUT_COMPACT_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { displayNameInputProps, integerInputProps } from '../lib/formInputAutofill'

type FamilyMemberAddFormProps = {
  familyId: string
  memberKind: 'adult' | 'child'
  onCreated?: (memberName: string) => void | Promise<void>
}

export default function FamilyMemberAddForm({ familyId, memberKind, onCreated }: FamilyMemberAddFormProps) {
  const { refresh, children } = useFamily()
  const [displayName, setDisplayName] = useState('')
  const [adultGender, setAdultGender] = useState<ParentGender>('male')
  const [childGender, setChildGender] = useState<ChildGender>('boy')
  const [ageInput, setAgeInput] = useState('')
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const childrenFull = isChildLimitReached(children.length)
  const parsedAge = parseAgeInput(ageInput)
  const roleOptions =
    memberKind === 'adult'
      ? ADULT_MEMBER_OPTIONS
      : CHILD_GENDER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
  const selectedGender: OnboardingMemberGender = memberKind === 'adult' ? adultGender : childGender
  const childPortraitAge =
    memberKind === 'child' && parsedAge !== null && parsedAge >= 2 ? parsedAge : null

  const avatarResolved = useMemo(() => {
    if (memberKind === 'child') {
      if (childPortraitAge === null) return null
      const resolved = resolveChildAvatar(childGender, childPortraitAge, portraitId)
      const coerced = coercePortraitForOptions(portraitId, resolved.options)
      return {
        ...resolved,
        portraitId: coerced,
        src: coerced ? portraitSrc(coerced) : null,
      }
    }
    return resolveOnboardingAvatar(adultGender, portraitId)
  }, [memberKind, adultGender, childGender, childPortraitAge, portraitId])

  const handleRoleChange = (value: OnboardingMemberGender) => {
    if (memberKind === 'adult') {
      setAdultGender(value as ParentGender)
      setPortraitId(coerceOnboardingPortrait(value, portraitId))
      return
    }

    setChildGender(value as ChildGender)
    if (childPortraitAge === null) {
      setPortraitId(null)
      return
    }
    const options = resolveChildAvatar(value as ChildGender, childPortraitAge, null).options
    setPortraitId((current) => coercePortraitForOptions(current, options))
  }

  const handleAgeChange = (value: string) => {
    setAgeInput(value)
    const age = parseAgeInput(value)
    if (age === null || age < 2) {
      setPortraitId(null)
      return
    }
    const options = resolveChildAvatar(childGender, age, null).options
    setPortraitId((current) => coercePortraitForOptions(current, options))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const name = displayName.trim()
    if (!name) {
      setLoading(false)
      setError('Bitte einen Namen eingeben.')
      return
    }

    const submitAge = memberKind === 'child' ? parseAgeInput(ageInput) : null
    const nextPortrait =
      memberKind === 'child' && submitAge !== null && submitAge >= 2
        ? coercePortraitForOptions(
            portraitId,
            resolveChildAvatar(childGender, submitAge, null).options,
          )
        : memberKind === 'child'
          ? coerceOnboardingPortrait(childGender, portraitId)
          : coerceOnboardingPortrait(adultGender, portraitId)

    if (memberKind === 'adult') {
      const { parent, error: createError } = await createParentForFamily({
        familyId,
        displayName: name,
        gender: adultGender,
        portraitId: nextPortrait,
      })

      setLoading(false)
      if (createError) {
        setError(createError.message)
        return
      }
      if (!parent) {
        setError('Erwachsener konnte nicht gespeichert werden.')
        return
      }

      await refresh()
      setSuccess(`${parent.display_name} wurde angelegt.`)
      setDisplayName('')
      setAdultGender('male')
      setPortraitId(null)
      await onCreated?.(parent.display_name)
      return
    }

    if (childrenFull) {
      setLoading(false)
      setError(`Maximal ${MAX_CHILDREN_PER_FAMILY} Kinder pro Familie.`)
      return
    }

    const age = parseAgeInput(ageInput)
    if (age === null) {
      setLoading(false)
      setError('Bitte ein gültiges Alter (0–99) eingeben.')
      return
    }

    const { child, error: createError } = await createChild({
      familyId,
      displayName: name,
      age,
      gender: childGender,
      portraitId: nextPortrait,
    })

    setLoading(false)
    if (createError) {
      setError(createError.message)
      return
    }
    if (!child) {
      setError('Kind konnte nicht gespeichert werden.')
      return
    }

    await refresh()
    setSuccess(`${child.display_name} wurde angelegt.`)
    setDisplayName('')
    setAgeInput('')
    setChildGender('boy')
    setPortraitId(null)
    await onCreated?.(child.display_name)
  }

  const canSubmit =
    !loading &&
    displayName.trim().length > 0 &&
    (memberKind === 'adult' || !childrenFull) &&
    (memberKind === 'adult' || parsedAge !== null)

  const submitLabel = memberKind === 'adult' ? 'Erwachsenen hinzufügen' : 'Kind hinzufügen'

  return (
    <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-3 rounded-xl p-3`}>
      <div>
        <label htmlFor="member-name" className="mb-0.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
          Name
        </label>
        <input
          id="member-name"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={FORM_FIELD_INPUT_COMPACT_CLASS}
          {...displayNameInputProps()}
        />
      </div>

      <fieldset>
        <legend className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
          {memberKind === 'adult' ? 'Rolle' : 'Geschlecht'}
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {roleOptions.map((option) => {
            const selected = selectedGender === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleRoleChange(option.value)}
                className={`${PRESSABLE_3D_CLASS} flex items-center justify-center rounded-lg border-2 px-2 py-1.5 text-xs font-semibold ${
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
        {memberKind === 'adult' ? (
          <p className="mt-1.5 text-[11px] text-slate-950 dark:text-slate-400">
            Mehrere Papas oder Mamas sind möglich.
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-slate-950 dark:text-slate-400">
            Kinder: {children.length}/{MAX_CHILDREN_PER_FAMILY}
          </p>
        )}
      </fieldset>

      {memberKind === 'child' ? (
        <div>
          <label htmlFor="member-age" className="mb-0.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Alter
          </label>
          <input
            id="member-age"
            required
            min={0}
            max={99}
            value={ageInput}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder="z. B. 8"
            className={FORM_FIELD_INPUT_COMPACT_CLASS}
            {...integerInputProps('lifexp-member-age')}
          />
        </div>
      ) : null}

      {avatarResolved ? (
        <MemberAvatarPicker
          resolved={avatarResolved}
          value={portraitId}
          onChange={setPortraitId}
          legend="Avatar wählen"
        />
      ) : memberKind === 'child' && childPortraitAge === null ? (
        <p className="text-[11px] text-slate-950 dark:text-slate-400">
          {parsedAge !== null && parsedAge < 2
            ? 'Für ein Portrait bitte Alter 2 oder älter eingeben.'
            : 'Avatar-Auswahl erscheint, sobald ein gültiges Alter eingegeben ist.'}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-lg border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60`}
      >
        {loading ? 'Wird gespeichert …' : submitLabel}
      </button>
    </form>
  )
}
