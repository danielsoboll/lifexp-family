'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AdminScrollPage from '../../components/AdminScrollPage'
import ChildMemberEditor from '../../components/ChildMemberEditor'
import DangerConfirmAction from '../../components/DangerConfirmAction'
import FamilyInviteSharePanel from '../../components/FamilyInviteSharePanel'
import ParentMemberEditor from '../../components/ParentMemberEditor'
import PageHeaderBar from '../../components/PageHeaderBar'
import { notifyFamilyDataChanged, useFamily } from '../../components/FamilyProvider'
import { markSetupGuideAdminVisited } from '../../lib/family/setupGuide'
import { deleteChildById, deleteParentById } from '../../lib/family/admin'
import {
  childCanBeRemoved,
  memberHasCollectedDayXp,
  parentCanBeRemoved,
} from '../../lib/family/memberRemovable'
import { CARD_SURFACE_CLASS, HOME_BACK_LABEL, MUTED_BODY_TEXT_CLASS, PRESSABLE_3D_CLASS } from '../../lib/appShell'
import { formatParentDisplayName } from '../../lib/family/familyDisplayName'

const ADMIN_ADD_LINK_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center justify-center rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.55)] ring-1 ring-emerald-400/30 dark:border-emerald-500 dark:ring-emerald-600/40`

const ADMIN_SETTINGS_LINK_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center justify-center rounded-2xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-200/90 px-4 py-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:from-slate-800 dark:to-slate-950 dark:text-slate-100`

export default function AdminPage() {
  const router = useRouter()
  const { family, parent, activeChild, parents, children, loading, error, canAdmin, refresh, session } =
    useFamily()
  const [childDeleteError, setChildDeleteError] = useState<string | null>(null)
  const [childDeleteBusy, setChildDeleteBusy] = useState<string | null>(null)
  const [parentDeleteError, setParentDeleteError] = useState<string | null>(null)
  const [parentDeleteBusy, setParentDeleteBusy] = useState<string | null>(null)
  const [removableByKey, setRemovableByKey] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!family?.id) return
    void markSetupGuideAdminVisited(family, { parentCount: parents.length, childCount: children.length })
  }, [family?.id, parents.length, children.length])

  useEffect(() => {
    if (!loading && !canAdmin) {
      router.replace('/')
    }
  }, [loading, canAdmin, router])

  useEffect(() => {
    if (!family?.id) {
      setRemovableByKey({})
      return
    }

    let cancelled = false

    void (async () => {
      const next: Record<string, boolean> = {}

      await Promise.all([
        ...parents.map(async (member) => {
          const { hasXp } = await memberHasCollectedDayXp({
            familyId: family.id,
            memberKind: 'parent',
            memberId: member.id,
          })
          next[`parent:${member.id}`] = parentCanBeRemoved({
            parent: member,
            parents,
            sessionMemberKind: session?.memberKind ?? null,
            sessionMemberId: session?.memberId ?? null,
            hasXp,
          })
        }),
        ...children.map(async (member) => {
          const { hasXp } = await memberHasCollectedDayXp({
            familyId: family.id,
            memberKind: 'child',
            memberId: member.id,
          })
          next[`child:${member.id}`] = childCanBeRemoved(hasXp)
        }),
      ])

      if (!cancelled) setRemovableByKey(next)
    })()

    return () => {
      cancelled = true
    }
  }, [family?.id, parents, children, session?.memberKind, session?.memberId])

  if (!loading && !canAdmin) {
    return null
  }

  const handleDeleteChild = async (childId: string): Promise<boolean> => {
    if (!family) return false
    setChildDeleteBusy(childId)
    setChildDeleteError(null)
    const { error: deleteError } = await deleteChildById(childId, family.id)
    setChildDeleteBusy(null)
    if (deleteError) {
      setChildDeleteError(deleteError.message)
      return false
    }
    notifyFamilyDataChanged()
    await refresh()
    return true
  }

  const handleDeleteParent = async (parentId: string): Promise<boolean> => {
    if (!family) return false
    setParentDeleteBusy(parentId)
    setParentDeleteError(null)
    const { error: deleteError } = await deleteParentById(parentId, family.id)
    setParentDeleteBusy(null)
    if (deleteError) {
      setParentDeleteError(deleteError.message)
      return false
    }
    notifyFamilyDataChanged()
    await refresh()
    return true
  }

  return (
    <AdminScrollPage>
      <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} compact />

      <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Admin</h1>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={MUTED_BODY_TEXT_CLASS}>Wird geladen …</p>
      ) : (
        <>
          <section className={`${CARD_SURFACE_CLASS} mb-4 space-y-1.5 rounded-xl p-3`}>
            <p className={MUTED_BODY_TEXT_CLASS}>
              Familie:{' '}
              <span className="font-semibold text-slate-950 dark:text-slate-100">{family?.name ?? '—'}</span>
            </p>
            <p className={MUTED_BODY_TEXT_CLASS}>
              Angemeldet als:{' '}
              <span className="font-semibold text-slate-950 dark:text-slate-100">
                {parent
                  ? formatParentDisplayName(parent.display_name, parent.gender)
                  : (activeChild?.display_name ?? '—')}
              </span>
            </p>
            {family?.invite_code ? (
              <FamilyInviteSharePanel inviteCode={family.invite_code} familyName={family.name} />
            ) : (
              <p className={MUTED_BODY_TEXT_CLASS}>Einladungscode: —</p>
            )}
          </section>

          <section className="mb-4 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Erwachsene</h2>
            <Link href="/admin/adults/new" className={ADMIN_ADD_LINK_CLASS}>
              + Erwachsenen hinzufügen
            </Link>
            {parentDeleteError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {parentDeleteError}
              </p>
            ) : null}

            <div className="space-y-2">
              {parents.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <ParentMemberEditor member={p} />
                  {removableByKey[`parent:${p.id}`] ? (
                    <DangerConfirmAction
                      triggerLabel="Familienmitglied entfernen"
                      confirmTitle={`${formatParentDisplayName(p.display_name, p.gender)} wirklich entfernen?`}
                      confirmDescription="Profil und Zugang dieses Erwachsenen werden unwiderruflich gelöscht. Nur möglich, solange noch kein XP gesammelt wurde."
                      onConfirm={() => handleDeleteParent(p.id)}
                      busy={parentDeleteBusy === p.id}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Kinder <span className="text-sm font-normal text-slate-950 dark:text-slate-400">({children.length}/6)</span>
            </h2>
            <Link href="/children/new" className={ADMIN_ADD_LINK_CLASS}>
              + Kind hinzufügen
            </Link>

            {childDeleteError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {childDeleteError}
              </p>
            ) : null}

            {children.length === 0 ? (
              <p className="text-sm font-medium text-slate-950 dark:text-slate-300">Noch keine Kinder.</p>
            ) : (
              <div className="space-y-2">
                {children.map((child) => (
                  <div key={child.id} className="space-y-1.5">
                    <ChildMemberEditor child={child} />
                    {removableByKey[`child:${child.id}`] ? (
                      <DangerConfirmAction
                        triggerLabel="Familienmitglied entfernen"
                        confirmTitle={`${child.display_name} wirklich entfernen?`}
                        confirmDescription="Profil, Quest-Fortschritt und XP-Einträge dieses Kindes werden unwiderruflich gelöscht. Nur möglich, solange noch kein XP gesammelt wurde."
                        onConfirm={() => handleDeleteChild(child.id)}
                        busy={childDeleteBusy === child.id}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-10 pb-8">
            <Link href="/admin/settings" className={ADMIN_SETTINGS_LINK_CLASS}>
              Weitere Einstellungen
            </Link>
          </div>
        </>
      )}
    </AdminScrollPage>
  )
}
