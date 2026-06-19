'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  defaultTaskColorLabels,
  type TaskColorLabels,
} from './taskColors'
import {
  fetchResolvedTaskColorLabels,
  TASK_COLOR_LABELS_CHANGED_EVENT,
} from './taskColorsIndiv'

export function useTaskColorLabels() {
  const [labels, setLabels] = useState<TaskColorLabels>(() => defaultTaskColorLabels())
  const [hasCustomLabels, setHasCustomLabels] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { labels: nextLabels, hasCustomLabels: custom, error } = await fetchResolvedTaskColorLabels()
    if (error) return { error }
    setLabels(nextLabels)
    setHasCustomLabels(custom)
    setLoading(false)
    return { error: null }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { labels: nextLabels, hasCustomLabels: custom, error } = await fetchResolvedTaskColorLabels()
      if (cancelled) return
      if (!error) {
        setLabels(nextLabels)
        setHasCustomLabels(custom)
      }
      setLoading(false)
    })()

    const onChanged = () => {
      void reload()
    }

    window.addEventListener(TASK_COLOR_LABELS_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      window.removeEventListener(TASK_COLOR_LABELS_CHANGED_EVENT, onChanged)
    }
  }, [reload])

  return { labels, hasCustomLabels, loading, reload }
}
