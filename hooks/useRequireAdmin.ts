'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useFamily } from '@/components/FamilyProvider'

/** Admin-Seiten: Nicht-Admins zurück zur Startseite. */
export function useRequireAdmin() {
  const router = useRouter()
  const { loading, canAdmin, family, error } = useFamily()

  useEffect(() => {
    if (!loading && !canAdmin) {
      router.replace('/')
    }
  }, [loading, canAdmin, router])

  return {
    loading,
    canAdmin,
    family,
    error,
    ready: !loading && canAdmin,
  }
}
