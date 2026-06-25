'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import CreateFamilyPanel from './CreateFamilyPanel'
import FamilyDashboard from './FamilyDashboard'
import JoinFamilyPanel from './JoinFamilyPanel'
import OnboardingPromoBanner from './OnboardingPromoBanner'
import OnboardingRecoveryRestorePanel from './OnboardingRecoveryRestorePanel'
import SheetPortal from './SheetPortal'
import { useFamilyOnboardingBridge } from '../hooks/useFamilyOnboardingBridge'
import { useHappyAllPreviewCycle } from '../hooks/useHappyAllPreviewCycle'
import { bootstrapOnboardingBridge, flushOnboardingBridge, persistFamilyOnboardingDraft } from '../lib/family/onboardingBridge'
import { clearFamilyOnboardingDraft, loadFamilyOnboardingDraft } from '../lib/family/onboardingDraft'
import {
  ONBOARDING_PREVIEW_FAMILY_2_PROMO_DELAY_MS,
  onboardingPreviewFamily2PromoHideMs,
} from '../lib/family/onboardingPreviewFamily'
import { bootstrapPwaClientStorage } from '../lib/pwaClientStorage'
import { isStandaloneDisplayMode } from '../lib/pwaInstall'
import { CARD_SURFACE_CLASS, ONBOARDING_BACKDROP_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type SheetView = 'welcome' | 'join' | 'create' | 'restore'

function readResumeState(): { open: boolean; view: SheetView; panelKey: number } {
  bootstrapPwaClientStorage()
  bootstrapOnboardingBridge()
  const draft = loadFamilyOnboardingDraft()
  if (draft?.incomplete) {
    const shouldOpen = isStandaloneDisplayMode()
    return { open: shouldOpen, view: draft.mode, panelKey: 1 }
  }
  return { open: false, view: 'welcome', panelKey: 0 }
}

export default function WelcomeStartScreen() {
  const backdropScrollRef = useRef<HTMLDivElement>(null)
  const sheetScrollRef = useRef<HTMLDivElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetView, setSheetView] = useState<SheetView>('welcome')
  const [panelKey, setPanelKey] = useState(0)
  const [resumeChecked, setResumeChecked] = useState(false)
  const [promoVisible, setPromoVisible] = useState(false)
  const [family2PromoEligible, setFamily2PromoEligible] = useState(false)

  const sheetCloseTimerRef = useRef<number | undefined>(undefined)
  const promoDismissedForFamily2Ref = useRef(false)
  const promoHideTimerRef = useRef<number | undefined>(undefined)

  const dismissPromo = useCallback(() => {
    if (promoHideTimerRef.current !== undefined) {
      window.clearTimeout(promoHideTimerRef.current)
      promoHideTimerRef.current = undefined
    }
    promoDismissedForFamily2Ref.current = true
    setPromoVisible(false)
  }, [])

  const applyResumeFromBridge = useCallback(() => {
    const next = readResumeState()
    if (!next.open) return
    setSheetView(next.view)
    setSheetOpen(true)
  }, [])

  useFamilyOnboardingBridge({ onResume: applyResumeFromBridge })

  const backToWelcome = useCallback(() => {
    clearFamilyOnboardingDraft()
    flushOnboardingBridge()
    setSheetView('welcome')
    setPanelKey((key) => key + 1)
  }, [])

  useLayoutEffect(() => {
    const resume = readResumeState()
    setSheetView(resume.view)
    setPanelKey(resume.panelKey)
    if (resume.open) {
      setSheetOpen(true)
    }
    setResumeChecked(true)
    return () => {
      if (sheetCloseTimerRef.current !== undefined) {
        window.clearTimeout(sheetCloseTimerRef.current)
      }
    }
  }, [])

  const openWelcomeFromPromo = useCallback(() => {
    if (sheetCloseTimerRef.current !== undefined) {
      window.clearTimeout(sheetCloseTimerRef.current)
      sheetCloseTimerRef.current = undefined
    }
    setSheetView('welcome')
    setSheetOpen(true)
  }, [])

  const openSheet = useCallback(() => {
    if (sheetCloseTimerRef.current !== undefined) {
      window.clearTimeout(sheetCloseTimerRef.current)
      sheetCloseTimerRef.current = undefined
    }
    if (promoVisible) dismissPromo()
    const draft = loadFamilyOnboardingDraft()
    if (draft?.incomplete) {
      setSheetView(draft.mode)
      setPanelKey((key) => key + 1)
    } else {
      setSheetView('welcome')
    }
    setSheetOpen(true)
  }, [dismissPromo, promoVisible])

  const openRestoreSheet = useCallback(() => {
    if (sheetCloseTimerRef.current !== undefined) {
      window.clearTimeout(sheetCloseTimerRef.current)
      sheetCloseTimerRef.current = undefined
    }
    if (promoVisible) dismissPromo()
    setSheetView('restore')
    setSheetOpen(true)
  }, [dismissPromo, promoVisible])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    if (sheetCloseTimerRef.current !== undefined) {
      window.clearTimeout(sheetCloseTimerRef.current)
      sheetCloseTimerRef.current = undefined
    }
  }, [])

  const previewActive = resumeChecked && !sheetOpen
  const previewAlternate = useHappyAllPreviewCycle(previewActive, backdropScrollRef)

  useEffect(() => {
    if (!previewAlternate) {
      setFamily2PromoEligible(false)
      return
    }
    const showTimer = window.setTimeout(() => setFamily2PromoEligible(true), ONBOARDING_PREVIEW_FAMILY_2_PROMO_DELAY_MS)
    promoHideTimerRef.current = window.setTimeout(() => {
      dismissPromo()
    }, onboardingPreviewFamily2PromoHideMs())
    return () => {
      window.clearTimeout(showTimer)
      if (promoHideTimerRef.current !== undefined) {
        window.clearTimeout(promoHideTimerRef.current)
        promoHideTimerRef.current = undefined
      }
      setFamily2PromoEligible(false)
    }
  }, [previewAlternate, dismissPromo])

  useEffect(() => {
    if (!previewAlternate) {
      promoDismissedForFamily2Ref.current = false
    }
    if (!previewActive || !family2PromoEligible) {
      setPromoVisible(false)
      return
    }
    if (!promoDismissedForFamily2Ref.current) {
      setPromoVisible(true)
    }
  }, [previewActive, family2PromoEligible, previewAlternate])

  const showBackdropHint = previewActive && loadFamilyOnboardingDraft()?.incomplete

  return (
    <>
      {promoVisible ? (
        <OnboardingPromoBanner onActivate={openWelcomeFromPromo} onAutoDismiss={dismissPromo} />
      ) : null}

      <div
        ref={backdropScrollRef}
        className={`${ONBOARDING_BACKDROP_CLASS} overflow-y-auto overscroll-contain`}
        onClick={() => {
          if (!resumeChecked || sheetOpen) return
          openSheet()
        }}
        onKeyDown={(event) => {
          if (!resumeChecked || sheetOpen) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openSheet()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Tippen zum Starten"
      >
        <div className="pointer-events-none select-none">
          <FamilyDashboard
            preview
            previewScrollContainerRef={backdropScrollRef}
            previewAlternate={previewAlternate}
          />
        </div>
        {showBackdropHint ? (
          <p className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 text-center text-xs font-medium text-emerald-800/90 dark:text-emerald-200/90">
            Tippen zum Fortsetzen
          </p>
        ) : !sheetOpen && resumeChecked ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openRestoreSheet()
            }}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 text-center text-xs font-semibold text-slate-700/90 underline decoration-slate-500/50 underline-offset-2 hover:text-emerald-700 dark:text-slate-300/90 dark:hover:text-emerald-300"
          >
            Mit Code wiederherstellen
          </button>
        ) : null}
      </div>

      {sheetOpen ? (
        <SheetPortal>
          <div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-slate-950/35 dark:bg-black/50"
            onClick={closeSheet}
            role="presentation"
          >
            <div
              className={`lifexp-bottom-sheet ${CARD_SURFACE_CLASS} flex ${
                sheetView === 'welcome'
                  ? 'max-h-[50dvh] min-h-[50dvh]'
                  : sheetView === 'restore'
                    ? 'max-h-[70dvh] min-h-[60dvh]'
                    : 'max-h-[85dvh] min-h-[70dvh]'
              } flex-col rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl`}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-sheet-title"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-400/70 dark:bg-slate-500" />

              {sheetView === 'welcome' ? (
                <div className="lifexp-onboarding-sheet-reveal flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
                  <div>
                    <h1
                      id="welcome-sheet-title"
                      className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
                    >
                      Willkommen bei LifeXP Family
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-950 dark:text-slate-400">
                      Verbinde dich mit deiner Familie oder lege eine neue an — als Elternteil oder Kind
                    </p>
                  </div>

                  <div className="mt-auto space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        const draft = loadFamilyOnboardingDraft()
                        if (draft?.mode === 'create' && draft.hasStarted) {
                          setSheetView('create')
                          setPanelKey((key) => key + 1)
                          return
                        }
                        persistFamilyOnboardingDraft({
                          version: 1,
                          incomplete: true,
                          hasStarted: true,
                          mode: 'create',
                          step: 'form',
                          familyName: '',
                          displayName: '',
                          gender: 'male',
                          ageInput: '',
                        })
                        setSheetView('create')
                        setPanelKey((key) => key + 1)
                      }}
                      className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-400/80 px-4 py-3.5 text-base font-bold text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
                    >
                      Neue Familie anlegen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const draft = loadFamilyOnboardingDraft()
                        if (draft?.mode === 'join' && draft.hasStarted) {
                          setSheetView('join')
                          setPanelKey((key) => key + 1)
                          return
                        }
                        persistFamilyOnboardingDraft({
                          version: 1,
                          incomplete: true,
                          hasStarted: true,
                          mode: 'join',
                          step: 'choice',
                          inviteCode: '',
                          displayName: '',
                          gender: 'male',
                          ageInput: '',
                        })
                        setSheetView('join')
                        setPanelKey((key) => key + 1)
                      }}
                      className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-base font-bold text-white`}
                    >
                      Mit meiner Familie verbinden
                    </button>
                    <button
                      type="button"
                      onClick={openRestoreSheet}
                      className="w-full pt-1 text-center text-xs font-semibold text-slate-600 underline decoration-slate-400/70 underline-offset-2 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
                    >
                      Mit Code wiederherstellen
                    </button>
                  </div>
                </div>
              ) : sheetView === 'restore' ? (
                <OnboardingRecoveryRestorePanel onBack={backToWelcome} />
              ) : sheetView === 'join' ? (
                <div
                  ref={sheetScrollRef}
                  data-lifexp-onboarding-scroll
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                  <JoinFamilyPanel key={`join-${panelKey}`} onBack={backToWelcome} sheetScrollRef={sheetScrollRef} />
                </div>
              ) : (
                <div
                  ref={sheetScrollRef}
                  data-lifexp-onboarding-scroll
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                  <CreateFamilyPanel key={`create-${panelKey}`} onBack={backToWelcome} sheetScrollRef={sheetScrollRef} />
                </div>
              )}
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </>
  )
}
