'use client'

import { useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentField from './MemberAccentField'
import MemberAvatarPicker from './MemberAvatarPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateChild } from '../lib/family/children'
import {
  coercePortraitForCategory,
  memberAvatarCategoryForChild,
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

function savedChildPortraitId(child: ChildWithTodayXp): AvatarPortraitId | null {
  return coercePortraitForCategory(memberAvatarCategoryForChild(child.gender, child.age), child.portrait_id)
}

export default function ChildMemberEditor({ child }: ChildMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(child.display_name)
  const [ageInput, setAgeInput] = useState(child.age !== null ? String(child.age) : '')
  const [gender, setGender] = useState<ChildGender>(child.gender)
  const [canAdmin, setCanAdmin] = useState(child.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(child.accent_key))
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(() => savedChildPortraitId(child))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const parsedAge = parseAgeInput(ageInput)

  const avatarResolved = useMemo(
    () => resolveChildAvatar(gender, parsedAge ?? child.age, portraitId),
    [gender, parsedAge, child.age, portraitId],
  )

  const effectivePortraitId = useMemo(
    () => coercePortraitForCategory(memberAvatarCategoryForChild(gender, parsedAge ?? child.age), portraitId),
    [gender, parsedAge, child.age, portraitId],
  )

  const isDirty =
    displayName.trim() !== child.display_name ||
    gender !== child.gender ||
    canAdmin !== child.can_admin ||
    accentKey !== normalizeMemberAccentKey(child.accent_key) ||
    (parsedAge ?? null) !== child.age ||
    effectivePortraitId !== savedChildPortraitId(child)

  const syncPortrait = (nextGender: ChildGender, nextAge: number | null) => {
    setPortraitId((current) =>
      coercePortraitForCategory(memberAvatarCategoryForChild(nextGender, nextAge), current),
    )
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const age = parseAgeInput(ageInput)
    if (age === null) {
      setLoading(false)
      setError('Bitte ein gültiges Alter (0–99) eingeben.')
      return
    }

    const { error: saveError } = await updateChild(child.id, {
      display_name: displayName.trim(),
      gender,
      age,
      can_admin: canAdmin,
      accent_key: accentKey,
      portrait_id: effectivePortraitId,
    })

    setLoading(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    setSuccess(true)
    notifyFamilyDataChanged()
    await refresh()
  }

  const ageLabel = formatChildAge(parsedAge ?? child.age)
  const subtitle = ageLabel ? `Kind · ${ageLabel}` : 'Kind · Alter nicht angegeben'

  return (
    <form autoComplete="off" onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-950 dark:text-slate-400">{subtitle}</p>
      <div className="flex gap-2">
        <MemberAvatarPicker
          resolved={avatarResolved}
          value={portraitId}
          onChange={setPortraitId}
          hideLegend
        />
        <div className="min-w-0 flex-1 space-y-2">
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
              onChange={(e) => {
                setAgeInput(e.target.value)
                syncPortrait(gender, parseAgeInput(e.target.value))
              }}
              placeholder="z. B. 8"
              className={FORM_FIELD_INPUT_COMPACT_CLASS}
              {...integerInputProps('lifexp-child-age')}
            />
          </div>
          <GenderChoice
            kind="child"
            compact
            value={gender}
            onChange={(next) => {
              setGender(next)
              syncPortrait(next, parsedAge)
            }}
          />
        </div>
      </div>
      {isDirty ? <MemberEditorSaveBar loading={loading} /> : null}
      <AdminAccessToggle checked={canAdmin} onChange={setCanAdmin} />
      <MemberAccentField value={accentKey} onChange={setAccentKey} />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-xs text-emerald-700 dark:text-emerald-300">Gespeichert.</p> : null}
    </form>
  )
}
