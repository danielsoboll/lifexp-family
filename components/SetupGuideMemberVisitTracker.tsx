'use client'

import { useEffect } from 'react'

import { notifyFamilyDataChanged, useFamily } from './FamilyProvider'
import { markSetupGuideMemberVisited } from '../lib/family/setupGuide'

type SetupGuideMemberVisitTrackerProps = {
  memberKind: 'parent' | 'child'
  memberId: string
}

export default function SetupGuideMemberVisitTracker({ memberKind, memberId }: SetupGuideMemberVisitTrackerProps) {
  const { family, session } = useFamily()

  useEffect(() => {
    if (!family || !session) return
    if (session.memberKind === memberKind && session.memberId === memberId) return
    void (async () => {
      await markSetupGuideMemberVisited(family)
      notifyFamilyDataChanged()
    })()
  }, [family, session, memberKind, memberId])

  return null
}
