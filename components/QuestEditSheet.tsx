'use client'

import { useEffect, useMemo, useState } from 'react'

import DangerConfirmAction from './DangerConfirmAction'
import LifeXpConfirmSheet from './LifeXpConfirmSheet'
import LifeXpNotice from './LifeXpNotice'
import QuestAssigneePicker, {
  assigneesFromChoice,
  questAssigneeChoiceFromQuest,
  type QuestAssigneeChoice,
} from './QuestAssigneePicker'
import QuestDayToggle from './QuestDayToggle'
import QuestXpSlider from './QuestXpSlider'
import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { deleteQuest, updateQuestForAssignees } from '../lib/family/quests'
import {
  canSessionModifyQuest,
  canSessionDeleteQuest,
  questIsOpenForEditing,
} from '../lib/family/questConfirmation'
import type { QuestAssignee, QuestWithCompletion } from '../lib/family/types'
import {
  QUEST_HIGH_XP_CONFIRM_BODY,
  QUEST_HIGH_XP_CONFIRM_EYEBROW,
  questDayChoiceToDateKey,
  questHighXpConfirmTitle,
  questXpNeedsHighConfirm,
  taskDateToQuestDayChoice,
  type QuestDayChoice,
} from '../lib/family/questRules'
import { assigneesForFamilyQuestXpBudget, fetchMemberXpBudget } from '../lib/family/questXpBudget'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'
import { multilineTextInputProps, oneLineTextInputProps } from '../lib/formInputAutofill'

type QuestEditSheetProps = {
  quest: QuestWithCompletion | null
  open: boolean
  onClose: () => void
}

export default function QuestEditSheet({ quest, open, onClose }: QuestEditSheetProps) {
  const { family, parents, children, memberKind, parent, activeChild, session, canAdmin } = useFamily()
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
  const [highXpConfirmOpen, setHighXpConfirmOpen] = useState(false)

  const excludeMember = useMemo((): QuestAssignee | null => {
    if (memberKind === 'parent' && parent) return { type: 'parent', id: parent.id }
    if (memberKind === 'child' && activeChild) return { type: 'child', id: activeChild.id }
    return null
  }, [memberKind, parent, activeChild])

  const isCreator = quest && session ? canSessionModifyQuest(quest, session) : false
  const editable = quest ? questIsOpenForEditing(quest) : false
  const canEdit = Boolean(isCreator && editable && !quest?.recurring_template_id)
  const canDelete = quest && session ? canSessionDeleteQuest(quest, session, canAdmin) : false
  const isRecurringInstance = Boolean(quest?.recurring_template_id)

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

  const familyWide = assigneeChoice?.mode === 'all'
  const budgetAssignees = useMemo(
    () => assigneesForFamilyQuestXpBudget(selectedAssignees, familyWide, excludeMember),
    [selectedAssignees, familyWide, excludeMember],
  )

  const taskDate = questDayChoiceToDateKey(dayChoice)
  const maxSliderXp = remainingXp === null ? 10 : Math.min(10, Math.max(1, remainingXp))

  useEffect(() => {
    if (!family || !quest || !open || !canEdit || budgetAssignees.length === 0) {
      setRemainingXp(null)
      return
    }
    let cancelled = false
    void (async () => {
      let minRemaining = Number.POSITIVE_INFINITY
      for (const assignee of budgetAssignees) {
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
  }, [family, quest, open, canEdit, budgetAssignees, taskDate])

  if (!open || !quest || !family) return null

  const saveQuest = async () => {
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
    setHighXpConfirmOpen(false)
    onClose()
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit || selectedAssignees.length === 0) return

    if (questXpNeedsHighConfirm(xpReward) && xpReward > quest.xp_reward) {
      setHighXpConfirmOpen(true)
      return
    }

    await saveQuest()
  }

  const handleDelete = async (): Promise<boolean> => {
    if (!canDelete) return false
    setDeleteBusy(true)
    setDeleteError(null)
    const { error: removeError } = await deleteQuest(quest.id, family.id)
    setDeleteBusy(false)
    if (removeError) {
      setDeleteError(removeError.message)
      return false
    }
    notifyFamilyDataChanged()
    onClose()
    return true
  }

  const sheetTitle = canEdit ? 'Quest bearbeiten' : canDelete ? 'Quest-Eintrag entfernen' : 'Quest'

  return (
    <>
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
              {sheetTitle}
            </h2>
            {canEdit ? (
              <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">Von dir eingetragen — anpassen oder entfernen.</p>
            ) : canDelete && isRecurringInstance ? (
              <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
                Wiederkehrende Aufgabe — nur dieser Tages-Eintrag wird entfernt, die Vorlage bleibt bestehen.
              </p>
            ) : canDelete ? (
              <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
                Als Admin kannst du diesen offenen Quest-Eintrag entfernen.
              </p>
            ) : quest.fulfillmentStatus === 'done' ? (
              <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
                Quest ist erledigt — zum Entfernen zuerst den Abschluss zurücksetzen.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
                Nur der Ersteller oder ein Admin kann diese Quest verwalten.
              </p>
            )}
          </div>

          {canEdit ? (
            <form autoComplete="off" onSubmit={(e) => void handleSave(e)} className={`${CARD_SURFACE_CLASS} mx-4 my-4 space-y-4 rounded-2xl p-4`}>
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
                  {...oneLineTextInputProps('lifexp-edit-quest-title')}
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
                  {...multilineTextInputProps('lifexp-edit-quest-description')}
                />
              </div>
              <QuestXpSlider
                value={xpReward}
                onChange={setXpReward}
                maxAllowed={maxSliderXp}
                disabled={budgetAssignees.length > 0 && remainingXp === 0}
              />
              {error ? <LifeXpNotice tone="error">{error}</LifeXpNotice> : null}
              <button
                type="submit"
                disabled={loading || selectedAssignees.length === 0 || (budgetAssignees.length > 0 && remainingXp === 0)}
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
          ) : canDelete ? (
            <div className={`${CARD_SURFACE_CLASS} mx-4 my-4 space-y-4 rounded-2xl p-4`}>
              <p className="font-bold text-slate-900 dark:text-slate-100">{quest.title}</p>
              {quest.description ? (
                <p className="text-sm text-slate-950 dark:text-slate-400">{quest.description}</p>
              ) : null}
              <DangerConfirmAction
                triggerLabel="Eintrag entfernen"
                confirmTitle="Quest-Eintrag wirklich entfernen?"
                confirmDescription={
                  isRecurringInstance
                    ? 'Dieser Tages-Eintrag verschwindet. Die wiederkehrende Vorlage und künftige Tage bleiben unverändert.'
                    : 'Die Quest verschwindet aus Family-Quests. Noch nicht bestätigte Fortschritte gehen verloren.'
                }
                onConfirm={handleDelete}
                busy={deleteBusy}
                error={deleteError}
              />
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="font-bold text-slate-900 dark:text-slate-100">{quest.title}</p>
              {quest.description ? (
                <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">{quest.description}</p>
              ) : null}
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>

      {highXpConfirmOpen ? (
        <LifeXpConfirmSheet
          eyebrow={QUEST_HIGH_XP_CONFIRM_EYEBROW}
          emoji="🎯"
          title={questHighXpConfirmTitle(xpReward)}
          body={QUEST_HIGH_XP_CONFIRM_BODY}
          confirmLabel="Änderungen speichern"
          confirmBusy={loading}
          onConfirm={() => void saveQuest()}
          onCancel={() => setHighXpConfirmOpen(false)}
        />
      ) : null}
    </>
  )
}
