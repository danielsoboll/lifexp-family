'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Family } from '../lib/family/types'
import {
  dismissSetupGuideStep,
  resolveSetupGuideStep,
  setupGuideCopy,
  setupGuideStateFromFamily,
  type SetupGuideStep,
  type SetupGuideTarget,
} from '../lib/family/setupGuide'

type UseSetupGuideInput = {
  family: Family | null | undefined
  parentCount: number
  childCount: number
  canAdmin: boolean
}

export function useSetupGuide({ family, parentCount, childCount, canAdmin }: UseSetupGuideInput) {
  const [tick, setTick] = useState(0)

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
    return resolveSetupGuideStep({ state, parentCount, childCount, canAdmin })
  }, [state, parentCount, childCount, canAdmin])

  const copy = step ? setupGuideCopy(step) : null
  const visible = Boolean(step && copy)

  const dismiss = useCallback(() => {
    if (!family || !step) return
    void dismissSetupGuideStep(family, step)
  }, [family, step])

  const activeTarget: SetupGuideTarget | null = visible ? (copy?.target ?? null) : null

  return {
    step,
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
