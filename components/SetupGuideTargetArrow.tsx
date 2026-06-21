'use client'

import { useLayoutEffect, useState } from 'react'

import FlowHintArrow from './FlowHintArrow'
import type { SetupGuideTarget } from '../lib/family/setupGuide'
import { setupGuideTargetAttr } from '../lib/family/setupGuide'

type ArrowPlacement = 'left' | 'right' | 'above' | 'below'

type ArrowPosition = {
  top: number
  left: number
  placement: ArrowPlacement
}

function queryTarget(target: SetupGuideTarget): HTMLElement | null {
  const attr = setupGuideTargetAttr(target)
  const el = document.querySelector(`[data-setup-guide-target="${attr}"]`)
  return el instanceof HTMLElement ? el : null
}

function placementForTarget(target: SetupGuideTarget): ArrowPlacement {
  switch (target) {
    case 'new_quest':
    case 'first_member':
    case 'own_profile':
      return 'above'
    default:
      return 'above'
  }
}

function computePosition(el: HTMLElement, placement: ArrowPlacement): ArrowPosition {
  const rect = el.getBoundingClientRect()
  const gap = 6

  switch (placement) {
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        placement,
      }
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        placement,
      }
    case 'below':
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        placement,
      }
    case 'above':
    default:
      return {
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        placement,
      }
  }
}

function arrowPointsToward(placement: ArrowPlacement): 'down' | 'up' | 'left' | 'right' {
  switch (placement) {
    case 'above':
      return 'down'
    case 'below':
      return 'up'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

type SetupGuideTargetArrowProps = {
  target: SetupGuideTarget
}

export default function SetupGuideTargetArrow({ target }: SetupGuideTargetArrowProps) {
  const [position, setPosition] = useState<ArrowPosition | null>(null)
  const placement = placementForTarget(target)

  useLayoutEffect(() => {
    if (target === 'admin') {
      setPosition(null)
      return
    }

    const update = () => {
      const el = queryTarget(target)
      if (!el) {
        setPosition(null)
        return
      }
      setPosition(computePosition(el, placement))
    }

    update()
    const raf = window.requestAnimationFrame(update)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })

    const el = queryTarget(target)
    const ro = el ? new ResizeObserver(update) : null
    if (el && ro) ro.observe(el)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [target, placement])

  if (target === 'admin' || !position) return null

  const transform =
    position.placement === 'left'
      ? 'translate(-100%, -50%)'
      : position.placement === 'right'
        ? 'translate(0, -50%)'
        : position.placement === 'below'
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -100%)'

  return (
    <div
      className="pointer-events-none fixed z-[121]"
      style={{ top: position.top, left: position.left, transform }}
      aria-hidden
    >
      <FlowHintArrow direction={arrowPointsToward(position.placement)} />
    </div>
  )
}
