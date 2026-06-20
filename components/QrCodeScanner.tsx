'use client'

import { useEffect, useId, useRef, useState } from 'react'

type QrCodeScannerProps = {
  onCode: (raw: string) => void
  onError: (message: string) => void
}

export default function QrCodeScanner({ onCode, onError }: QrCodeScannerProps) {
  const containerId = useId().replace(/:/g, '')
  const handledRef = useRef(false)
  const onCodeRef = useRef(onCode)
  const onErrorRef = useRef(onError)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')

  useEffect(() => {
    onCodeRef.current = onCode
    onErrorRef.current = onError
  }, [onCode, onError])

  useEffect(() => {
    let scanner: import('html5-qrcode').Html5Qrcode | null = null
    let cancelled = false

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return

        scanner = new Html5Qrcode(containerId)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (handledRef.current) return
            handledRef.current = true
            onCodeRef.current(decoded)
          },
          () => {
            /* einzelne Frame-Fehler ignorieren */
          },
        )
        if (!cancelled) setStatus('ready')
      } catch {
        if (!cancelled) {
          setStatus('error')
          onErrorRef.current('Kamera konnte nicht geöffnet werden. Bitte Berechtigung prüfen oder Code manuell eingeben.')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (scanner?.isScanning) {
        void scanner.stop().finally(() => scanner?.clear())
      }
    }
  }, [containerId])

  return (
    <div className="space-y-3">
      {status === 'starting' ? (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">Kamera wird gestartet …</p>
      ) : null}
      {status === 'error' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Kamera nicht verfügbar.
        </p>
      ) : null}
      <div
        id={containerId}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border-2 border-slate-400/80 bg-black/90 dark:border-slate-600"
      />
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        QR-Code der Familie in den Rahmen halten.
      </p>
    </div>
  )
}
