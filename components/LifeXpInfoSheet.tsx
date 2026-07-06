'use client'

import SheetPortal from './SheetPortal'
import { PRESSABLE_3D_CLASS } from '../lib/appShell'
import { LIFE_XP_SHEET_VARIANT, type LifeXpInfoSheetProps } from '../lib/lifeXpMessaging'

/** Infotext als LifeXP-Bottom-Sheet — nicht für Fehler oder Bestätigungen. */
export default function LifeXpInfoSheet({
  titleId = 'lifexp-info-sheet-title',
  eyebrow = 'LifeXP Family',
  title,
  emoji = 'ℹ️',
  body,
  footer,
  highlights,
  variant = 'sky',
  dismissLabel = 'Alles klar!',
  onClose,
}: LifeXpInfoSheetProps) {
  const styles = LIFE_XP_SHEET_VARIANT[variant]

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-[120] flex flex-col justify-end bg-slate-950/50 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
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

            {highlights && highlights.length > 0 ? (
              <ul className={`relative mt-4 grid gap-2 ${highlights.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {highlights.map((item) => (
                  <li
                    key={item.label}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 shadow-sm ${styles.footer}`}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="text-center text-[11px] font-bold leading-snug">{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {footer ? (
              <div className={`relative mt-4 rounded-2xl border-2 px-4 py-3.5 text-center text-[15px] font-medium leading-relaxed ${styles.footer}`}>
                {footer}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className={`${PRESSABLE_3D_CLASS} mt-5 w-full rounded-xl border-2 px-4 py-3.5 text-base font-bold ring-1 ${styles.primaryButton}`}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
