'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AdminScrollPage from '../../../components/AdminScrollPage'
import DangerConfirmAction from '../../../components/DangerConfirmAction'
import FamilyQuestAccentEditor from '../../../components/FamilyQuestAccentEditor'
import MemberRecoveryAdminSection from '../../../components/MemberRecoveryAdminSection'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { notifyFamilyDataChanged, useFamily } from '../../../components/FamilyProvider'
import { deleteFamilyById } from '../../../lib/family/admin'
import { markSetupGuideAdminVisited } from '../../../lib/family/setupGuide'
import { resetLifeXpFamilyClientState } from '../../../lib/familySession'
import { MUTED_BODY_TEXT_CLASS } from '../../../lib/appShell'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { family, parent, activeChild, loading, error, canAdmin } = useFamily()
  const [deleteFamilyError, setDeleteFamilyError] = useState<string | null>(null)
  const [deleteFamilyBusy, setDeleteFamilyBusy] = useState(false)

  useEffect(() => {
    if (!family) return
    void (async () => {
      await markSetupGuideAdminVisited(family)
      notifyFamilyDataChanged()
    })()
  }, [family])

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
    resetLifeXpFamilyClientState()
    router.replace('/')
    router.refresh()
    return true
  }

  return (
    <AdminScrollPage>
      <PageHeaderBar backHref="/admin" backLabel="Admin" compact />

      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">Weitere Einstellungen</h1>
      <p className={`mb-4 ${MUTED_BODY_TEXT_CLASS}`}>
        Quest-Farben, Sicherheit, App und gefährliche Aktionen.
      </p>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={MUTED_BODY_TEXT_CLASS}>Wird geladen …</p>
      ) : (
        <div className="space-y-4">
          {family ? (
            <FamilyQuestAccentEditor family={family} />
          ) : null}

          {parent ? (
            <MemberRecoveryAdminSection
              memberKind="parent"
              memberId={parent.id}
              recCode={parent.rec_code}
              recCodeOk={parent.rec_code_ok}
              appInstalled={parent.app_installed}
              appLater={parent.app_later}
            />
          ) : activeChild ? (
            <MemberRecoveryAdminSection
              memberKind="child"
              memberId={activeChild.id}
              recCode={activeChild.rec_code}
              recCodeOk={activeChild.rec_code_ok}
              appInstalled={activeChild.app_installed}
              appLater={activeChild.app_later}
            />
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
        </div>
      )}
    </AdminScrollPage>
  )
}
