'use client'

import { useEffect, useMemo, useState } from 'react'

import DangerConfirmAction from './DangerConfirmAction'
import QuestAssigneePicker, {
  assigneesFromChoice,
  questAssigneeChoiceFromQuest,
  type QuestAssigneeChoice,
} from './QuestAssigneePicker'
import QuestDayToggle from './QuestDayToggle'
import QuestXpSlider from './QuestXpSlider'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { deleteQuestByCreator, updateQuestForAssignees } from '../lib/family/quests'
import { canSessionModifyQuest, questIsOpenForEditing } from '../lib/family/questConfirmation'
import type { QuestAssignee, QuestWithCompletion } from '../lib/family/types'
import {
  QUEST_XP_HIGH_CONFIRM_THRESHOLD,
  questDayChoiceToDateKey,
  taskDateToQuestDayChoice,
  type QuestDayChoice,
} from '../lib/family/questRules'
import { fetchMemberXpBudget } from '../lib/family/questXpBudget'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type QuestEditSheetProps = {
  quest: QuestWithCompletion | null
  open: boolean
  onClose: () => void
}

export default function QuestEditSheet({ quest, open, onClose }: QuestEditSheetProps) {
  const { family, parents, children, memberKind, parent, activeChild, session } = useFamily()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpReward, setXpReward] = useState(3)
  const [dayChoice, setDayChoice] = useState<QuestDayChoice>('today')
  const [assigneeChoice, setAssigneeChoice] = useState<QuestAssigneeChoice | null>(null)
  const [remainingXp, setRemainingXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [visible, setVisible] = useState(false)

  const excludeMember = useMemo((): QuestAssignee | null => {
    if (memberKind === 'parent' && parent) return { type: 'parent', id: parent.id }
    if (memberKind === 'child' && activeChild) return { type: 'child', id: activeChild.id }
    return null
  }, [memberKind, parent, activeChild])

  const isCreator = quest && session ? canSessionModifyQuest(quest, session) : false
  const editable = quest ? questIsOpenForEditing(quest) : false

  useEffect(() => {
    if (!quest || !open) return
    setTitle(quest.title)
    setDescription(quest.description ?? '')
    setXpReward(quest.xp_reward)
    setDayChoice(taskDateToQuestDayChoice(quest.task_date))
    setAssigneeChoice(questAssigneeChoiceFromQuest(quest))
    setError(null)
    setDeleteError(null)
  }, [quest, open])

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  const selectedAssignees = useMemo(
    () => assigneesFromChoice(assigneeChoice, parents, children, excludeMember),
    [assigneeChoice, parents, children, excludeMember],
  )

  const taskDate = questDayChoiceToDateKey(dayChoice)
  const maxSliderXp = remainingXp === null ? 10 : Math.min(10, Math.max(1, remainingXp))

  useEffect(() => {
    if (!family || !quest || !open || !editable || selectedAssignees.length === 0) {
      setRemainingXp(null)
      return
    }
    let cancelled = false
    void (async () => {
      let minRemaining = Number.POSITIVE_INFINITY
      for (const assignee of selectedAssignees) {
        const { budget, error: budgetError } = await fetchMemberXpBudget({
          familyId: family.id,
          memberType: assignee.type,
          memberId: assignee.id,
          taskDate,
          excludeQuestId: quest.id,
        })
        if (cancelled) return
        if (budgetError) {
          setRemainingXp(null)
          return
        }
        minRemaining = Math.min(minRemaining, budget.remainingXp)
      }
      if (cancelled) return
      const nextRemaining = Number.isFinite(minRemaining) ? minRemaining : 0
      setRemainingXp(nextRemaining)
      setXpReward((prev) => Math.min(prev, Math.max(1, Math.min(10, nextRemaining))))
    })()
    return () => {
      cancelled = true
    }
  }, [family, quest, open, editable, selectedAssignees, taskDate])

  if (!open || !quest || !family) return null

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editable || selectedAssignees.length === 0) return

    if (xpReward >= QUEST_XP_HIGH_CONFIRM_THRESHOLD && xpReward > quest.xp_reward) {
      const ok = window.confirm('Ist dir das wirklich so wichtig?')
      if (!ok) return
    }

    setLoading(true)
    setError(null)

    const { error: saveError } = await updateQuestForAssignees({
      questId: quest.id,
      familyId: family.id,
      title,
      description,
      xpReward,
      taskDate,
      assignees: selectedAssignees,
    })

    setLoading(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    notifyFamilyDataChanged()
    onClose()
  }

  const handleDelete = async (): Promise<boolean> => {
    if (!editable) return false
    setDeleteBusy(true)
    setDeleteError(null)
    const { error: removeError } = await deleteQuestByCreator(quest.id, family.id)
    setDeleteBusy(false)
    if (removeError) {
      setDeleteError(removeError.message)
      return false
    }
    notifyFamilyDataChanged()
    onClose()
    return true
  }

  return (
    <div
      className={`fixed inset-0 z-[115] flex items-end justify-center transition-opacity duration-300 sm:items-center ${
        visible ? 'bg-slate-950/50 opacity-100' : 'pointer-events-none bg-slate-950/0 opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-edit-sheet-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md transform px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out sm:px-0 sm:pb-0 ${
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overflow-hidden rounded-t-3xl border-2 border-slate-300/90 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-950 sm:rounded-3xl">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300/80 dark:bg-slate-600 sm:hidden" aria-hidden />
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 id="quest-edit-sheet-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Quest bearbeiten
            </h2>
            {!isCreator ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Nur der Ersteller kann diese Quest ändern.
              </p>
            ) : !editable ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Schon in Bearbeitung — Ändern oder Löschen nicht mehr möglich.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Von dir eingetragen — anpassen oder entfernen.</p>
            )}
          </div>

          {isCreator && editable ? (
            <form onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} mx-4 my-4 space-y-4 rounded-2xl p-4`}>
              <QuestAssigneePicker
                parents={parents}
                children={children}
                value={assigneeChoice}
                onChange={setAssigneeChoice}
                excludeMember={excludeMember}
              />
              <QuestDayToggle value={dayChoice} onChange={setDayChoice} />
              <div>
                <label htmlFor="edit-quest-title" className="mb-1 block text-sm font-semibold">
                  Was soll gemacht werden?
                </label>
                <input
                  id="edit-quest-title"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div>
                <label htmlFor="edit-quest-desc" className="mb-1 block text-sm font-semibold">
                  Notiz (optional)
                </label>
                <textarea
                  id="edit-quest-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <QuestXpSlider
                value={xpReward}
                onChange={setXpReward}
                maxAllowed={maxSliderXp}
                disabled={selectedAssignees.length > 0 && remainingXp === 0}
              />
              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading || selectedAssignees.length === 0 || remainingXp === 0}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-60`}
              >
                {loading ? 'Wird gespeichert …' : 'Änderungen speichern'}
              </button>
              <DangerConfirmAction
                triggerLabel="Quest löschen"
                confirmTitle="Quest wirklich löschen?"
                confirmDescription="Die Quest verschwindet aus Family-Quests. Noch nicht bestätigte Fortschritte gehen verloren."
                onConfirm={handleDelete}
                busy={deleteBusy}
                error={deleteError}
              />
            </form>
          ) : (
            <div className="px-5 py-4">
              <p className="font-bold text-slate-900 dark:text-slate-100">{quest.title}</p>
              {quest.description ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{quest.description}</p>
              ) : null}
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
