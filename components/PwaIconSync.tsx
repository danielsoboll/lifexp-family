'use client'

import { useEffect } from 'react'

import { applyAppIcons, resolveAppIconGender } from '../lib/appIcon'

/** Homescreen-Icon / Manifest (vereinfachtes Family-MVP). */
export default function PwaIconSync() {
  useEffect(() => {
    applyAppIcons(resolveAppIconGender())
  }, [])

  return null
}
