export const APP_ERROR_EVENT = 'lifexp-app-error'

export const STUCK_LOADING_MS = 12_000
export const STUCK_BUSY_MS = 15_000

export type AppErrorSource = 'unhandled' | 'error-boundary' | 'app' | 'loading-timeout' | 'busy-timeout'

export type AppErrorDetail = {
  message: string
  source: AppErrorSource
}

export function reportAppError(message: string, source: AppErrorSource = 'app') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<AppErrorDetail>(APP_ERROR_EVENT, {
      detail: { message, source },
    }),
  )
}
