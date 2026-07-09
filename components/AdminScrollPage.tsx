'use client'

import type { ReactNode } from 'react'

import { useVisualViewportLayout } from '../lib/useVisualViewportLayout'
import { MAIN_SHELL_CLASS } from '../lib/appShell'

type AdminScrollPageProps = {
  children: ReactNode
}

/** Admin/Formular-Seiten: fester Viewport, Inhalt scrollt — Tastatur & iOS-Safe-Area berücksichtigt. */
export default function AdminScrollPage({ children }: AdminScrollPageProps) {
  const { keyboardOpen, keyboardHeight } = useVisualViewportLayout()

  const scrollPaddingBottom = keyboardOpen
    ? `${Math.max(keyboardHeight + 88, 120)}px`
    : 'max(8rem, calc(5rem + env(safe-area-inset-bottom)))'

  return (
    <main
      className={`${MAIN_SHELL_CLASS} mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))]`}
    >
      <div
        className="lifexp-admin-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        style={{ paddingBottom: scrollPaddingBottom }}
      >
        {children}
      </div>
    </main>
  )
}
