'use client'

import { useCallback, useEffect, useState } from 'react'

import type { LigaTierId } from './liga'
import { fetchCurrentLeagueStatus, LIFEXP_LEAGUE_CHANGED_EVENT } from './leagueXp'

export function useLeagueStatus() {
  const [ligaXp, setLigaXp] = useState(0)
  const [ligaTierId, setLigaTierId] = useState<LigaTierId>('recruit')
  const [errorMessage, setErrorMessage] = useState('')

  const reload = useCallback(async () => {
    const { stand, tierId, error } = await fetchCurrentLeagueStatus()
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setErrorMessage('')
    setLigaXp(stand)
    setLigaTierId(tierId)
  }, [])

  useEffect(() => {
    void reload()

    const onRefresh = () => {
      void reload()
    }

    window.addEventListener('focus', onRefresh)
    window.addEventListener('pageshow', onRefresh)
    window.addEventListener(LIFEXP_LEAGUE_CHANGED_EVENT, onRefresh)

    return () => {
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener('pageshow', onRefresh)
      window.removeEventListener(LIFEXP_LEAGUE_CHANGED_EVENT, onRefresh)
    }
  }, [reload])

  return { ligaXp, ligaTierId, errorMessage, reload }
}
