'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import AdminScrollPage from '../../../components/AdminScrollPage'
import DangerConfirmAction from '../../../components/DangerConfirmAction'
import FamilyQuestAccentEditor from '../../../components/FamilyQuestAccentEditor'
import FamilyPlusAboCallout from '../../../components/FamilyPlusAboCallout'
import FamilyPlusBillingControls from '../../../components/FamilyPlusBillingControls'
import FamilyPlusPriceDisplay from '../../../components/FamilyPlusPriceDisplay'
import MemberRecoveryAdminSection from '../../../components/MemberRecoveryAdminSection'
import PageHeaderBar from '../../../components/PageHeaderBar'
import PlusLockHeaderButton from '../../../components/PlusLockHeaderButton'
import { useFamily } from '../../../components/FamilyProvider'
import { deleteFamilyById } from '../../../lib/family/admin'
import { familyPlusTarifLine, isFamilyPlus } from '../../../lib/family/familyPlus'
import {
  FAMILY_PLUS_ACTIVATED_BANNER,
  FAMILY_PLUS_CTA_LABEL,
  FAMILY_PLUS_TAGLINE,
} from '../../../lib/family/familyPlusFeatures'
import {
  hasSeenPlusActivatedNotice,
  markPlusActivatedNoticeSeen,
  PLUS_ACTIVATED_NOTICE_CHANGED_EVENT,
} from '../../../lib/family/plusActivatedNotice'
import { markSetupGuideAdminVisited } from '../../../lib/family/setupGuide'
import { resetLifeXpFamilyClientState } from '../../../lib/familySession'
import { usePlusDiscoverHeader } from '../../../hooks/usePlusDiscoverHeader'
import { CARD_SURFACE_CLASS, MUTED_BODY_TEXT_CLASS } from '../../../lib/appShell'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { family, parent, activeChild, parents, children, loading, error, canAdmin } = useFamily()
  const [deleteFamilyError, setDeleteFamilyError] = useState<string | null>(null)
  const [deleteFamilyBusy, setDeleteFamilyBusy] = useState(false)
  const [showActivatedBanner, setShowActivatedBanner] = useState(false)
  const { headerAction: plusHeaderAction, openPlusDiscover, portals: plusPortals } = usePlusDiscoverHeader({
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

  useEffect(() => {
    if (!family?.id || !isFamilyPlus(family)) {
      setShowActivatedBanner(false)
      return
    }
    const refresh = () => setShowActivatedBanner(!hasSeenPlusActivatedNotice(family.id))
    refresh()
    window.addEventListener(PLUS_ACTIVATED_NOTICE_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PLUS_ACTIVATED_NOTICE_CHANGED_EVENT, refresh)
  }, [family])

  if (!loading && !canAdmin) {
    return null
  }

  const plusActive = isFamilyPlus(family)

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
                <p className={`mt-1 text-sm leading-relaxed text-slate-950 dark:text-slate-300`}>
                  {FAMILY_PLUS_TAGLINE}
                </p>
                {!plusActive ? (
                  <div className="mt-3 space-y-3">
                    <FamilyPlusPriceDisplay variant="hero" />
                    <FamilyPlusAboCallout showPrice={false} />
                  </div>
                ) : null}
              </div>
              {plusActive && showActivatedBanner ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    {FAMILY_PLUS_ACTIVATED_BANNER}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      markPlusActivatedNoticeSeen(family.id)
                      setShowActivatedBanner(false)
                    }}
                    className="mt-2 text-xs font-semibold text-emerald-800 underline underline-offset-2 dark:text-emerald-200"
                  >
                    Verstanden
                  </button>
                </div>
              ) : null}
              {plusActive ? (
                <FamilyPlusBillingControls family={family} compact />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {familyPlusTarifLine(family)}
                  </p>
                  <PlusLockHeaderButton
                    variant="cta"
                    showLock={false}
                    label="LifeXP Family PLUS entdecken"
                    onClick={openPlusDiscover}
                  >
                    {FAMILY_PLUS_CTA_LABEL}
                  </PlusLockHeaderButton>
                </div>
              )}
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

          <section aria-label="Gefährliche Aktionen" className="pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
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
