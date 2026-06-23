'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import CreateFamilyPanel from './CreateFamilyPanel'
import FamilyDashboard from './FamilyDashboard'
import JoinFamilyPanel from './JoinFamilyPanel'
import OnboardingPromoBanner from './OnboardingPromoBanner'
import SheetPortal from './SheetPortal'
import { useFamilyOnboardingBridge } from '../hooks/useFamilyOnboardingBridge'
import { useOnboardingPromoIdleCycle } from '../hooks/useOnboardingPromoIdleCycle'
import { bootstrapOnboardingBridge, flushOnboardingBridge, persistFamilyOnboardingDraft } from '../lib/family/onboardingBridge'
import { clearFamilyOnboardingDraft, loadFamilyOnboardingDraft } from '../lib/family/onboardingDraft'
import { ONBOARDING_PROMO_AFTER_SHEET_MS } from '../lib/family/onboardingPromoBanner'
import { CARD_SURFACE_CLASS, ONBOARDING_BACKDROP_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type SheetView = 'welcome' | 'join' | 'create'

function readResumeDraftView(): { view: SheetView; panelKey: number } {
  bootstrapOnboardingBridge()
  const draft = loadFamilyOnboardingDraft()
  if (draft?.incomplete) {
    return { view: draft.mode, panelKey: 1 }
  }
  return { view: 'welcome', panelKey: 0 }
}

export default function WelcomeStartScreen() {
  const backdropScrollRef = useRef<HTMLDivElement>(null)
  const sheetScrollRef = useRef<HTMLDivElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetView, setSheetView] = useState<SheetView>('welcome')
  const [panelKey, setPanelKey] = useState(0)
  const [resumeChecked, setResumeChecked] = useState(false)
  const [promoVisible, setPromoVisible] = useState(false)

  const sheetCloseTimerRef = useRef<number | undefined>(undefined)

  const dismissPromo = useCallback(() => {
    setPromoVisible(false)
  }, [])

  const applyResumeFromBridge = useCallback(() => {
    const draft = loadFamilyOnboardingDraft()
    if (!draft?.incomplete) return
    setSheetView((current) => (current === 'welcome' ? draft.mode : current))
  }, [])

  useFamilyOnboardingBridge({ onResume: applyResumeFromBridge })

  const backToWelcome = useCallback(() => {
    clearFamilyOnboardingDraft()
    flushOnboardingBridge()
    setSheetView('welcome')
    setPanelKey((key) => key + 1)
  }, [])

  useLayoutEffect(() => {
    const resume = readResumeDraftView()
    setSheetView(resume.view)
    setPanelKey(resume.panelKey)
    setPromoVisible(true)
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

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    if (sheetCloseTimerRef.current !== undefined) {
      window.clearTimeout(sheetCloseTimerRef.current)
    }
    sheetCloseTimerRef.current = window.setTimeout(() => {
      sheetCloseTimerRef.current = undefined
      setPromoVisible(true)
    }, ONBOARDING_PROMO_AFTER_SHEET_MS)
  }, [])

  const promoEligible = resumeChecked && !sheetOpen

  useOnboardingPromoIdleCycle({
    enabled: promoEligible,
    promoVisible,
    onShow: () => setPromoVisible(true),
    activityRootRef: backdropScrollRef,
  })

  const showBackdropHint = promoEligible && loadFamilyOnboardingDraft()?.incomplete

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
          <FamilyDashboard preview previewScrollContainerRef={backdropScrollRef} />
        </div>
        {showBackdropHint ? (
          <p className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 text-center text-xs font-medium text-emerald-800/90 dark:text-emerald-200/90">
            Tippen zum Fortsetzen
          </p>
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
                sheetView === 'welcome' ? 'max-h-[50dvh] min-h-[50dvh]' : 'max-h-[85dvh] min-h-[70dvh]'
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
                  </div>
                </div>
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
