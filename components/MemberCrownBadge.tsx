import { useId } from 'react'

import type { DailyCrownKind } from '../lib/family/dailyCrown'

/** Krone oben am Portrait — gut sichtbar, nicht dominant. */
const CROWN_SIZE_CLASS = 'h-9 w-12 sm:h-[2.375rem] sm:w-[3.25rem]'

type MemberCrownBadgeProps = {
  kind: DailyCrownKind
  pling?: boolean
}

function CrownIcon({ kind, uid }: { kind: DailyCrownKind; uid: string }) {
  const isYesterday = kind === 'yesterday'

  return (
    <svg
      viewBox="0 0 24 16"
      className={CROWN_SIZE_CLASS}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}-gold`} x1="12" y1="1" x2="12" y2="14" gradientUnits="userSpaceOnUse">
          {isYesterday ? (
            <>
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="28%" stopColor="#fcd34d" />
              <stop offset="72%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="70%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`${uid}-band`} x1="12" y1="11.5" x2="12" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="4" y1="2" x2="14" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-gem`} cx="0.35" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="#fffef7" />
          <stop offset="55%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
      </defs>

      {/* Stirnband */}
      <path
        d="M2.2 12.1h19.6c.6 0 1.1.5 1.1 1.1v1.1c0 .6-.5 1.1-1.1 1.1H2.2c-.6 0-1.1-.5-1.1-1.1v-1.1c0-.6.5-1.1 1.1-1.1Z"
        fill={`url(#${uid}-band)`}
        stroke="#713f12"
        strokeWidth="0.45"
      />

      {/* Kronenkörper */}
      <path
        d="M2.4 12.2 5.2 5.1 8.1 8.4 12 2.2l3.9 6.2 2.9-3.3 2.8 7H2.4Z"
        fill={`url(#${uid}-gold)`}
        stroke="#713f12"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Lichtreflex */}
      <path
        d="M5.4 5.8 8.2 8.6 12 3.4l2.2 3.6 1.4-1.6 1.8 5.2H4.8Z"
        fill={`url(#${uid}-shine)`}
      />

      {/* Zinnen-Juwelen */}
      <circle cx="5.2" cy="5.1" r="0.95" fill={`url(#${uid}-gem)`} stroke="#854d0e" strokeWidth="0.35" />
      <circle cx="12" cy="2.2" r="1.05" fill={`url(#${uid}-gem)`} stroke="#854d0e" strokeWidth="0.35" />
      <circle cx="18.8" cy="5.1" r="0.95" fill={`url(#${uid}-gem)`} stroke="#854d0e" strokeWidth="0.35" />
    </svg>
  )
}

export default function MemberCrownBadge({ kind, pling = false }: MemberCrownBadgeProps) {
  const uid = useId()
  const label = kind === 'yesterday' ? 'Kronen-Sieg gestern' : 'Heute auf Stufe 5 an der Spitze'

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[46%]"
      title={label}
      aria-label={label}
    >
      <span
        className={`block leading-none ${
          kind === 'yesterday' ? 'lifexp-crown-yesterday' : 'lifexp-crown-today'
        } ${pling ? 'lifexp-crown-pling' : kind === 'today' ? 'lifexp-crown-pulse' : ''}`}
      >
        <CrownIcon kind={kind} uid={uid} />
      </span>
    </div>
  )
}
