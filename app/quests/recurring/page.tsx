'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import FamilyPlusPaywall from '../../../components/FamilyPlusPaywall'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { usePlusDiscoverHeader } from '../../../hooks/usePlusDiscoverHeader'
import { recurringScheduleLabel } from '../../../lib/family/recurringQuestSchedule'
import {
  fetchRecurringQuestTemplates,
  pauseRecurringQuestTemplate,
  reactivateRecurringQuestTemplate,
} from '../../../lib/family/recurringQuests'
import type { RecurringQuestTemplate } from '../../../lib/family/types'
import { formatParentDisplayName } from '../../../lib/family/familyDisplayName'
import { CARD_SURFACE_CLASS, MAIN_PAGE_INSET_CLASS, MAIN_SHELL_CLASS, PRESSABLE_3D_CLASS } from '../../../lib/appShell'

function assigneeSummary(
  template: RecurringQuestTemplate,
  parents: ReturnType<typeof useFamily>['parents'],
  children: ReturnType<typeof useFamily>['children'],
): string {
  if (template.assignees.length === 0) return '—'
  if (template.assignees.length > 1) return `${template.assignees.length} Familienmitglieder`
  const assignee = template.assignees[0]!
  if (assignee.type === 'child') {
    return children.find((c) => c.id === assignee.id)?.display_name ?? 'Kind'
  }
  const parent = parents.find((p) => p.id === assignee.id)
  return parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
}

function creatorSummary(
  template: RecurringQuestTemplate,
  parents: ReturnType<typeof useFamily>['parents'],
  children: ReturnType<typeof useFamily>['children'],
): string {
  if (template.created_by) {
    const parent = parents.find((p) => p.id === template.created_by)
    return parent ? formatParentDisplayName(parent.display_name, parent.gender) : 'Erwachsene'
  }
  if (template.created_by_child_id) {
    return children.find((c) => c.id === template.created_by_child_id)?.display_name ?? 'Kind'
  }
  return '—'
}

type RecurringQuestTemplateCardBodyProps = {
  template: RecurringQuestTemplate
  parents: ReturnType<typeof useFamily>['parents']
  children: ReturnType<typeof useFamily>['children']
}

function RecurringQuestTemplateCardBody({ template, parents, children }: RecurringQuestTemplateCardBodyProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 dark:text-slate-100">{template.title}</p>
          {template.description ? (
            <p className="mt-0.5 text-xs text-slate-950 dark:text-slate-400">{template.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          +{template.xp_reward} XP
        </span>
      </div>
      <p className="text-xs text-slate-950 dark:text-slate-400">
        {recurringScheduleLabel(template.schedule, template.weekly_weekday)}
      </p>
      <p className="text-xs text-slate-950 dark:text-slate-400">Für: {assigneeSummary(template, parents, children)}</p>
      <p className="text-xs text-slate-950 dark:text-slate-500">
        Angelegt von: {creatorSummary(template, parents, children)}
      </p>
      {!template.is_active ? (
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Ausgeplant — erzeugt vorübergehend keine Quests</p>
      ) : null}
    </>
  )
}

type RecurringQuestTemplateCardProps = {
  template: RecurringQuestTemplate
  parents: ReturnType<typeof useFamily>['parents']
  children: ReturnType<typeof useFamily>['children']
  canAdmin: boolean
  actionBusy: boolean
  onPause: () => void
  onReactivate: () => void
}

function RecurringQuestTemplateCard({
  template,
  parents,
  children,
  canAdmin,
  actionBusy,
  onPause,
  onReactivate,
}: RecurringQuestTemplateCardProps) {
  const editHref = `/quests/recurring/${template.id}/edit`

  return (
    <li
      className={`${CARD_SURFACE_CLASS} space-y-2 rounded-2xl p-4 ${
        template.is_active ? '' : 'border-amber-300/80 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20'
      }`}
    >
      {canAdmin ? (
        <Link
          href={editHref}
          className="block space-y-2 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
          aria-label={`${template.title} bearbeiten`}
        >
          <RecurringQuestTemplateCardBody template={template} parents={parents} children={children} />
        </Link>
      ) : (
        <div className="space-y-2">
          <RecurringQuestTemplateCardBody template={template} parents={parents} children={children} />
        </div>
      )}

      {canAdmin ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {template.is_active ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={onPause}
              className={`${PRESSABLE_3D_CLASS} rounded-xl border-2 border-amber-500 bg-gradient-to-b from-amber-100 to-amber-200/90 px-3 py-2 text-xs font-bold text-amber-950 disabled:opacity-60 dark:border-amber-700 dark:from-amber-950/50 dark:to-amber-900/40 dark:text-amber-100`}
            >
              {actionBusy ? '…' : 'Ausplanen'}
            </button>
          ) : (
            <button
              type="button"
              disabled={actionBusy}
              onClick={onReactivate}
              className={`${PRESSABLE_3D_CLASS} rounded-xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60`}
            >
              {actionBusy ? '…' : 'Wieder einplanen'}
            </button>
          )}
        </div>
      ) : null}
    </li>
  )
}

export default function RecurringQuestsPage() {
  const { family, parents, children, canAdmin } = useFamily()
  const { plusActive, headerAction: plusHeaderAction, portals: plusPortals, openPlusDiscover } =
    usePlusDiscoverHeader()
  const [templates, setTemplates] = useState<RecurringQuestTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!family) return
    setLoading(true)
    const { templates: rows, error: fetchError } = await fetchRecurringQuestTemplates(family.id)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setTemplates(rows)
  }, [family])

  useEffect(() => {
    void load()
  }, [load])

  const handlePause = async (templateId: string) => {
    if (!family) return
    setActionBusyId(templateId)
    setActionError(null)
    const { error: pauseErr } = await pauseRecurringQuestTemplate(templateId, family.id)
    setActionBusyId(null)
    if (pauseErr) {
      setActionError(pauseErr.message)
      return
    }
    setTemplates((prev) => prev.map((row) => (row.id === templateId ? { ...row, is_active: false } : row)))
    notifyFamilyDataChanged()
  }

  const handleReactivate = async (templateId: string) => {
    if (!family) return
    setActionBusyId(templateId)
    setActionError(null)
    const { error: reactivateErr } = await reactivateRecurringQuestTemplate(templateId, family.id)
    setActionBusyId(null)
    if (reactivateErr) {
      setActionError(reactivateErr.message)
      return
    }
    setTemplates((prev) => prev.map((row) => (row.id === templateId ? { ...row, is_active: true } : row)))
    notifyFamilyDataChanged()
  }

  if (!family) return null

  const activeTemplates = templates.filter((row) => row.is_active)
  const pausedTemplates = templates.filter((row) => !row.is_active)

  return (
    <main className={`${MAIN_SHELL_CLASS} ${MAIN_PAGE_INSET_CLASS} mx-auto w-full max-w-lg px-4`}>
      <PageHeaderBar
        backHref="/quests"
        backLabel="Family-Quests"
        headerAction={plusHeaderAction}
      />

      <FamilyPlusPaywall
        onDiscoverPlus={!canAdmin ? openPlusDiscover : undefined}
        featureTitle="Wiederkehrende Quests"
        featureDescription="Automatisch jeden Tag, an Arbeitstagen, alle 2 Tage oder wöchentlich — PLUS trägt passende Quests ein, sobald jemand die App öffnet."
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wiederkehrende Quests</h1>
            <p className="mt-1 text-sm text-slate-950 dark:text-slate-400">
              PLUS-Vorlagen — Admins tippen eine Aufgabe zum Bearbeiten an.
            </p>
          </div>
          {canAdmin ? (
            <Link
              href="/quests/recurring/new"
              className={`${PRESSABLE_3D_CLASS} inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-3.5 py-2.5 text-sm font-bold text-amber-950`}
            >
              + Neu
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Wird geladen …</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : templates.length === 0 ? (
          <div className={`${CARD_SURFACE_CLASS} rounded-2xl p-5 text-sm text-slate-950 dark:text-slate-300`}>
            Noch keine Vorlagen. Lege eine wiederkehrende Quest an — z. B. Zähne putzen jeden Tag.
          </div>
        ) : (
          <div className="space-y-6">
            {actionError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {actionError}
              </p>
            ) : null}

            {activeTemplates.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-slate-950 dark:text-slate-200">Eingeplant</h2>
                <ul className="space-y-2">
                  {activeTemplates.map((template) => (
                    <RecurringQuestTemplateCard
                      key={template.id}
                      template={template}
                      parents={parents}
                      children={children}
                      canAdmin={canAdmin}
                      actionBusy={actionBusyId === template.id}
                      onPause={() => void handlePause(template.id)}
                      onReactivate={() => void handleReactivate(template.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {pausedTemplates.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-amber-800 dark:text-amber-200">Ausgeplant</h2>
                <p className="text-xs text-slate-950 dark:text-slate-400">
                  Vorlagen bleiben gespeichert (z. B. Urlaub) — es werden keine neuen Tage erzeugt.
                </p>
                <ul className="space-y-2">
                  {pausedTemplates.map((template) => (
                    <RecurringQuestTemplateCard
                      key={template.id}
                      template={template}
                      parents={parents}
                      children={children}
                      canAdmin={canAdmin}
                      actionBusy={actionBusyId === template.id}
                      onPause={() => void handlePause(template.id)}
                      onReactivate={() => void handleReactivate(template.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </FamilyPlusPaywall>

      {plusPortals}
    </main>
  )
}
