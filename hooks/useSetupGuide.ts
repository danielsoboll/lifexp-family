'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Family } from '../lib/family/types'
import {
  dismissSetupGuideStep,
  resolveSetupGuideStep,
  SETUP_GUIDE_STEP_REVEAL_DELAY_MS,
  setupGuideCopy,
  setupGuideStateFromFamily,
  type SetupGuideStep,
  type SetupGuideTarget,
} from '../lib/family/setupGuide'
import { markMemberJoinReadySeen } from '../lib/family/memberJoinGuide'

type UseSetupGuideInput = {
  family: Family | null | undefined
  parentCount: number
  childCount: number
  canAdmin: boolean
  memberId?: string | null
}

export function useSetupGuide({ family, parentCount, childCount, canAdmin, memberId }: UseSetupGuideInput) {
  const [tick, setTick] = useState(0)
  const [displayStep, setDisplayStep] = useState<SetupGuideStep | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onChange = () => {
      setTick((value) => value + 1)
    }
    window.addEventListener('lifexp-setup-guide-changed', onChange)
    return () => window.removeEventListener('lifexp-setup-guide-changed', onChange)
  }, [])

  const state = useMemo(() => {
    void tick
    return setupGuideStateFromFamily(family)
  }, [family, tick])

  const step = useMemo(() => {
    if (!state) return null
    return resolveSetupGuideStep({ state, parentCount, childCount, canAdmin, memberId })
  }, [state, parentCount, childCount, canAdmin, memberId])

  useEffect(() => {
    if (!step) {
      setVisible(false)
      setDisplayStep(null)
      return
    }

    setVisible(false)
    const timer = window.setTimeout(() => {
      setDisplayStep(step)
      setVisible(true)
    }, SETUP_GUIDE_STEP_REVEAL_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [step])

  const copy = displayStep ? setupGuideCopy(displayStep) : null

  const dismiss = useCallback(() => {
    if (!family || !displayStep) return
    if (displayStep === 'member_ready' && memberId) {
      markMemberJoinReadySeen(memberId)
      return
    }
    void dismissSetupGuideStep(family, displayStep)
  }, [family, displayStep, memberId])

  const activeTarget: SetupGuideTarget | null = visible && copy ? (copy.target ?? null) : null

  return {
    step: displayStep,
    copy,
    visible,
    activeTarget,
    dismiss,
  }
}

export function isSetupGuideTargetActive(activeTarget: SetupGuideTarget | null, target: SetupGuideTarget): boolean {
  return activeTarget === target
}

export type { SetupGuideStep }
