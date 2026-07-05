'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { FAMILY_DATA_CHANGED_EVENT, notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import QuestCreatorReactionForm, {
  defaultReactionMessage,
  defaultReactionPortrait,
} from './QuestCreatorReactionForm'
import { cetFormatTimeFromIso } from '../lib/cetDate'
import { isFamilyPlus } from '../lib/family/familyPlus'
import {
  portraitIdFromStored,
  resolveChildAvatar,
  resolveParentAvatar,
  type AvatarPortraitId,
} from '../lib/family/memberAvatar'
import { confirmQuestByCreator, fetchPendingCreatorConfirmations } from '../lib/family/questCompletions'
import { fetchAssigneePhotosForCompletion } from '../lib/family/questCompletionPlus'
import type { QuestCompletionPhoto } from '../lib/family/questCompletionPlus'
import { markPlusDiscoverUnlocked } from '../lib/family/plusDiscoverUnlock'
import type { PendingCreatorConfirmation } from '../lib/family/types'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'

type ReactionDraft = {
  message: string
  portraitId: AvatarPortraitId
}

export default function QuestCreatorConfirmSheet() {
  const { family, parents, children, loading, hasSession, parent, activeChild, memberKind, canAdmin } = useFamily()
  const [items, setItems] = useState<PendingCreatorConfirmation[]>([])
  const [visible, setVisible] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photosByCompletion, setPhotosByCompletion] = useState<Map<string, QuestCompletionPhoto[]>>(new Map())
  const [reactionsByCompletion, setReactionsByCompletion] = useState<Map<string, ReactionDraft>>(new Map())

  const plusActive = isFamilyPlus(family)

  const creatorBasePortraitId = useMemo((): AvatarPortraitId | null => {
    if (memberKind === 'parent' && parent) {
      return portraitIdFromStored(parent.avatar_url) ?? resolveParentAvatar(parent.gender, parent.avatar_url).portraitId
    }
    if (memberKind === 'child' && activeChild) {
      return resolveChildAvatar(activeChild.gender, activeChild.age, activeChild.portrait_id).portraitId
    }
    return null
  }, [memberKind, parent, activeChild])

  const load = useCallback(async () => {
    if (!family) {
      setItems([])
      return
    }
    const { items: rows, error: fetchError } = await fetchPendingCreatorConfirmations(
      family.id,
      parents,
      children,
      canAdmin,
    )
    if (fetchError) {
      setError(fetchError.message)
      setItems([])
      return
    }
    setError(null)
    setItems(rows)

    if (plusActive && rows.length > 0) {
      const photoMap = new Map<string, QuestCompletionPhoto[]>()
      await Promise.all(
        rows.map(async (row) => {
          const { photos } = await fetchAssigneePhotosForCompletion(row.completionId)
          if (photos.length > 0) photoMap.set(row.completionId, photos)
        }),
      )
      setPhotosByCompletion(photoMap)
    } else {
      setPhotosByCompletion(new Map())
    }
  }, [family, parents, children, plusActive, canAdmin])

  useEffect(() => {
    if (loading || !hasSession || !family) {
      setItems([])
      setVisible(false)
      return
    }
    void load()
  }, [loading, hasSession, family, load])

  useEffect(() => {
    const onRefresh = () => void load()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
    return () => window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onRefresh)
  }, [load])

  useEffect(() => {
    if (items.length > 0) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [items.length])

  useEffect(() => {
    if (!plusActive || !creatorBasePortraitId) return
    setReactionsByCompletion((prev) => {
      const next = new Map(prev)
      for (const item of items) {
        if (!next.has(item.completionId)) {
          next.set(item.completionId, {
            message: defaultReactionMessage(),
            portraitId: defaultReactionPortrait(creatorBasePortraitId),
          })
        }
      }
      return next
    })
  }, [items, plusActive, creatorBasePortraitId])

  const setReactionDraft = (completionId: string, patch: Partial<ReactionDraft>) => {
    setReactionsByCompletion((prev) => {
      const next = new Map(prev)
      const current = next.get(completionId)
      if (!current) return prev
      next.set(completionId, { ...current, ...patch })
      return next
    })
  }

  const confirm = async (item: PendingCreatorConfirmation) => {
    setBusyId(item.completionId)
    setError(null)

    const reactionDraft = reactionsByCompletion.get(item.completionId)
    const reaction =
      plusActive && reactionDraft && reactionDraft.message.trim() && reactionDraft.portraitId
        ? { message: reactionDraft.message.trim(), portraitId: reactionDraft.portraitId }
        : null

    const { error: confirmError } = await confirmQuestByCreator(item.completionId, { reaction })
    setBusyId(null)
    if (confirmError) {
      setError(confirmError.message)
      return
    }
    if (family?.id) markPlusDiscoverUnlocked(family.id)
    notifyFamilyDataChanged()
    setItems((prev) => prev.filter((row) => row.completionId !== item.completionId))
  }

  if (items.length === 0) return null

  return (
    <div
      className={`fixed inset-0 z-[115] flex items-end justify-center transition-opacity duration-300 sm:items-center ${
        visible ? 'bg-slate-950/50 opacity-100' : 'pointer-events-none bg-slate-950/0 opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-confirm-sheet-title"
    >
      <div
        className={`w-full max-w-md transform px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out sm:px-0 sm:pb-0 ${
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'
        }`}
      >
        <div className="overflow-hidden rounded-t-3xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-50 via-white to-white shadow-[0_-8px_40px_-8px_rgba(5,150,105,0.35)] dark:border-emerald-600/70 dark:from-emerald-950/90 dark:via-slate-900 dark:to-slate-950 sm:rounded-3xl">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-emerald-300/80 dark:bg-emerald-700/80 sm:hidden" aria-hidden />
          <div className="border-b border-emerald-200/80 px-5 py-4 dark:border-emerald-900/60">
            <h2 id="quest-confirm-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Quests bestätigen
            </h2>
            <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
              Als Ersteller oder Admin: erledigte Quests bestätigen, damit XP gutgeschrieben werden.
            </p>
          </div>

          <ul className="max-h-[min(58vh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
            {items.map((item) => {
              const timeLabel = cetFormatTimeFromIso(item.assigneeConfirmedAt)
              const photos = photosByCompletion.get(item.completionId) ?? []
              const reactionDraft = reactionsByCompletion.get(item.completionId)

              return (
                <li
                  key={item.completionId}
                  className="rounded-2xl border-2 border-slate-300/90 bg-white/95 p-4 dark:border-slate-600 dark:bg-slate-900/90"
                >
                  <p className="font-bold text-slate-900 dark:text-slate-100">{item.questTitle}</p>
                  <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
                    Bestätigt von <strong className="text-slate-800 dark:text-slate-200">{item.assigneeName}</strong>
                    {timeLabel ? `, ${timeLabel} Uhr` : null}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">+{item.xpReward} XP</p>

                  {plusActive && photos.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">Beweisfotos</p>
                      <div className="flex gap-2">
                        {photos.map((photo) => (
                          <a
                            key={photo.id}
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-xl ring-2 ring-slate-200 dark:ring-slate-700"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="" className="h-20 w-20 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {plusActive && creatorBasePortraitId && reactionDraft ? (
                    <QuestCreatorReactionForm
                      basePortraitId={creatorBasePortraitId}
                      message={reactionDraft.message}
                      selectedPortraitId={reactionDraft.portraitId}
                      onMessageChange={(message) => setReactionDraft(item.completionId, { message })}
                      onPortraitChange={(portraitId) => setReactionDraft(item.completionId, { portraitId })}
                      disabled={busyId === item.completionId}
                    />
                  ) : null}

                  <button
                    type="button"
                    disabled={busyId === item.completionId}
                    onClick={() => void confirm(item)}
                    className={`${PRESSABLE_3D_CLASS} mt-3 w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60`}
                  >
                    {busyId === item.completionId
                      ? 'Wird bestätigt …'
                      : plusActive
                        ? 'OK — XP & Like senden'
                        : 'OK — XP gutschreiben'}
                  </button>
                </li>
              )
            })}
          </ul>

          {error ? (
            <p className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
