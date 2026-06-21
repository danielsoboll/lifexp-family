'use client'

import { useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentPicker from './MemberAccentPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import MemberPortraitThumb from './MemberPortraitThumb'
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

export default function ChildMemberEditor({ child }: ChildMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(child.display_name)
  const [ageInput, setAgeInput] = useState(child.age !== null ? String(child.age) : '')
  const [gender, setGender] = useState<ChildGender>(child.gender)
  const [canAdmin, setCanAdmin] = useState(child.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(child.accent_key))
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(child.portrait_id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const parsedAge = parseAgeInput(ageInput)

  const isDirty =
    displayName.trim() !== child.display_name ||
    gender !== child.gender ||
    canAdmin !== child.can_admin ||
    accentKey !== normalizeMemberAccentKey(child.accent_key) ||
    portraitId !== child.portrait_id ||
    (parsedAge ?? null) !== child.age

  const resolved = useMemo(
    () => resolveChildAvatar(gender, parsedAge, portraitId),
    [gender, parsedAge, portraitId],
  )

  const applyProfileChange = (nextGender: ChildGender, nextAge: number | null, currentPortrait: AvatarPortraitId | null) => {
    const category = memberAvatarCategoryForChild(nextGender, nextAge)
    setPortraitId(coercePortraitForCategory(category, currentPortrait))
  }

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

    const category = memberAvatarCategoryForChild(gender, age)
    const nextPortrait = coercePortraitForCategory(category, portraitId)

    const { error: saveError } = await updateChild(child.id, {
      display_name: displayName.trim(),
      gender,
      age,
      can_admin: canAdmin,
      portrait_id: nextPortrait,
      accent_key: accentKey,
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
    <form onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">{subtitle}</p>
      <div className="flex gap-3">
        <MemberPortraitThumb src={resolved.src} error={resolved.error} />
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
                applyProfileChange(gender, parseAgeInput(e.target.value), portraitId)
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
              applyProfileChange(next, parsedAge, portraitId)
            }}
          />
        </div>
      </div>
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
