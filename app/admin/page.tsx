'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AdminScrollPage from '../../components/AdminScrollPage'
import ChildMemberEditor from '../../components/ChildMemberEditor'
import DangerConfirmAction from '../../components/DangerConfirmAction'
import ParentMemberEditor from '../../components/ParentMemberEditor'
import FamilyQuestAccentEditor from '../../components/FamilyQuestAccentEditor'
import MemberRecoveryAdminSection from '../../components/MemberRecoveryAdminSection'
import PageHeaderBar from '../../components/PageHeaderBar'
import { notifyFamilyDataChanged, useFamily } from '../../components/FamilyProvider'
import { deleteChildById, deleteFamilyById } from '../../lib/family/admin'
import { clearFamilySession } from '../../lib/familySession'
import { CARD_SURFACE_CLASS, PRESSABLE_3D_CLASS } from '../../lib/appShell'
import { formatParentDisplayName } from '../../lib/family/familyDisplayName'

const ADMIN_ADD_LINK_CLASS = `${PRESSABLE_3D_CLASS} flex w-full items-center justify-center rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.55)] ring-1 ring-emerald-400/30 dark:border-emerald-500 dark:ring-emerald-600/40`

export default function AdminPage() {
  const router = useRouter()
  const { family, parent, activeChild, parents, children, loading, error, canAdmin, refresh } = useFamily()
  const [deleteFamilyError, setDeleteFamilyError] = useState<string | null>(null)
  const [deleteFamilyBusy, setDeleteFamilyBusy] = useState(false)
  const [childDeleteError, setChildDeleteError] = useState<string | null>(null)
  const [childDeleteBusy, setChildDeleteBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !canAdmin) {
      router.replace('/')
    }
  }, [loading, canAdmin, router])

  if (!loading && !canAdmin) {
    return null
  }

  const handleDeleteFamily = async (): Promise<boolean> => {
    if (!family) return false
    setDeleteFamilyBusy(true)
    setDeleteFamilyError(null)
    const { error: deleteError } = await deleteFamilyById(family.id)
    setDeleteFamilyBusy(false)
    if (deleteError) {
      setDeleteFamilyError(deleteError.message)
      return false
    }
    clearFamilySession()
    router.replace('/')
    router.refresh()
    return true
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

  return (
    <AdminScrollPage>
      <PageHeaderBar backHref="/" backLabel="Dashboard" compact />

      <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Admin</h1>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Wird geladen …</p>
      ) : (
        <>
          <section className={`${CARD_SURFACE_CLASS} mb-4 space-y-1.5 rounded-xl p-3`}>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Familie:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{family?.name ?? '—'}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Angemeldet als:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {parent
                  ? formatParentDisplayName(parent.display_name, parent.gender)
                  : (activeChild?.display_name ?? '—')}
              </span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Einladungscode:{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {family?.invite_code ?? '—'}
              </span>
            </p>
          </section>

          <section className="mb-4 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Erwachsene</h2>
            <Link href="/admin/adults/new" className={ADMIN_ADD_LINK_CLASS}>
              + Erwachsenen hinzufügen
            </Link>
            <div className="space-y-2">
              {parents.map((p) => (
                <ParentMemberEditor key={p.id} member={p} />
              ))}
            </div>
          </section>

          <section className="mb-4 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Kinder <span className="text-sm font-normal text-slate-500">({children.length}/6)</span>
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Noch keine Kinder.</p>
            ) : (
              <div className="space-y-2">
                {children.map((child) => (
                  <div key={child.id} className="space-y-1.5">
                    <ChildMemberEditor child={child} />
                    <DangerConfirmAction
                      triggerLabel="Familienmitglied entfernen"
                      confirmTitle={`${child.display_name} wirklich entfernen?`}
                      confirmDescription="Profil, Quest-Fortschritt und XP-Einträge dieses Kindes werden unwiderruflich gelöscht."
                      onConfirm={() => handleDeleteChild(child.id)}
                      busy={childDeleteBusy === child.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {family ? (
            <div className="mb-4">
              <FamilyQuestAccentEditor family={family} />
            </div>
          ) : null}

          {parent ? (
            <div className="mb-4">
              <MemberRecoveryAdminSection
                memberKind="parent"
                memberId={parent.id}
                recCode={parent.rec_code}
                recCodeOk={parent.rec_code_ok}
                appInstalled={parent.app_installed}
                appLater={parent.app_later}
              />
            </div>
          ) : activeChild ? (
            <div className="mb-4">
              <MemberRecoveryAdminSection
                memberKind="child"
                memberId={activeChild.id}
                recCode={activeChild.rec_code}
                recCodeOk={activeChild.rec_code_ok}
                appInstalled={activeChild.app_installed}
                appLater={activeChild.app_later}
              />
            </div>
          ) : null}

          <section aria-label="Gefährliche Aktionen" className="pt-2">
            <DangerConfirmAction
              triggerLabel="Familie löschen"
              confirmTitle="Familie unwiderrichlich löschen?"
              confirmDescription="Familie, alle Eltern- und Kinderprofile, Quests, XP-Einträge und der gesamte Verlauf werden dauerhaft entfernt."
              onConfirm={handleDeleteFamily}
              busy={deleteFamilyBusy}
              error={deleteFamilyError}
            />
          </section>
        </>
      )}
    </AdminScrollPage>
  )
}
