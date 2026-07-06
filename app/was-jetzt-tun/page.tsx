'use client'

import { useEffect, useState } from 'react'

import DashboardButton from '../../components/DashboardButton'
import FlowHintArrow from '../../components/FlowHintArrow'
import PageHeaderBar from '../../components/PageHeaderBar'
import { MAIN_SHELL_CLASS, MAIN_PAGE_INSET_CLASS, HOME_BACK_LABEL } from '../../lib/appShell'
import { fetchFamilyWasJetztTunState } from '../../lib/family/wasJetztTun'

export default function WasJetztTunPage() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [suggestedSteps, setSuggestedSteps] = useState<
    Awaited<ReturnType<typeof fetchFamilyWasJetztTunState>>['suggestedSteps']
  >([])

  const reload = () => {
    void (async () => {
      setLoading(true)
      const { suggestedSteps: steps, error } = await fetchFamilyWasJetztTunState()
      setLoading(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setErrorMessage('')
      setSuggestedSteps(steps)
    })()
  }

  useEffect(() => {
    reload()
    const onRevisit = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener('focus', onRevisit)
    window.addEventListener('pageshow', onRevisit)
    document.addEventListener('visibilitychange', onRevisit)
    return () => {
      window.removeEventListener('focus', onRevisit)
      window.removeEventListener('pageshow', onRevisit)
      document.removeEventListener('visibilitychange', onRevisit)
    }
  }, [])

  return (
    <main className={MAIN_SHELL_CLASS}>
      <div className={`mx-auto flex w-full max-w-md flex-col px-4 ${MAIN_PAGE_INSET_CLASS}`}>
        <PageHeaderBar backHref="/" backLabel={HOME_BACK_LABEL} />

        <header className="mb-6 flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 via-amber-50/95 to-yellow-200/80 text-3xl ring-1 ring-yellow-200/60 dark:border-yellow-700 dark:from-yellow-950/45 dark:via-amber-950/35 dark:to-yellow-900/55 dark:ring-yellow-900/40"
            aria-hidden
          >
            🎯
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-amber-950 dark:text-slate-100">
              Was jetzt tun?
            </h1>
            <p className="text-sm text-slate-950 dark:text-slate-400">Deine nächsten Schritte</p>
          </div>
        </header>

        {errorMessage ? (
          <p
            className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-950 dark:text-slate-400">Laden …</p>
        ) : (
          <>
            {suggestedSteps.length > 0 ? (
              <section className="flex flex-col gap-5" aria-label="Empfehlungen">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-amber-900 dark:text-slate-400">
                    Empfehlung 1
                  </h2>
                  <FlowHintArrow />
                  <DashboardButton
                    href={suggestedSteps[0].href}
                    emoji={suggestedSteps[0].emoji}
                    title={suggestedSteps[0].title}
                    subtitle={suggestedSteps[0].subtitle}
                    xpHint={suggestedSteps[0].xpHint}
                    tone="wjt-primary"
                  />
                </div>

                {suggestedSteps.length > 1 ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-400">
                      Weitere Empfehlungen
                    </h2>
                    {suggestedSteps.slice(1).map((step) => (
                      <DashboardButton
                        key={step.id}
                        href={step.href}
                        emoji={step.emoji}
                        title={step.title}
                        subtitle={step.subtitle}
                        xpHint={step.xpHint}
                        tone="wjt-secondary"
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : (
              <p className="rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-6 text-center text-sm font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                Für heute sieht alles gut aus. Gut gemacht!
              </p>
            )}
          </>
        )}

        <div className="min-h-[max(3rem,env(safe-area-inset-bottom))] shrink-0" aria-hidden />
      </div>
    </main>
  )
}
