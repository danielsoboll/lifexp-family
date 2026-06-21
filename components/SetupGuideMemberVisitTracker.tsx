'use client'

import { useEffect } from 'react'

import { useFamily } from './FamilyProvider'
import { markSetupGuideMemberVisited, notifySetupGuideChanged } from '../lib/family/setupGuide'

type SetupGuideMemberVisitTrackerProps = {
  memberKind: 'parent' | 'child'
  memberId: string
}

export default function SetupGuideMemberVisitTracker({ memberKind, memberId }: SetupGuideMemberVisitTrackerProps) {
  const { family, session } = useFamily()

  useEffect(() => {
    if (!family?.id || !session) return
    if (session.memberKind === memberKind && session.memberId === memberId) return
    markSetupGuideMemberVisited(family.id)
    notifySetupGuideChanged()
  }, [family?.id, session, memberKind, memberId])

  return null
}
