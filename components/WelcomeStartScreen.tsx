'use client'

import { useCallback, useState } from 'react'

import CreateFamilyPanel from './CreateFamilyPanel'
import FamilyDashboard from './FamilyDashboard'
import JoinFamilyPanel from './JoinFamilyPanel'
import SheetPortal from './SheetPortal'
import { CARD_SURFACE_CLASS, ONBOARDING_BACKDROP_CLASS, PRESSABLE_3D_CLASS } from '../lib/appShell'

type SheetView = 'welcome' | 'join' | 'create'

export default function WelcomeStartScreen() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetView, setSheetView] = useState<SheetView>('welcome')

  const openSheet = useCallback(() => {
    setSheetView('welcome')
    setSheetOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setSheetView('welcome')
  }, [])

  return (
    <>
      <div
        className={`${ONBOARDING_BACKDROP_CLASS} overflow-y-auto overscroll-contain`}
        onClick={() => {
          if (!sheetOpen) openSheet()
        }}
        onKeyDown={(event) => {
          if (!sheetOpen && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            openSheet()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Tippen zum Starten"
      >
        <div className="pointer-events-none select-none">
          <FamilyDashboard preview />
        </div>
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
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      Verbinde dich mit deiner Familie oder lege eine neue an — als Elternteil oder Familienmitglied.
                    </p>
                  </div>

                  <div className="mt-auto space-y-3">
                    <button
                      type="button"
                      onClick={() => setSheetView('join')}
                      className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3.5 text-base font-bold text-white`}
                    >
                      Mit meiner Familie verbinden
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetView('create')}
                      className={`${PRESSABLE_3D_CLASS} w-full rounded-2xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-400/80 px-4 py-3.5 text-base font-bold text-stone-900 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-stone-100`}
                    >
                      Neue Familie anlegen
                    </button>
                  </div>
                </div>
              ) : sheetView === 'join' ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <JoinFamilyPanel onBack={() => setSheetView('welcome')} />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <CreateFamilyPanel onBack={() => setSheetView('welcome')} />
                </div>
              )}
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </>
  )
}
