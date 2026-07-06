'use client'

import SheetPortal from './SheetPortal'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { LIFE_XP_SHEET_VARIANT, type LifeXpConfirmSheetProps } from '../lib/lifeXpMessaging'

/** Bestätigungs-Meldung als LifeXP-Bottom-Sheet — getrennt von Infotexten. */
export default function LifeXpConfirmSheet({
  titleId = 'lifexp-confirm-sheet-title',
  eyebrow = 'LifeXP Family',
  title,
  emoji = '⚡',
  body,
  variant = 'amber',
  confirmLabel,
  cancelLabel = 'Doch nicht',
  confirmBusy = false,
  onConfirm,
  onCancel,
}: LifeXpConfirmSheetProps) {
  const styles = LIFE_XP_SHEET_VARIANT[variant]

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-[125] flex flex-col justify-end bg-slate-950/50 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onCancel}
        role="presentation"
      >
        <div
          className={`lifexp-bottom-sheet ${styles.shell}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={`mx-auto mt-3 h-1.5 w-12 rounded-full ${styles.handle}`} />

          <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${styles.glow}`}
              aria-hidden
            />

            <div className="relative flex flex-col items-center text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl ring-2 ${styles.iconBox}`}
              >
                <span aria-hidden>{emoji}</span>
              </div>
              <p className={`mt-4 text-[11px] font-bold uppercase tracking-[0.16em] ${styles.eyebrow}`}>{eyebrow}</p>
              <h2 id={titleId} className={`mt-1 text-[1.35rem] font-bold leading-tight tracking-tight ${styles.title}`}>
                {title}
              </h2>
            </div>

            {body ? (
              <div className={`relative mt-5 text-center text-sm font-semibold leading-relaxed ${styles.body}`}>
                {body}
              </div>
            ) : null}

            <div className="relative mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={onConfirm}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 px-4 py-3.5 text-base font-bold ring-1 disabled:cursor-not-allowed disabled:opacity-70 ${styles.primaryButton}`}
              >
                {confirmBusy ? 'Wird gespeichert …' : confirmLabel}
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={onCancel}
                className={`${PRESSABLE_3D_CLASS} w-full rounded-xl border-2 px-4 py-3 text-sm font-bold ${styles.secondaryButton}`}
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
