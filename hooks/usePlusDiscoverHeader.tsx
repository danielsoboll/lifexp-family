'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'

import FamilyPlusFeaturesSheet from '../components/FamilyPlusFeaturesSheet'
import PlusActiveHeaderButton from '../components/PlusActiveHeaderButton'
import PlusLockHeaderButton from '../components/PlusLockHeaderButton'
import PlusNonAdminHintSheet from '../components/PlusNonAdminHintSheet'
import { useFamily } from '../components/FamilyProvider'
import { isFamilyPlus } from '../lib/family/familyPlus'
import { isPlusDiscoverOnboardingReady } from '../lib/family/plusDiscoverUnlock'

type UsePlusDiscoverHeaderOptions = {
  /** Header-Button erst nach Onboarding (Einstellungen: false = sofort). */
  gateHeader?: boolean
}

export function usePlusDiscoverHeader(options: UsePlusDiscoverHeaderOptions = {}) {
  const { gateHeader = true } = options
  const { family, canAdmin, session } = useFamily()
  const [plusSheetOpen, setPlusSheetOpen] = useState(false)
  const [nonAdminHintOpen, setNonAdminHintOpen] = useState(false)

  const familyId = family?.id ?? null
  const plusActive = isFamilyPlus(family)
  const memberId = session?.memberId ?? null

  const onboardingReady = useMemo(
    () => isPlusDiscoverOnboardingReady({ family, memberId }),
    [family, memberId],
  )

  const showHeader = gateHeader ? Boolean(familyId) && onboardingReady : Boolean(familyId)

  const openPlusDiscover = useCallback(() => {
    if (!canAdmin && !plusActive) {
      setNonAdminHintOpen(true)
      return
    }
    setPlusSheetOpen(true)
  }, [canAdmin, plusActive])

  const headerAction: ReactNode = showHeader ? (
    plusActive ? (
      <PlusActiveHeaderButton onClick={openPlusDiscover} />
    ) : (
      <PlusLockHeaderButton onClick={openPlusDiscover} />
    )
  ) : null

  const portals: ReactNode = (
    <>
      {plusSheetOpen ? <FamilyPlusFeaturesSheet onClose={() => setPlusSheetOpen(false)} /> : null}
      {nonAdminHintOpen ? <PlusNonAdminHintSheet onClose={() => setNonAdminHintOpen(false)} /> : null}
    </>
  )

  return {
    plusActive,
    showHeader,
    headerAction,
    openPlusDiscover,
    plusSheetOpen,
    setPlusSheetOpen,
    portals,
  }
}
