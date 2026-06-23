'use client'

import { useCallback, useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentPicker from './MemberAccentPicker'
import MemberAvatarPicker from './MemberAvatarPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateChild } from '../lib/family/children'
import {
  coercePortraitForOptions,
  portraitIdFromStored,
  portraitSrc,
  resolveChildAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { formatChildAge, parseAgeInput, type ChildGender } from '../lib/family/memberGender'
import { normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import type { ChildWithTodayXp } from '../lib/family/types'
import { CARD_SURFACE_CLASS, FORM_FIELD_INPUT_COMPACT_CLASS } from '../lib/appShell'
import { displayNameInputProps, integerInputProps } from '../lib/formInputAutofill'

type ChildMemberEditorProps = {
  child: ChildWithTodayXp
}

function savedChildPortraitId(child: ChildWithTodayXp): AvatarPortraitId {
  const options = resolveChildAvatar(child.gender, child.age, null).options
  return coercePortraitForOptions(portraitIdFromStored(child.portrait_id), options)
}

export default function ChildMemberEditor({ child }: ChildMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(child.display_name)
  const [ageInput, setAgeInput] = useState(child.age !== null ? String(child.age) : '')
  const [gender, setGender] = useState<ChildGender>(child.gender)
  const [portraitId, setPortraitId] = useState<AvatarPortraitId>(() => savedChildPortraitId(child))
  const [canAdmin, setCanAdmin] = useState(child.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(child.accent_key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const parsedAge = parseAgeInput(ageInput)

  const avatarResolved = useMemo(() => {
    const resolved = resolveChildAvatar(gender, parsedAge, null)
    const coerced = coercePortraitForOptions(portraitId, resolved.options)
    return {
      ...resolved,
      portraitId: coerced,
      src: coerced ? portraitSrc(coerced) : null,
    }
  }, [gender, parsedAge, portraitId])

  const syncPortraitForProfile = useCallback((nextGender: ChildGender, nextAge: number | null) => {
    const options = resolveChildAvatar(nextGender, nextAge, null).options
    setPortraitId((current) => coercePortraitForOptions(current, options))
  }, [])

  const handleGenderChange = useCallback(
    (next: ChildGender) => {
      setGender(next)
      syncPortraitForProfile(next, parsedAge)
    },
    [parsedAge, syncPortraitForProfile],
  )

  const handleAgeChange = useCallback(
    (value: string) => {
      setAgeInput(value)
      syncPortraitForProfile(gender, parseAgeInput(value))
    },
    [gender, syncPortraitForProfile],
  )

  const isDirty =
    displayName.trim() !== child.display_name ||
    gender !== child.gender ||
    portraitId !== savedChildPortraitId(child) ||
    canAdmin !== child.can_admin ||
    accentKey !== normalizeMemberAccentKey(child.accent_key) ||
    (parsedAge ?? null) !== child.age

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const age = parseAgeInput(ageInput)
    if (ageInput.trim() && age === null) {
      setLoading(false)
      setError('Bitte ein gültiges Alter (0–99) eingeben.')
      return
    }

    const nextPortrait = coercePortraitForOptions(portraitId, avatarResolved.options)
    const { error: saveError } = await updateChild(child.id, {
      display_name: displayName.trim(),
      gender,
      age,
      can_admin: canAdmin,
      accent_key: accentKey,
      portrait_id: nextPortrait,
    })

    setLoading(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    setPortraitId(nextPortrait)
    setSuccess(true)
    notifyFamilyDataChanged()
    await refresh()
  }

  const ageLabel = formatChildAge(parsedAge ?? child.age)
  const subtitle = ageLabel ? `Kind · ${ageLabel}` : 'Kind · Alter nicht angegeben'

  return (
    <form autoComplete="off" onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">{subtitle}</p>
      <div className="space-y-2">
        <div>
          <label htmlFor={`child-name-${child.id}`} className="mb-0.5 block text-xs font-semibold">
            Name
          </label>
          <input
            id={`child-name-${child.id}`}
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={FORM_FIELD_INPUT_COMPACT_CLASS}
            {...displayNameInputProps()}
          />
        </div>
        <div>
          <label htmlFor={`child-age-${child.id}`} className="mb-0.5 block text-xs font-semibold">
            Alter
          </label>
          <input
            id={`child-age-${child.id}`}
            required
            min={0}
            max={99}
            value={ageInput}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder="z. B. 8"
            className={FORM_FIELD_INPUT_COMPACT_CLASS}
            {...integerInputProps('lifexp-child-age')}
          />
        </div>
        <GenderChoice kind="child" compact value={gender} onChange={handleGenderChange} />
      </div>
      <MemberAvatarPicker
        resolved={avatarResolved}
        value={portraitId}
        onChange={setPortraitId}
        legend="Avatar wählen"
      />
      <AdminAccessToggle checked={canAdmin} onChange={setCanAdmin} />
      <MemberAccentPicker value={accentKey} onChange={setAccentKey} />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-xs text-emerald-700 dark:text-emerald-300">Gespeichert.</p> : null}
      {isDirty ? <MemberEditorSaveBar loading={loading} /> : null}
    </form>
  )
}
