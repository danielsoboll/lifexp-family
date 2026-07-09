'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AdminScrollPage from '../../../components/AdminScrollPage'
import DangerConfirmAction from '../../../components/DangerConfirmAction'
import OrangeConfirmAction from '../../../components/OrangeConfirmAction'
import FamilyQuestAccentEditor from '../../../components/FamilyQuestAccentEditor'
import FamilyPlusAboCallout from '../../../components/FamilyPlusAboCallout'
import FamilyPlusBillingControls from '../../../components/FamilyPlusBillingControls'
import FamilyPlusPriceDisplay from '../../../components/FamilyPlusPriceDisplay'
import MemberRecoveryAdminSection from '../../../components/MemberRecoveryAdminSection'
import PageHeaderBar from '../../../components/PageHeaderBar'
import { useFamily, notifyFamilyDataChanged } from '../../../components/FamilyProvider'
import { PlusCheckoutProvider } from '../../../hooks/usePlusCheckout'
import { deleteFamilyById, resetFamilyProgressById } from '../../../lib/family/admin'
import { isFamilyPlus } from '../../../lib/family/familyPlus'
import { FAMILY_PLUS_TAGLINE } from '../../../lib/family/familyPlusFeatures'
import { markSetupGuideAdminVisited } from '../../../lib/family/setupGuide'
import { resetLifeXpFamilyClientState } from '../../../lib/familySession'
import { usePlusDiscoverHeader } from '../../../hooks/usePlusDiscoverHeader'
import { CARD_SURFACE_CLASS, MUTED_BODY_TEXT_CLASS } from '../../../lib/appShell'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { family, parent, activeChild, parents, children, loading, error, canAdmin, refresh } = useFamily()
  const [deleteFamilyError, setDeleteFamilyError] = useState<string | null>(null)
  const [deleteFamilyBusy, setDeleteFamilyBusy] = useState(false)
  const [resetFamilyError, setResetFamilyError] = useState<string | null>(null)
  const [resetFamilyBusy, setResetFamilyBusy] = useState(false)
  const { headerAction: plusHeaderAction, portals: plusPortals } = usePlusDiscoverHeader({
    gateHeader: false,
  })

  useEffect(() => {
    if (!family?.id) return
    void markSetupGuideAdminVisited(family, { parentCount: parents.length, childCount: children.length })
  }, [family?.id, parents.length, children.length])

  useEffect(() => {
    if (!loading && !canAdmin) {
      router.replace('/')
    }
  }, [loading, canAdmin, router])

  if (!loading && !canAdmin) {
    return null
  }

  const plusActive = isFamilyPlus(family)

  const handleResetFamily = async (): Promise<boolean> => {
    if (!family) return false
    setResetFamilyBusy(true)
    setResetFamilyError(null)
    const { error: resetError } = await resetFamilyProgressById(family.id)
    setResetFamilyBusy(false)
    if (resetError) {
      setResetFamilyError(resetError.message)
      return false
    }
    notifyFamilyDataChanged()
    await refresh()
    return true
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
      <PageHeaderBar backHref="/admin" backLabel="Admin" compact headerAction={plusHeaderAction} />

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
            <section className={`${CARD_SURFACE_CLASS} space-y-3 rounded-2xl p-4`}>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">LifeXP Family PLUS</h2>
                {!plusActive ? (
                  <p className={`mt-1 text-sm leading-relaxed text-slate-950 dark:text-slate-300`}>
                    {FAMILY_PLUS_TAGLINE}
                  </p>
                ) : null}
                {!plusActive ? (
                  <PlusCheckoutProvider>
                    <div className="mt-3 space-y-3">
                      <FamilyPlusPriceDisplay variant="hero" />
                      <FamilyPlusAboCallout showPrice={false} />
                      <FamilyPlusBillingControls family={family} compact showPriceBadge={false} showActiveWelcome={false} />
                    </div>
                  </PlusCheckoutProvider>
                ) : null}
              </div>
              {plusActive ? (
                <FamilyPlusBillingControls family={family} compact />
              ) : null}
            </section>
          ) : null}

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

          <section aria-label="Gefährliche Aktionen" className="space-y-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
            <OrangeConfirmAction
              triggerLabel="Familie zurücksetzen"
              confirmTitle="Alle XP und Historie für die bestehende Familie von 0 anfangen?"
              confirmDescription="Quest-Abschlüsse, Tages-XP, Verlauf, Belohnungs-Fortschritt und Zielstände dieser Familie werden gelöscht. Familie, Mitglieder und eingetragene Quests bleiben erhalten."
              onConfirm={handleResetFamily}
              busy={resetFamilyBusy}
              error={resetFamilyError}
            />
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

      {plusPortals}
    </AdminScrollPage>
  )
}
