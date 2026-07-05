'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  initialThoughtBubbleDelayMs,
  WJT_BUBBLE_COOLDOWN_MS,
  WJT_BUBBLE_SCROLL_DWELL_MS,
  WJT_BUBBLE_SCROLL_TOP_MAX_PX,
  WJT_BUBBLE_VISIBLE_MS,
} from './thoughtBubbleTiming'

type UseThoughtBubbleVisibilityOptions = {
  eligible: boolean
  totalXp: number
}

export function useThoughtBubbleVisibility({
  eligible,
  totalXp,
}: UseThoughtBubbleVisibilityOptions) {
  const [visible, setVisible] = useState(false)
  const cooldownUntilRef = useRef(0)
  const dwellStartedAtRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const initialTimerRef = useRef<number | null>(null)
  const initialCycleDoneRef = useRef(false)
  const eligibleRef = useRef(eligible)
  const visibleRef = useRef(false)

  eligibleRef.current = eligible
  visibleRef.current = visible

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const clearInitialTimer = useCallback(() => {
    if (initialTimerRef.current !== null) {
      window.clearTimeout(initialTimerRef.current)
      initialTimerRef.current = null
    }
  }, [])

  const beginCooldown = useCallback(() => {
    cooldownUntilRef.current = Date.now() + WJT_BUBBLE_COOLDOWN_MS
    dwellStartedAtRef.current = null
  }, [])

  const showForDuration = useCallback(() => {
    if (!eligibleRef.current) return
    if (visibleRef.current) return
    if (Date.now() < cooldownUntilRef.current) return

    clearHideTimer()
    dwellStartedAtRef.current = null
    visibleRef.current = true
    setVisible(true)
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null
      visibleRef.current = false
      setVisible(false)
      beginCooldown()
    }, WJT_BUBBLE_VISIBLE_MS)
  }, [beginCooldown, clearHideTimer])

  const dismissThoughtBubble = useCallback(() => {
    clearHideTimer()
    clearInitialTimer()
    visibleRef.current = false
    setVisible(false)
    beginCooldown()
  }, [beginCooldown, clearHideTimer, clearInitialTimer])

  useEffect(() => {
    if (!eligible) {
      clearHideTimer()
      clearInitialTimer()
      visibleRef.current = false
      setVisible(false)
      initialCycleDoneRef.current = false
      cooldownUntilRef.current = 0
      dwellStartedAtRef.current = null
      return
    }

    if (initialCycleDoneRef.current) return

    clearInitialTimer()
    initialTimerRef.current = window.setTimeout(() => {
      initialTimerRef.current = null
      initialCycleDoneRef.current = true
      showForDuration()
    }, initialThoughtBubbleDelayMs(totalXp))

    return clearInitialTimer
  }, [eligible, totalXp, clearInitialTimer, clearHideTimer, showForDuration])

  useEffect(() => {
    if (!eligible) return

    const tick = () => {
      if (visibleRef.current) return
      if (!initialCycleDoneRef.current) return
      if (Date.now() < cooldownUntilRef.current) {
        dwellStartedAtRef.current = null
        return
      }

      const atTop = window.scrollY <= WJT_BUBBLE_SCROLL_TOP_MAX_PX
      if (!atTop) {
        dwellStartedAtRef.current = null
        return
      }

      const now = Date.now()
      if (dwellStartedAtRef.current === null) {
        dwellStartedAtRef.current = now
        return
      }

      if (now - dwellStartedAtRef.current >= WJT_BUBBLE_SCROLL_DWELL_MS) {
        dwellStartedAtRef.current = null
        showForDuration()
      }
    }

    window.addEventListener('scroll', tick, { passive: true })
    const interval = window.setInterval(tick, 250)

    return () => {
      window.removeEventListener('scroll', tick)
      window.clearInterval(interval)
    }
  }, [eligible, showForDuration])

  useEffect(() => {
    return () => {
      clearHideTimer()
      clearInitialTimer()
    }
  }, [clearHideTimer, clearInitialTimer])

  return { visible, dismissThoughtBubble }
}
