'use client'

import { useEffect, useState } from 'react'

export type VisualViewportLayout = {
  /** sichtbare Viewport-Höhe (ohne Tastatur) */
  height: number
  /** Versatz nach oben, wenn iOS/Safari den sichtbaren Bereich verschiebt */
  offsetTop: number
  /** Fläche unterhalb des sichtbaren Viewports (Tastatur + Safari-Zeile) */
  keyboardHeight: number
  keyboardOpen: boolean
}

function readViewportLayout(): VisualViewportLayout {
  if (typeof window === 'undefined') {
    return { height: 0, offsetTop: 0, keyboardHeight: 0, keyboardOpen: false }
  }
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const offsetTop = vv?.offsetTop ?? 0
  const keyboardHeight = Math.max(0, window.innerHeight - height - offsetTop)
  return {
    height,
    offsetTop,
    keyboardHeight,
    keyboardOpen: keyboardHeight > 80,
  }
}

export function useVisualViewportLayout(): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>(readViewportLayout)

  useEffect(() => {
    const sync = () => setLayout(readViewportLayout())

    sync()
    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)

    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('lifexp-keyboard-open', layout.keyboardOpen)
    return () => document.documentElement.classList.remove('lifexp-keyboard-open')
  }, [layout.keyboardOpen])

  return layout
}
