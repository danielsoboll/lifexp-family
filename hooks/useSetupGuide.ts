'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  dismissSetupGuideStep,
  readSetupGuideState,
  resolveSetupGuideStep,
  setupGuideCopy,
  type SetupGuideStep,
  type SetupGuideTarget,
} from '../lib/family/setupGuide'

type UseSetupGuideInput = {
  familyId: string | null | undefined
  parentCount: number
  childCount: number
  canAdmin: boolean
}

export function useSetupGuide({ familyId, parentCount, childCount, canAdmin }: UseSetupGuideInput) {
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener('lifexp-setup-guide-changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('lifexp-setup-guide-changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [refresh])

  const state = useMemo(() => {
    void tick
    return familyId ? readSetupGuideState(familyId) : null
  }, [familyId, tick])

  const step = useMemo(() => {
    if (!familyId || !state) return null
    return resolveSetupGuideStep({ state, parentCount, childCount, canAdmin })
  }, [familyId, state, parentCount, childCount, canAdmin])

  const copy = step ? setupGuideCopy(step) : null

  const visible = Boolean(
    step && state && state.dismissedStep !== step && copy,
  )

  const dismiss = useCallback(() => {
    if (!familyId || !step) return
    dismissSetupGuideStep(familyId, step)
    refresh()
  }, [familyId, step, refresh])

  const activeTarget: SetupGuideTarget | null = visible ? (copy?.target ?? null) : null

  return {
    step,
    copy,
    visible,
    activeTarget,
    dismiss,
    refresh,
  }
}

export function isSetupGuideTargetActive(activeTarget: SetupGuideTarget | null, target: SetupGuideTarget): boolean {
  return activeTarget === target
}
