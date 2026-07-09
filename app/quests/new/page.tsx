'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import QuestAssigneePicker, {
  assigneesFromChoice,
  type QuestAssigneeChoice,
} from '../../../components/QuestAssigneePicker'
import QuestDayToggle from '../../../components/QuestDayToggle'
import QuestXpSlider from '../../../components/QuestXpSlider'
import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { createQuestsForAssignees } from '../../../lib/family/quests'
import type { QuestAssignee } from '../../../lib/family/types'
import {
  QUEST_XP_HIGH_CONFIRM_THRESHOLD,
  QUEST_XP_MIN,
  QUEST_HIGH_XP_CONFIRM_BODY,
  QUEST_HIGH_XP_CONFIRM_EYEBROW,
  questDayChoiceToDateKey,
  questHighXpConfirmTitle,
  questXpNeedsHighConfirm,
  type QuestDayChoice,
} from '../../../lib/family/questRules'
import { assigneesForFamilyQuestXpBudget, budgetAssigneesCacheKey, fetchMemberXpBudget } from '../../../lib/family/questXpBudget'
import { questAssignmentsTableReady } from '../../../lib/family/questAssignments'
import {
  isSoloFamily,
  markSetupGuideQuestVisited,
  soloQuestBlockedMessage,
} from '../../../lib/family/setupGuide'
import FamilySetupGuideBubble from '../../../components/FamilySetupGuideBubble'
import LifeXpConfirmSheet from '../../../components/LifeXpConfirmSheet'
import LifeXpNotice from '../../../components/LifeXpNotice'
import { usePlusDiscoverHeader } from '../../../hooks/usePlusDiscoverHeader'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../../lib/appShell'
import { multilineTextInputProps, oneLineTextInputProps } from '../../../lib/formInputAutofill'

export default function NewQuestPage() {
  const router = useRouter()
  const { family, parents, children, memberKind, parent, activeChild } = useFamily()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpReward, setXpReward] = useState(3)
  const [dayChoice, setDayChoice] = useState<QuestDayChoice>('today')
  const [assigneeChoice, setAssigneeChoice] = useState<QuestAssigneeChoice | null>(null)
  const [remainingXp, setRemainingXp] = useState<number | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const budgetRequestRef = useRef(0)
  const [familyQuestsReady, setFamilyQuestsReady] = useState<boolean | null>(null)
  const [highXpConfirmOpen, setHighXpConfirmOpen] = useState(false)
  const { headerAction: plusHeaderAction, portals: plusPortals } = usePlusDiscoverHeader()

  const excludeMember = useMemo((): QuestAssignee | null => {
    if (memberKind === 'parent' && parent) return { type: 'parent', id: parent.id }
    if (memberKind === 'child' && activeChild) return { type: 'child', id: activeChild.id }
    return null
  }, [memberKind, parent?.id, activeChild?.id])

  const selectedAssignees = useMemo(
    () => assigneesFromChoice(assigneeChoice, parents, children, excludeMember),
    [assigneeChoice, parents, children, excludeMember],
  )

  const familyWide = assigneeChoice?.mode === 'all'
  const taskDate = questDayChoiceToDateKey(dayChoice)

  const budgetAssignees = useMemo(() => {
    if (!assigneeChoice || selectedAssignees.length === 0) return []
    return assigneesForFamilyQuestXpBudget(selectedAssignees, familyWide, excludeMember)
  }, [assigneeChoice, selectedAssignees, familyWide, excludeMember])

  const budgetCheckKey = useMemo(() => {
    if (!family?.id || budgetAssignees.length === 0) return ''
    const base = budgetAssigneesCacheKey(family.id, taskDate, budgetAssignees)
    const xpSnapshot = budgetAssignees
      .map((assignee) => {
        const todayXp =
          assignee.type === 'parent'
            ? (parents.find((row) => row.id === assignee.id)?.todayXp ?? 0)
            : (children.find((row) => row.id === assignee.id)?.todayXp ?? 0)
        return `${assignee.type}:${assignee.id}:${todayXp}`
      })
      .sort()
      .join(',')
    return `${base}|${xpSnapshot}`
  }, [family?.id, budgetAssignees, taskDate, parents, children])

  const questGuideTrackedRef = useRef<string | null>(null)
  const soloFamily = isSoloFamily(parents.length, children.length)
  const soloHint = soloQuestBlockedMessage()
  const showSoloHint = soloFamily && Boolean(family)

  useEffect(() => {
    if (!family?.id || soloFamily) return
    if (questGuideTrackedRef.current === family.id) return
    questGuideTrackedRef.current = family.id
    void markSetupGuideQuestVisited(family, { parentCount: parents.length, childCount: children.length })
  }, [family?.id, soloFamily, parents.length, children.length])

  const maxSliderXp = remainingXp === null ? 10 : Math.min(10, Math.max(1, remainingXp))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { ready } = await questAssignmentsTableReady()
      if (!cancelled) setFamilyQuestsReady(ready)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!family?.id || !budgetCheckKey || selectedAssignees.length === 0) {
      setRemainingXp(null)
      setBudgetError(null)
      setBudgetLoading(false)
      return
    }

    const assignees = assigneesForFamilyQuestXpBudget(selectedAssignees, familyWide, excludeMember)

    if (assignees.length === 0) {
      setRemainingXp(null)
      setBudgetError(null)
      setBudgetLoading(false)
      return
    }

    const requestId = ++budgetRequestRef.current
    setBudgetLoading(true)
    setBudgetError(null)
    const familyId = family.id

    void (async () => {
      try {
        let minRemaining = Number.POSITIVE_INFINITY
        for (const assignee of assignees) {
          const { budget, error: fetchError } = await fetchMemberXpBudget({
            familyId,
            memberType: assignee.type,
            memberId: assignee.id,
            taskDate,
          })
          if (budgetRequestRef.current !== requestId) return
          if (fetchError) {
            setRemainingXp(null)
            setBudgetError(fetchError.message)
            return
          }
          minRemaining = Math.min(minRemaining, budget.remainingXp)
        }
        if (budgetRequestRef.current !== requestId) return
        const nextRemaining = Number.isFinite(minRemaining) ? minRemaining : 0
        setRemainingXp(nextRemaining)
        setXpReward((prev) => Math.min(prev, Math.max(1, Math.min(10, nextRemaining))))
      } finally {
        if (budgetRequestRef.current === requestId) {
          setBudgetLoading(false)
        }
      }
    })()
  }, [budgetCheckKey, family?.id, selectedAssignees, familyWide, excludeMember, taskDate])

  if (!family) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (soloFamily) {
      setError(soloHint.body)
      return
    }

    if (selectedAssignees.length === 0) {
      setError('Bitte mindestens ein Familienmitglied auswählen.')
      return
    }

    if (familyWide && familyQuestsReady === false) {
      setError(
        'Familien-Quests („Alle“) sind in der Datenbank noch nicht eingerichtet. Bitte Abschnitt 4 in supabase/pending_migrations.sql im Supabase SQL Editor ausführen.',
      )
      return
    }

    if (budgetLoading) return

    if (budgetError) {
      setError(budgetError)
      return
    }

    if (budgetAssignees.length > 0 && remainingXp !== null && remainingXp < xpReward) {
      setError(
        familyWide
          ? `Für mindestens ein Familienmitglied sind an dem Tag nur noch ${remainingXp} XP frei — wähle weniger XP oder „Morgen“.`
          : `An dem Tag sind nur noch ${remainingXp} XP frei — wähle weniger XP oder „Morgen“.`,
      )
      return
    }

    if (questXpNeedsHighConfirm(xpReward)) {
      setHighXpConfirmOpen(true)
      return
    }

    await submitQuest()
  }

  const submitQuest = async () => {
    if (!family) return
    setLoading(true)
    setError(null)

    try {
      const { error: createError } = await createQuestsForAssignees({
        familyId: family.id,
        title,
        description,
        xpReward,
        taskDate,
        assignees: selectedAssignees,
      })

      if (createError) {
        setError(createError.message)
        return
      }

      notifyFamilyDataChanged()
      router.push('/quests')
    } finally {
      setLoading(false)
      setHighXpConfirmOpen(false)
    }
  }

  const submitLabel =
    assigneeChoice?.mode === 'all'
      ? 'Quest für alle eintragen'
      : selectedAssignees.length > 1
        ? `Quest für ${selectedAssignees.length} eintragen`
        : 'Quest eintragen'
  const submitBlockedByXp = budgetAssignees.length > 0 && !budgetLoading && remainingXp !== null && remainingXp < xpReward
  const canSubmit =
    selectedAssignees.length > 0 &&
    !loading &&
    !budgetLoading &&
    !budgetError &&
    !soloFamily &&
    !(familyWide && familyQuestsReady === false)

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar
        backHref="/quests"
        backLabel="Family-Quests"
        headerAction={plusHeaderAction}
      />
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Quest eintragen</h1>
      <p className="mb-4 text-sm text-slate-950 dark:text-slate-400">
        Für ein anderes Familienmitglied — heute oder morgen, max. 10 XP pro Quest und 30 XP pro Tag.
      </p>
      <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
        <QuestAssigneePicker
          parents={parents}
          children={children}
          value={assigneeChoice}
          onChange={setAssigneeChoice}
          excludeMember={excludeMember}
        />
        <QuestDayToggle value={dayChoice} onChange={setDayChoice} />
        <div>
          <label htmlFor="quest-title" className="mb-1 block text-sm font-semibold">
            Was soll gemacht werden?
          </label>
          <input
            id="quest-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Zimmer aufräumen"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-lg font-bold leading-snug text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            {...oneLineTextInputProps('lifexp-quest-title')}
          />
        </div>
        <div>
          <label htmlFor="quest-desc" className="mb-1 block text-sm font-semibold">
            Notiz (optional)
          </label>
          <textarea
            id="quest-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
            {...multilineTextInputProps('lifexp-quest-description')}
          />
        </div>
        <QuestXpSlider
          value={xpReward}
          onChange={setXpReward}
          maxAllowed={maxSliderXp}
          disabled={budgetAssignees.length > 0 && remainingXp !== null && remainingXp < QUEST_XP_MIN}
        />
        {familyWide && familyQuestsReady === false ? (
          <LifeXpNotice tone="warning">
            Familien-Quests („Alle“) brauchen noch eine Datenbank-Migration: Abschnitt 4 in{' '}
            <code className="text-xs">supabase/pending_migrations.sql</code> im Supabase SQL Editor ausführen.
          </LifeXpNotice>
        ) : null}
        {budgetAssignees.length > 0 && budgetLoading ? (
          <p className="text-xs text-slate-950 dark:text-slate-400">XP-Budget wird geprüft …</p>
        ) : null}
        {budgetError ? (
          <LifeXpNotice tone="warning">
            XP-Budget konnte nicht geladen werden: {budgetError}
            {budgetError.toLowerCase().includes('task_date') ||
            budgetError.toLowerCase().includes('creator_confirmed') ? (
              <>
                {' '}
                Bitte fehlende Quest-Migrationen in{' '}
                <code className="text-xs">supabase/pending_migrations.sql</code> (Abschnitte 7–8) ausführen.
              </>
            ) : null}
          </LifeXpNotice>
        ) : null}
        {budgetAssignees.length > 0 && remainingXp !== null ? (
          <LifeXpNotice tone="info">
            {familyWide || selectedAssignees.length > 1 ? (
              <>
                Für die ausgewählten Familienmitglieder sind an dem Tag noch mindestens{' '}
                <strong>{remainingXp} XP</strong> frei (max. 30 pro Person).
              </>
            ) : (
              <>
                An dem Tag sind für diese Person noch <strong>{remainingXp} XP</strong> frei (max. 30 pro Tag).
              </>
            )}
          </LifeXpNotice>
        ) : null}
        {submitBlockedByXp ? (
          <LifeXpNotice tone="warning">
            Für mindestens ein Familienmitglied reicht das Tages-XP-Limit nicht — wähle weniger XP oder „Morgen“,
            dann erneut tippen.
          </LifeXpNotice>
        ) : null}
        {error ? <LifeXpNotice tone="error">{error}</LifeXpNotice> : null}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {loading ? 'Wird gespeichert …' : budgetLoading && familyWide ? 'XP wird geprüft …' : submitLabel}
        </button>
      </form>

      {showSoloHint ? (
        <FamilySetupGuideBubble
          title={soloHint.title}
          body={soloHint.body}
          target="admin"
          showArrow={false}
          showBrandMark={false}
          onDismiss={() => router.push('/admin')}
        />
      ) : null}

      {highXpConfirmOpen ? (
        <LifeXpConfirmSheet
          eyebrow={QUEST_HIGH_XP_CONFIRM_EYEBROW}
          emoji="🎯"
          title={questHighXpConfirmTitle(xpReward)}
          body={QUEST_HIGH_XP_CONFIRM_BODY}
          confirmLabel={submitLabel}
          confirmBusy={loading}
          onConfirm={() => void submitQuest()}
          onCancel={() => setHighXpConfirmOpen(false)}
        />
      ) : null}

      {plusPortals}
    </main>
  )
}
