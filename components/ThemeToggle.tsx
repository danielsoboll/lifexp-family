'use client'

import { useEffect, useState } from 'react'

import { applyDarkClass, setStoredTheme, type ThemePreference } from '../lib/theme'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM-Klasse ist erst nach Mount zuverlässig
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const nextDark = !document.documentElement.classList.contains('dark')
    applyDarkClass(nextDark)
    const pref: ThemePreference = nextDark ? 'dark' : 'light'
    setStoredTheme(pref)
    setIsDark(nextDark)
    try {
      window.dispatchEvent(new Event('lifexp-theme-change'))
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="lifexp-pressable-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-stone-400 bg-gradient-to-b from-stone-100 via-stone-200/95 to-stone-400/75 text-lg hover:border-stone-500 hover:from-stone-50 hover:via-stone-100 hover:to-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-stone-600 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:text-amber-200 dark:hover:border-stone-500 dark:hover:from-stone-600 dark:hover:via-stone-700 dark:hover:to-stone-900"
      aria-label={mounted && isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
      aria-pressed={mounted ? isDark : undefined}
    >
      {mounted && isDark ? '☀️' : '🌙'}
    </button>
  )
}
