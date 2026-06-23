'use client'

import { useCallback, useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentPicker from './MemberAccentPicker'
import MemberAvatarPicker from './MemberAvatarPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateParent } from '../lib/family/parents'
import {
  coercePortraitForOptions,
  portraitIdFromStored,
  portraitSrc,
  resolveParentAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { parentRoleLabel, type ParentGender } from '../lib/family/memberGender'
import { normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import type { ParentMember } from '../lib/family/members'
import { CARD_SURFACE_CLASS, FORM_FIELD_INPUT_COMPACT_CLASS } from '../lib/appShell'
import { displayNameInputProps } from '../lib/formInputAutofill'

type ParentMemberEditorProps = {
  member: ParentMember
}

function savedParentPortraitId(member: ParentMember): AvatarPortraitId {
  const options = resolveParentAvatar(member.gender, null).options
  return coercePortraitForOptions(portraitIdFromStored(member.avatar_url), options)
}

export default function ParentMemberEditor({ member }: ParentMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(member.display_name)
  const [gender, setGender] = useState<ParentGender>(member.gender)
  const [portraitId, setPortraitId] = useState<AvatarPortraitId>(() => savedParentPortraitId(member))
  const [canAdmin, setCanAdmin] = useState(member.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(member.accent_key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const avatarResolved = useMemo(() => {
    const resolved = resolveParentAvatar(gender, null)
    const coerced = coercePortraitForOptions(portraitId, resolved.options)
    return {
      ...resolved,
      portraitId: coerced,
      src: coerced ? portraitSrc(coerced) : null,
    }
  }, [gender, portraitId])

  const handleGenderChange = useCallback((next: ParentGender) => {
    setGender(next)
    const options = resolveParentAvatar(next, null).options
    setPortraitId((current) => coercePortraitForOptions(current, options))
  }, [])

  const isDirty =
    displayName.trim() !== member.display_name ||
    gender !== member.gender ||
    portraitId !== savedParentPortraitId(member) ||
    canAdmin !== member.can_admin ||
    accentKey !== normalizeMemberAccentKey(member.accent_key)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const nextPortrait = coercePortraitForOptions(portraitId, avatarResolved.options)
    const { error: saveError } = await updateParent(member.id, {
      displayName,
      gender,
      canAdmin,
      accentKey,
      avatarUrl: portraitSrc(nextPortrait),
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

  const roleLabel = member.role === 'owner' ? `Inhaber · ${parentRoleLabel(gender)}` : parentRoleLabel(gender)

  return (
    <form autoComplete="off" onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">{roleLabel}</p>
      <div className="space-y-2">
        <div>
          <label htmlFor={`parent-name-${member.id}`} className="mb-0.5 block text-xs font-semibold">
            Name
          </label>
          <input
            id={`parent-name-${member.id}`}
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={FORM_FIELD_INPUT_COMPACT_CLASS}
            {...displayNameInputProps()}
          />
        </div>
        <GenderChoice kind="parent" compact value={gender} onChange={handleGenderChange} />
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
