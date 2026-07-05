'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import PersonalGoalSymbolPicker from './PersonalGoalSymbolPicker'
import SheetPortal from './SheetPortal'
import SheetViewportChrome from './SheetViewportChrome'
import { notifyFamilyDataChanged } from './FamilyProvider'
import { CARD_SURFACE_CLASS, FORM_FIELD_INPUT_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import type { MemberPersonalGoal } from '../lib/family/personalGoals'
import {
  memberCanEditPersonalGoals,
  reorderMemberPersonalGoals,
  saveMemberPersonalGoals,
} from '../lib/family/personalGoals'
import { personalGoalSymbolEmoji } from '../lib/family/personalGoalSymbols'
import type { PersonalGoalSymbolId } from '../lib/family/personalGoalSymbols'
import type { MemberXpHistoryKey } from '../lib/family/xpHistory'
import { dismissMobileKeyboardAndZoom, scrollElementToTopOfContainer } from '../lib/mobileFormFocus'
import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'

type DraftGoal = {
  localId: string
  title: string
  symbolId: PersonalGoalSymbolId | ''
  titleConfirmed: boolean
}

type MemberPersonalGoalsSheetProps = {
  familyId: string
  member: MemberXpHistoryKey
  memberLabel: string
  goals: MemberPersonalGoal[]
  isSelf: boolean
  canAdmin: boolean
  readOnly?: boolean
  onClose: () => void
  onSaved: () => void
}

function draftsFromGoals(goals: MemberPersonalGoal[]): DraftGoal[] {
  return goals.map((goal) => ({
    localId: goal.id,
    title: goal.title,
    symbolId: goal.symbolId as PersonalGoalSymbolId,
    titleConfirmed: true,
  }))
}

function emptyDraft(): DraftGoal {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    symbolId: 'star',
    titleConfirmed: false,
  }
}

export default function MemberPersonalGoalsSheet({
  familyId,
  member,
  memberLabel,
  goals,
  isSelf,
  canAdmin,
  readOnly = false,
  onClose,
  onSaved,
}: MemberPersonalGoalsSheetProps) {
  const canEdit = !readOnly && memberCanEditPersonalGoals({ goals, isSelf, canAdmin })
  const [drafts, setDrafts] = useState<DraftGoal[]>(() =>
    goals.length > 0 ? draftsFromGoals(goals) : [emptyDraft()],
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingScrollToId, setPendingScrollToId] = useState<string | null>(null)
  const viewport = useVisualViewportLayout()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLLIElement>())

  const allTitlesConfirmed = drafts.every((draft) => draft.titleConfirmed)
  const showSaveFooter = canEdit && allTitlesConfirmed

  const footerPaddingBottom = viewport.keyboardOpen
    ? 'max(1rem, env(safe-area-inset-bottom))'
    : 'max(1.25rem, env(safe-area-inset-bottom))'

  const goalIdsByLocal = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      map.set(goal.id, goal.id)
    }
    return map
  }, [goals])

  useEffect(() => {
    if (!pendingScrollToId) return
    const card = cardRefs.current.get(pendingScrollToId)
    const container = scrollContainerRef.current
    if (card && container) {
      scrollElementToTopOfContainer(container, card)
      const input = card.querySelector('input')
      if (input instanceof HTMLInputElement) {
        window.setTimeout(() => input.focus({ preventScroll: true }), 80)
      }
    }
    setPendingScrollToId(null)
  }, [pendingScrollToId, drafts.length])

  const moveGoal = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= drafts.length) return

    const nextDrafts = [...drafts]
    const swap = nextDrafts[index]!
    nextDrafts[index] = nextDrafts[nextIndex]!
    nextDrafts[nextIndex] = swap
    setDrafts(nextDrafts)

    const orderedIds = nextDrafts
      .map((draft) => goalIdsByLocal.get(draft.localId) ?? goals.find((g) => g.title === draft.title)?.id)
      .filter((id): id is string => Boolean(id))

    if (orderedIds.length === goals.length && goals.length > 0) {
      const { error: reorderError } = await reorderMemberPersonalGoals(
        familyId,
        member,
        orderedIds,
        canAdmin,
      )
      if (reorderError) setError(reorderError.message)
      else {
        notifyFamilyDataChanged()
        onSaved()
      }
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const { error: saveError } = await saveMemberPersonalGoals({
      familyId,
      member,
      canAdmin,
      goals: drafts.map((draft) => ({
        title: draft.title,
        symbolId: draft.symbolId || 'star',
      })),
    })
    setLoading(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    notifyFamilyDataChanged()
    onSaved()
    onClose()
  }

  const handleGoalInputFocus = (draftLocalId: string) => {
    const card = cardRefs.current.get(draftLocalId)
    scrollElementToTopOfContainer(scrollContainerRef.current, card ?? null)
  }

  const handleTitleOk = (draftLocalId: string) => {
    const draft = drafts.find((row) => row.localId === draftLocalId)
    if (!draft || draft.title.trim().length === 0) return

    dismissMobileKeyboardAndZoom()
    setDrafts((prev) =>
      prev.map((row) => (row.localId === draftLocalId ? { ...row, titleConfirmed: true } : row)),
    )

    window.setTimeout(() => {
      const card = cardRefs.current.get(draftLocalId)
      scrollElementToTopOfContainer(scrollContainerRef.current, card ?? null)
    }, 120)
  }

  const addAnotherGoal = () => {
    const draft = emptyDraft()
    setDrafts((prev) => [...prev, draft])
    setPendingScrollToId(draft.localId)
  }

  const overlayStyle = viewport.keyboardOpen
    ? { top: viewport.offsetTop, height: viewport.height, bottom: 'auto' as const }
    : undefined

  const panelStyle = viewport.keyboardOpen
    ? { height: `${viewport.height}px`, maxHeight: `${viewport.height}px`, minHeight: 0 }
    : undefined

  return (
    <SheetPortal>
      <div
        className={`fixed inset-x-0 z-50 flex flex-col bg-slate-950/40 dark:bg-black/55 ${
          viewport.keyboardOpen ? '' : 'inset-y-0 justify-end'
        }`}
        style={overlayStyle}
        onClick={onClose}
        role="presentation"
      >
        <SheetViewportChrome viewport={viewport} />
        <div
          className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} flex min-h-0 flex-col rounded-t-3xl px-5 pt-5 shadow-2xl ${
            viewport.keyboardOpen ? 'flex-1 rounded-b-none' : 'max-h-[90dvh] min-h-[50dvh]'
          }`}
          style={panelStyle}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-400/70 dark:bg-slate-500" />

          <div className="shrink-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {readOnly ? 'Eigene Ziele' : goals.length > 0 ? 'Eigene Ziele' : 'Eigene Ziele anlegen'}
            </h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {readOnly
                ? `${memberLabel} — Ziele sind gesperrt, weil ein Admin XP vergeben hat.`
                : canAdmin && !isSelf
                  ? `Ziele für ${memberLabel} — Priorität von oben nach unten (1 = wichtigstes Ziel).`
                  : 'Was möchtest du dir als Nächstes wünschen? Wähle Text und Symbol — XP legt ein Admin fest.'}
            </p>
          </div>

          <div
            ref={scrollContainerRef}
            className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={showSaveFooter ? { paddingBottom: footerPaddingBottom } : undefined}
          >
            <ul className="space-y-4">
              {drafts.map((draft, index) => {
                const hasTitleLetter = draft.title.trim().length > 0

                return (
                  <li
                    key={draft.localId}
                    ref={(node) => {
                      if (node) cardRefs.current.set(draft.localId, node)
                      else cardRefs.current.delete(draft.localId)
                    }}
                    className="rounded-2xl border-2 border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/80"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-200">{index + 1}.</span>
                      {canEdit && drafts.length > 1 && allTitlesConfirmed ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => void moveGoal(index, -1)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-40 dark:border-slate-600"
                            aria-label="Nach oben"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === drafts.length - 1}
                            onClick={() => void moveGoal(index, 1)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-40 dark:border-slate-600"
                            aria-label="Nach unten"
                          >
                            ↓
                          </button>
                        </div>
                      ) : canEdit ? null : (
                        <span className="text-lg" aria-hidden>
                          {personalGoalSymbolEmoji(draft.symbolId || 'star')}
                        </span>
                      )}
                    </div>

                    {canEdit ? (
                      <>
                        <div className="mb-3 flex items-stretch gap-2">
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              setDrafts((prev) =>
                                prev.map((row) =>
                                  row.localId === draft.localId ? { ...row, title: event.target.value } : row,
                                ),
                              )
                            }
                            onFocus={() => handleGoalInputFocus(draft.localId)}
                            maxLength={120}
                            placeholder="z. B. Eis essen gehen"
                            className={`min-w-0 flex-1 ${FORM_FIELD_INPUT_CLASS}`}
                          />
                          {!draft.titleConfirmed ? (
                            <button
                              type="button"
                              disabled={!hasTitleLetter}
                              onClick={() => handleTitleOk(draft.localId)}
                              aria-label="Text bestätigen"
                              className={
                                hasTitleLetter
                                  ? `${PRESSABLE_3D_CLASS} shrink-0 rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 text-sm font-bold text-white`
                                  : `${PRESSABLE_3D_CLASS} shrink-0 rounded-xl border-2 border-slate-300 bg-gradient-to-b from-slate-200 to-slate-300 px-4 text-sm font-bold text-slate-500 disabled:opacity-100 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-400`
                              }
                            >
                              OK
                            </button>
                          ) : null}
                        </div>
                        {draft.titleConfirmed ? (
                          <PersonalGoalSymbolPicker
                            value={draft.symbolId}
                            onChange={(symbolId) =>
                              setDrafts((prev) =>
                                prev.map((row) => (row.localId === draft.localId ? { ...row, symbolId } : row)),
                              )
                            }
                          />
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{draft.title}</p>
                    )}
                  </li>
                )
              })}
            </ul>

            {canEdit && allTitlesConfirmed ? (
              <button
                type="button"
                onClick={addAnotherGoal}
                className={`${PRESSABLE_3D_CLASS} mt-4 w-full rounded-xl border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100`}
              >
                + Weiteres Ziel
              </button>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            {showSaveFooter ? (
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSave()}
                  className={`${PRESSABLE_3D_CLASS} flex-1 rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60`}
                >
                  {loading ? 'Speichern …' : 'Speichern'}
                </button>
              </div>
            ) : null}
          </div>

          {!canEdit ? (
            <div className="mt-4 shrink-0 pt-2" style={{ paddingBottom: footerPaddingBottom }}>
              <button
                type="button"
                onClick={onClose}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100`}
              >
                Schließen
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </SheetPortal>
  )
}
