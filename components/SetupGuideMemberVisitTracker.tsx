'use client'

import { useEffect, useRef } from 'react'

import { useFamily } from './FamilyProvider'
import { markSetupGuideMemberVisited } from '../lib/family/setupGuide'

type SetupGuideMemberVisitTrackerProps = {
  memberKind: 'parent' | 'child'
  memberId: string
}

export default function SetupGuideMemberVisitTracker({ memberKind, memberId }: SetupGuideMemberVisitTrackerProps) {
  const { family, session } = useFamily()
  const trackedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!family?.id || !session) return
    if (session.memberKind === memberKind && session.memberId === memberId) return

    const key = `${family.id}:${memberKind}:${memberId}`
    if (trackedRef.current === key) return
    trackedRef.current = key

    void markSetupGuideMemberVisited(family)
  }, [family?.id, session, memberKind, memberId])

  return null
}
