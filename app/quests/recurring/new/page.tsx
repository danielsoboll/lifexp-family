'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import QuestAssigneePicker, {
  assigneesFromChoice,
  type QuestAssigneeChoice,
} from '../../../../components/QuestAssigneePicker'
import QuestXpSlider from '../../../../components/QuestXpSlider'
import RecurringQuestSchedulePicker from '../../../../components/RecurringQuestSchedulePicker'
import FamilyPlusPaywall from '../../../../components/FamilyPlusPaywall'
import { notifyFamilyDataChanged, useFamily } from '../../../../components/FamilyProvider'
import PageHeaderBar from '../../../../components/PageHeaderBar'
import { usePlusDiscoverHeader } from '../../../../hooks/usePlusDiscoverHeader'
import { cetWeekdayIndex, cetToday } from '../../../../lib/cetDate'
import { createRecurringQuestTemplate } from '../../../../lib/family/recurringQuests'
import type { QuestAssignee, RecurringQuestSchedule } from '../../../../lib/family/types'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../../../lib/appShell'
import { multilineTextInputProps, oneLineTextInputProps } from '../../../../lib/formInputAutofill'

export default function NewRecurringQuestPage() {
  const router = useRouter()
  const { family, parents, children, memberKind, parent, activeChild } = useFamily()
  const { plusActive, headerAction: plusHeaderAction, portals: plusPortals } = usePlusDiscoverHeader()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpReward, setXpReward] = useState(3)
  const [schedule, setSchedule] = useState<RecurringQuestSchedule>('daily')
  const [weeklyWeekday, setWeeklyWeekday] = useState(() => cetWeekdayIndex(cetToday()))
  const [assigneeChoice, setAssigneeChoice] = useState<QuestAssigneeChoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const submitRef = useRef(false)

  const excludeMember = useMemo((): QuestAssignee | null => {
    if (memberKind === 'parent' && parent) return { type: 'parent', id: parent.id }
    if (memberKind === 'child' && activeChild) return { type: 'child', id: activeChild.id }
    return null
  }, [memberKind, parent?.id, activeChild?.id])

  const selectedAssignees = useMemo(
    () => assigneesFromChoice(assigneeChoice, parents, children, excludeMember),
    [assigneeChoice, parents, children, excludeMember],
  )

  useEffect(() => {
    if (schedule !== 'weekly') return
    setWeeklyWeekday(cetWeekdayIndex(cetToday()))
  }, [schedule])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!family || submitRef.current) return
    if (selectedAssignees.length === 0) {
      setError('Bitte mindestens ein Familienmitglied auswählen.')
      return
    }

    submitRef.current = true
    setLoading(true)
    setError(null)

    const { error: createError } = await createRecurringQuestTemplate({
      familyId: family.id,
      title,
      description,
      xpReward,
      schedule,
      weeklyWeekday: schedule === 'weekly' ? weeklyWeekday : null,
      assignees: selectedAssignees,
    })

    submitRef.current = false
    setLoading(false)

    if (createError) {
      setError(createError.message)
      return
    }

    notifyFamilyDataChanged()
    router.replace('/quests/recurring')
  }

  if (!family) return null

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar
        backHref="/quests/recurring"
        backLabel="Wiederkehrend"
        headerAction={plusActive ? plusHeaderAction : undefined}
      />

      <FamilyPlusPaywall
        featureTitle="Wiederkehrende Quests"
        featureDescription="Automatisch jeden Tag, an Arbeitstagen, alle 2 Tage oder wöchentlich — PLUS trägt passende Quests ein, sobald jemand die App öffnet."
      >
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Wiederkehrende Quest</h1>
        <p className="mb-4 text-sm text-slate-950 dark:text-slate-400">
          Vorlage anlegen — LifeXP trägt die Quest automatisch ein, wenn der Rhythmus passt (heute & morgen).
        </p>

        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)} className={`${CARD_SURFACE_CLASS} space-y-4 rounded-2xl p-5`}>
          <QuestAssigneePicker
            parents={parents}
            children={children}
            value={assigneeChoice}
            onChange={setAssigneeChoice}
            excludeMember={excludeMember}
          />

          <RecurringQuestSchedulePicker
            schedule={schedule}
            weeklyWeekday={weeklyWeekday}
            onScheduleChange={setSchedule}
            onWeeklyWeekdayChange={setWeeklyWeekday}
          />

          <div>
            <label htmlFor="recurring-quest-title" className="mb-1 block text-sm font-semibold">
              Was soll gemacht werden?
            </label>
            <input
              id="recurring-quest-title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Zähne putzen"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
              {...oneLineTextInputProps('lifexp-recurring-quest-title')}
            />
          </div>

          <div>
            <label htmlFor="recurring-quest-desc" className="mb-1 block text-sm font-semibold">
              Notiz (optional)
            </label>
            <textarea
              id="recurring-quest-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
              {...multilineTextInputProps('lifexp-recurring-quest-description')}
            />
          </div>

          <QuestXpSlider value={xpReward} onChange={setXpReward} maxAllowed={10} />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || selectedAssignees.length === 0}
            className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60`}
          >
            {loading ? 'Wird gespeichert …' : 'Vorlage speichern'}
          </button>

          <p className="text-center text-xs text-slate-950 dark:text-slate-400">
            <Link href="/quests/new" className="font-semibold underline underline-offset-2">
              Nur für heute/morgen?
            </Link>{' '}
            → Einmalige Quest eintragen
          </p>
        </form>
      </FamilyPlusPaywall>

      {plusPortals}
    </main>
  )
}
