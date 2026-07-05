'use client'

import { useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentPicker from './MemberAccentPicker'
import MemberAvatarPicker from './MemberAvatarPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateParent } from '../lib/family/parents'
import {
  coercePortraitForCategory,
  memberAvatarCategoryForParent,
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

function savedParentPortraitId(member: ParentMember): AvatarPortraitId | null {
  return coercePortraitForCategory(
    memberAvatarCategoryForParent(member.gender),
    portraitIdFromStored(member.avatar_url),
  )
}

export default function ParentMemberEditor({ member }: ParentMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(member.display_name)
  const [gender, setGender] = useState<ParentGender>(member.gender)
  const [canAdmin, setCanAdmin] = useState(member.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(member.accent_key))
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(() => savedParentPortraitId(member))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const avatarResolved = useMemo(
    () => resolveParentAvatar(gender, portraitId ? portraitSrc(portraitId) : member.avatar_url),
    [gender, portraitId, member.avatar_url],
  )

  const effectivePortraitId = useMemo(
    () => coercePortraitForCategory(memberAvatarCategoryForParent(gender), portraitId),
    [gender, portraitId],
  )

  const isDirty =
    displayName.trim() !== member.display_name ||
    gender !== member.gender ||
    canAdmin !== member.can_admin ||
    accentKey !== normalizeMemberAccentKey(member.accent_key) ||
    effectivePortraitId !== savedParentPortraitId(member)

  const handleGenderChange = (next: ParentGender) => {
    setGender(next)
    setPortraitId((current) => coercePortraitForCategory(memberAvatarCategoryForParent(next), current))
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error: saveError } = await updateParent(member.id, {
      displayName,
      gender,
      canAdmin,
      accentKey,
      avatarUrl: effectivePortraitId ? portraitSrc(effectivePortraitId) : null,
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

  const roleLabel = member.role === 'owner' ? `Inhaber · ${parentRoleLabel(gender)}` : parentRoleLabel(gender)

  return (
    <form autoComplete="off" onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-950 dark:text-slate-400">{roleLabel}</p>
      <div className="flex gap-2">
        <MemberAvatarPicker
          resolved={avatarResolved}
          value={portraitId}
          onChange={setPortraitId}
          hideLegend
        />
        <div className="min-w-0 flex-1 space-y-2">
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
