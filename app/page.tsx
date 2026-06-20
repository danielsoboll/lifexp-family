'use client'

import FamilyDashboard from '../components/FamilyDashboard'
import WelcomeStartScreen from '../components/WelcomeStartScreen'
import { useFamily } from '../components/FamilyProvider'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

export default function HomePage() {
  const { hasSession, loading } = useFamily()

  if (loading && !hasSession) {
    return (
      <main className={`${MAIN_SHELL_CLASS} flex min-h-dvh items-center justify-center text-sm text-slate-600 dark:text-slate-400`}>
        <p>Wird geladen …</p>
      </main>
    )
  }

  if (!hasSession) {
    return <WelcomeStartScreen />
  }

  return <FamilyDashboard />
}
