'use client'

import { useEffect } from 'react'

import { applyAppIcons } from '../lib/appIcon'

/** Homescreen-Icon / Manifest — immer Happy_all-Familienportrait. */
export default function PwaIconSync() {
  useEffect(() => {
    applyAppIcons()
  }, [])

  return null
}
