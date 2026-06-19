'use client'

import type { VisualViewportLayout } from '../lib/useVisualViewportLayout'

/** Deckt auf iOS/Safari den Bereich unter dem sichtbaren Viewport ab (URL-Leiste, Pfeile, Fertig). */
export default function SheetViewportChrome({ viewport }: { viewport: VisualViewportLayout }) {
  if (!viewport.keyboardOpen) return null

  return (
    <>
      {viewport.offsetTop > 0 ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-[5] bg-slate-950"
          style={{ top: 0, height: viewport.offsetTop }}
          aria-hidden
        />
      ) : null}
      {viewport.keyboardHeight > 0 ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-[5] bg-slate-950"
          style={{
            top: viewport.offsetTop + viewport.height,
            height: viewport.keyboardHeight,
          }}
          aria-hidden
        />
      ) : null}
    </>
  )
}
