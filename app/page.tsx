'use client'

import { useEffect } from 'react'

import FamilyDashboard from '../components/FamilyDashboard'
import WelcomeStartScreen from '../components/WelcomeStartScreen'
import { useFamily } from '../components/FamilyProvider'
import { bootstrapOnboardingBridge } from '../lib/family/onboardingBridge'

export default function HomePage() {
  const { hasSession } = useFamily()

  useEffect(() => {
    bootstrapOnboardingBridge()

    const onResume = () => {
      if (document.visibilityState === 'hidden') return
      bootstrapOnboardingBridge()
    }

    window.addEventListener('pageshow', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      window.removeEventListener('pageshow', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [])

  if (hasSession) {
    return <FamilyDashboard />
  }

  return <WelcomeStartScreen />
}
