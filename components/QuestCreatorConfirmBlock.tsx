'use client'

import { useEffect, useMemo, useState } from 'react'

import QuestCreatorReactionForm, {
  defaultReactionMessage,
  defaultReactionPortrait,
} from './QuestCreatorReactionForm'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { markPlusDiscoverUnlocked } from '../lib/family/plusDiscoverUnlock'
import { isFamilyPlus } from '../lib/family/familyPlus'
import {
  portraitIdFromStored,
  resolveChildAvatar,
  resolveParentAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { confirmQuestByCreator } from '../lib/family/questCompletions'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestCreatorConfirmBlockProps = {
  completionId: string
  xpReward: number
  assigneeName?: string
  assigneeChildId?: string | null
  assigneeParentId?: string | null
  compact?: boolean
  onConfirmed?: () => void
}

export default function QuestCreatorConfirmBlock({
  completionId,
  xpReward,
  assigneeName,
  assigneeChildId = null,
  assigneeParentId = null,
  compact = false,
  onConfirmed,
}: QuestCreatorConfirmBlockProps) {
  const { family, memberKind, parent, activeChild, applyTodayXpDelta } = useFamily()
  const plusActive = isFamilyPlus(family)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const creatorBasePortraitId = useMemo((): AvatarPortraitId | null => {
    if (memberKind === 'parent' && parent) {
      return portraitIdFromStored(parent.avatar_url) ?? resolveParentAvatar(parent.gender, parent.avatar_url).portraitId
    }
    if (memberKind === 'child' && activeChild) {
      return resolveChildAvatar(activeChild.gender, activeChild.age, activeChild.portrait_id).portraitId
    }
    return null
  }, [memberKind, parent, activeChild])

  const [message, setMessage] = useState(() => defaultReactionMessage())
  const [portraitId, setPortraitId] = useState<AvatarPortraitId | null>(null)

  useEffect(() => {
    if (!creatorBasePortraitId) return
    setPortraitId((current) => current ?? defaultReactionPortrait(creatorBasePortraitId))
  }, [creatorBasePortraitId])

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)

    const reaction =
      plusActive && portraitId && message.trim()
        ? { message: message.trim(), portraitId }
        : null

    const result = await confirmQuestByCreator(completionId, { reaction })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }

    if (result.xpAwarded && result.xpAwarded > 0) {
      const targetChildId = result.assigneeChildId ?? assigneeChildId
      const targetParentId = result.assigneeParentId ?? assigneeParentId
      if (targetChildId) {
        applyTodayXpDelta('child', targetChildId, result.xpAwarded)
      } else if (targetParentId) {
        applyTodayXpDelta('parent', targetParentId, result.xpAwarded)
      }
    }

    if (family?.id) markPlusDiscoverUnlocked(family.id)
    notifyFamilyDataChanged()
    onConfirmed?.()
  }

  const label = assigneeName
    ? `Final bestätigen (+${xpReward} XP für ${assigneeName})`
    : `Final bestätigen (+${xpReward} XP)`

  return (
    <div className={compact ? 'mt-2' : 'mt-2.5'}>
      {plusActive && creatorBasePortraitId && portraitId ? (
        <QuestCreatorReactionForm
          basePortraitId={creatorBasePortraitId}
          message={message}
          selectedPortraitId={portraitId}
          onMessageChange={setMessage}
          onPortraitChange={setPortraitId}
          disabled={busy}
        />
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleConfirm()}
        className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 ${plusActive && creatorBasePortraitId ? 'mt-3' : ''}`}
      >
        {busy ? 'Wird bestätigt …' : plusActive && creatorBasePortraitId ? 'OK — XP & Nachricht senden' : label}
      </button>
      {error ? (
        <p className="mt-1.5 text-xs text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
