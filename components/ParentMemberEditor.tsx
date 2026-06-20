'use client'

import { useMemo, useState } from 'react'

import GenderChoice from './GenderChoice'
import AdminAccessToggle from './AdminAccessToggle'
import MemberAccentPicker from './MemberAccentPicker'
import MemberEditorSaveBar from './MemberEditorSaveBar'
import MemberPortraitThumb from './MemberPortraitThumb'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { updateParent } from '../lib/family/parents'
import {
  coercePortraitForCategory,
  memberAvatarCategoryForParent,
  portraitSrc,
  resolveParentAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { parentRoleLabel, type ParentGender } from '../lib/family/memberGender'
import { normalizeMemberAccentKey, type MemberAccentKey } from '../lib/family/memberAccentColor'
import type { ParentMember } from '../lib/family/members'
import { CARD_SURFACE_CLASS } from '../lib/appShell'

type ParentMemberEditorProps = {
  member: ParentMember
}

const INPUT_CLASS =
  'w-full scroll-my-24 rounded-lg border-2 border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-900'

export default function ParentMemberEditor({ member }: ParentMemberEditorProps) {
  const { refresh } = useFamily()
  const [displayName, setDisplayName] = useState(member.display_name)
  const [gender, setGender] = useState<ParentGender>(member.gender)
  const [canAdmin, setCanAdmin] = useState(member.can_admin)
  const [accentKey, setAccentKey] = useState<MemberAccentKey>(normalizeMemberAccentKey(member.accent_key))
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(
    resolveParentAvatar(member.gender, member.avatar_url).portraitId,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const savedPortraitId = useMemo(
    () => resolveParentAvatar(member.gender, member.avatar_url).portraitId,
    [member.gender, member.avatar_url],
  )

  const isDirty =
    displayName.trim() !== member.display_name ||
    gender !== member.gender ||
    canAdmin !== member.can_admin ||
    accentKey !== normalizeMemberAccentKey(member.accent_key) ||
    portraitId !== savedPortraitId

  const resolved = useMemo(
    () => resolveParentAvatar(gender, portraitId ? portraitSrc(portraitId) : member.avatar_url),
    [gender, portraitId, member.avatar_url],
  )

  const handleGenderChange = (next: ParentGender) => {
    setGender(next)
    const category = memberAvatarCategoryForParent(next)
    setPortraitId(coercePortraitForCategory(category, portraitId))
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const category = memberAvatarCategoryForParent(gender)
    const nextPortrait = coercePortraitForCategory(category, portraitId)

    const { error: saveError } = await updateParent(member.id, {
      displayName,
      gender,
      canAdmin,
      avatarUrl: nextPortrait ? portraitSrc(nextPortrait) : null,
      accentKey,
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
    <form onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} space-y-2 rounded-xl p-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{roleLabel}</p>
      <div className="flex gap-3">
        <MemberPortraitThumb src={resolved.src} error={resolved.error} />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label htmlFor={`parent-name-${member.id}`} className="mb-0.5 block text-xs font-semibold">
              Name
            </label>
            <input
              id={`parent-name-${member.id}`}
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={INPUT_CLASS}
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
