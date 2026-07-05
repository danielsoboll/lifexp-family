'use client'

type AvatarWasJetztTunThoughtBubbleProps = {
  onActivate: () => void
}

const PUFF_CLASS =
  'absolute z-[1] border-[2.5px] border-slate-900 bg-white shadow-[0_2px_6px_rgb(15_23_42/0.2)] dark:border-slate-100'

/**
 * Kette vom Kopf (mitte-rechts) schräg nach oben-rechts;
 * erster Punkt sitzt am Kopf und ragt rechts über den Bildrand.
 */
export default function AvatarWasJetztTunThoughtBubble({
  onActivate,
}: AvatarWasJetztTunThoughtBubbleProps) {
  const activate = () => onActivate()

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="wjt-thought-bubble"
      className="pointer-events-auto absolute inset-0 z-[110] cursor-pointer overflow-visible outline-none drop-shadow-[0_8px_18px_rgba(15,23,42,0.24)]"
      aria-label="Was jetzt tun? (klicken) — Empfehlungen anzeigen"
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      }}
    >
      <span
        aria-hidden
        className={`${PUFF_CLASS} top-[14%] left-[57%] z-[1] h-2.5 w-2 translate-x-[1rem] rounded-[46%_54%_52%_48%/54%_46%_54%_46%]`}
      />
      <span
        aria-hidden
        className={`${PUFF_CLASS} top-[8%] left-[61%] z-[1] h-[1.1rem] w-[0.9rem] translate-x-[1.45rem] rounded-[48%_52%_50%_50%/52%_48%_52%_48%]`}
      />
      <span
        aria-hidden
        className={`${PUFF_CLASS} top-[1%] left-[64%] z-[1] h-[1.6rem] w-[1.3rem] translate-x-[1.9rem] rounded-[50%_48%_52%_50%/48%_52%_48%_52%]`}
      />
      <span className="absolute top-[-6%] left-[60%] z-[2] flex min-w-[min(10rem,58%)] max-w-[64%] translate-x-[2.15rem] flex-col items-center justify-center gap-0.5 rounded-[52%_48%_50%_50%/48%_52%_46%_54%] border-[2.5px] border-slate-900 bg-white px-[1.05rem] py-2.5 shadow-[0_8px_18px_rgb(15_23_42/0.24)] dark:border-slate-100">
        <span className="pointer-events-none text-center text-[0.8125rem] font-extrabold leading-snug text-slate-900 min-[390px]:text-sm">
          Was jetzt tun?
        </span>
        <span className="pointer-events-none text-center text-[0.6875rem] font-semibold leading-tight text-emerald-700 min-[390px]:text-xs dark:text-emerald-400">
          (klicken)
        </span>
      </span>
    </div>
  )
}
