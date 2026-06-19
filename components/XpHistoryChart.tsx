'use client'

import { useId, useLayoutEffect, useMemo, useRef } from 'react'

import { cetFormatShortDate } from '../lib/cetDate'
import type { XpHistoryDay } from '../lib/xpHistory'

type XpHistoryChartProps = {
  days: XpHistoryDay[]
  target: number
  max: number
}

const DAY_WIDTH = 34
/** Sichtbares Fenster: zuletzt so viele Tage; ältere per horizontal scroll. */
const VISIBLE_DAY_COUNT = 10
const CHART_HEIGHT = 220
const PAD_LEFT = 40
const PAD_RIGHT = 16
const PAD_TOP = 18
const PAD_BOTTOM = 42

type ChartPoint = {
  x: number
  y: number
  xp: number
  date?: string
  role: 'origin' | 'start' | 'day'
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]
    const current = points[index]
    const next = points[index + 1]
    const after = points[Math.min(points.length - 1, index + 2)]
    const control1X = current.x + (next.x - previous.x) / 6
    const control1Y = current.y + (next.y - previous.y) / 6
    const control2X = next.x - (after.x - current.x) / 6
    const control2Y = next.y - (after.y - current.y) / 6
    path += ` C ${control1X} ${control1Y} ${control2X} ${control2Y} ${next.x} ${next.y}`
  }
  return path
}

function buildAreaPath(linePath: string, points: ChartPoint[], baselineY: number): string {
  if (!linePath || points.length === 0) return ''
  const last = points[points.length - 1]
  const first = points[0]
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
}

/** Bei kleinem yMax (z. B. Wissen = 3) keine doppelten Rundungs-Ticks. */
function yAxisTicks(yMax: number): { value: number; fraction: number }[] {
  const top = Math.max(1, Math.floor(yMax))
  if (top <= 10) {
    return Array.from({ length: top + 1 }, (_, value) => ({
      value,
      fraction: value / top,
    }))
  }

  const seen = new Set<number>()
  const ticks: { value: number; fraction: number }[] = []
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const value = Math.round(yMax * fraction)
    if (seen.has(value)) continue
    seen.add(value)
    ticks.push({ value, fraction })
  }
  return ticks
}

function gradientStops(targetOffsetPct: number, strong: boolean): React.ReactNode {
  const top = strong ? 0.5 : 0.1
  const goal = strong ? 0.42 : 0.09
  const mid = strong ? 0.38 : 0.08
  const bottom = strong ? 0.48 : 0.1
  const clamped = Math.min(92, Math.max(8, targetOffsetPct))

  return (
    <>
      <stop offset="0%" stopColor="#22c55e" stopOpacity={top} />
      <stop offset={`${clamped}%`} stopColor="#bbf7d0" stopOpacity={goal} />
      <stop offset={`${Math.min(clamped + 18, 88)}%`} stopColor="#fde047" stopOpacity={mid} />
      <stop offset="100%" stopColor="#ef4444" stopOpacity={bottom} />
    </>
  )
}

export default function XpHistoryChart({ days, target, max }: XpHistoryChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rawId = useId().replace(/:/g, '')
  const bgGradientId = `xp-history-bg-${rawId}`
  const areaGradientId = `xp-history-area-${rawId}`
  const needsHorizontalScroll = days.length > VISIBLE_DAY_COUNT

  const layout = useMemo(() => {
    const peakXp = days.reduce((highest, day) => Math.max(highest, day.xp), 0)
    const yMax = Math.max(max, target, peakXp, 1)
    const innerWidth = Math.max(DAY_WIDTH, days.length * DAY_WIDTH)
    const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
    const width = PAD_LEFT + innerWidth + PAD_RIGHT
    const height = CHART_HEIGHT

    const yForValue = (value: number) =>
      PAD_TOP + innerHeight - (Math.min(value, yMax) / yMax) * innerHeight

    const baselineY = PAD_TOP + innerHeight
    const targetY = yForValue(target)
    const targetOffsetPct = ((targetY - PAD_TOP) / innerHeight) * 100

    const axisX = PAD_LEFT
    const chartPoints: ChartPoint[] = [
      {
        x: axisX,
        y: yForValue(0),
        xp: 0,
        role: 'origin',
      },
    ]

    days.forEach((day, index) => {
      chartPoints.push({
        x: PAD_LEFT + (index + 1) * DAY_WIDTH,
        y: yForValue(day.xp),
        xp: day.xp,
        date: day.date,
        role: index === 0 ? 'start' : 'day',
      })
    })

    const linePath = buildSmoothPath(chartPoints)
    const areaPath = buildAreaPath(linePath, chartPoints, baselineY)

    const startMarkerX = days.length > 0 ? PAD_LEFT + DAY_WIDTH : null
    const labelStep = days.length > 10 ? Math.ceil(days.length / 7) : 1

    const yTicks = yAxisTicks(yMax)

    return {
      width,
      height,
      yMax,
      yTicks,
      targetY,
      baselineY,
      targetOffsetPct,
      chartPoints,
      linePath,
      areaPath,
      startMarkerX,
      labelStep,
      innerWidth,
      innerHeight,
      axisX,
    }
  }, [days, max, target])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollLeft = container.scrollWidth - container.clientWidth
  }, [days, layout.width])

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
        Noch keine Historie für diesen Zeitraum.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/80 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50">
      <div
        ref={scrollRef}
        className="flex w-full justify-end overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        tabIndex={needsHorizontalScroll ? 0 : undefined}
        aria-label={
          needsHorizontalScroll
            ? 'XP-Verlauf, horizontal scrollbar für ältere Tage'
            : undefined
        }
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block shrink-0"
          style={{ width: layout.width, minWidth: layout.width, height: layout.height }}
          role="img"
          aria-label="XP-Verlauf als Liniendiagramm"
        >
        <defs>
          <linearGradient
            id={bgGradientId}
            x1="0"
            y1={PAD_TOP}
            x2="0"
            y2={layout.baselineY}
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops(layout.targetOffsetPct, false)}
          </linearGradient>
          <linearGradient
            id={areaGradientId}
            x1="0"
            y1={PAD_TOP}
            x2="0"
            y2={layout.baselineY}
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops(layout.targetOffsetPct, true)}
          </linearGradient>
        </defs>

        <rect
          x={layout.axisX}
          y={PAD_TOP}
          width={layout.innerWidth}
          height={layout.innerHeight}
          fill={`url(#${bgGradientId})`}
        />

        {layout.yTicks.map((tick) => {
          const y = PAD_TOP + layout.innerHeight * (1 - tick.fraction)
          return (
            <g key={tick.value}>
              <line
                x1={layout.axisX}
                x2={layout.axisX + layout.innerWidth}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth={1}
                strokeDasharray={tick.fraction === 0 ? undefined : '4 4'}
              />
              <text
                x={layout.axisX - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[9px] dark:fill-slate-400"
              >
                {tick.value}
              </text>
            </g>
          )
        })}

        <line
          x1={layout.axisX}
          x2={layout.axisX + layout.innerWidth}
          y1={layout.targetY}
          y2={layout.targetY}
          stroke="#059669"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.85}
        />
        <text
          x={layout.axisX + 4}
          y={layout.targetY - 5}
          textAnchor="start"
          className="fill-emerald-700 text-[9px] font-semibold dark:fill-emerald-400"
        >
          Ziel {target}
        </text>

        {layout.startMarkerX != null ? (
          <g>
            <line
              x1={layout.startMarkerX}
              x2={layout.startMarkerX}
              y1={layout.baselineY}
              y2={PAD_TOP}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.75}
            />
            <text
              x={layout.startMarkerX}
              y={layout.baselineY + 14}
              textAnchor="middle"
              className="fill-slate-700 text-[9px] font-semibold dark:fill-slate-300"
            >
              Start
            </text>
          </g>
        ) : null}

        {layout.areaPath ? (
          <path d={layout.areaPath} fill={`url(#${areaGradientId})`} stroke="none" />
        ) : null}

        {layout.linePath ? (
          <path
            d={layout.linePath}
            fill="none"
            stroke="#0f766e"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-teal-400"
          />
        ) : null}

        {layout.chartPoints.map((point) =>
          point.role === 'origin' ? (
            <circle
              key="origin"
              cx={point.x}
              cy={point.y}
              r={3}
              fill="#94a3b8"
              stroke="#fff"
              strokeWidth={1.5}
              className="dark:stroke-slate-900"
            />
          ) : (
            <circle
              key={point.date ?? point.role}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={point.xp >= target ? '#059669' : point.xp > 0 ? '#ca8a04' : '#94a3b8'}
              stroke="#fff"
              strokeWidth={1.5}
              className="dark:stroke-slate-900"
            />
          ),
        )}

        {layout.chartPoints.map((point, index) => {
          if (point.role === 'origin') return null
          if (point.role === 'start') return null
          const dayIndex = index - 1
          if (dayIndex % layout.labelStep !== 0 && dayIndex !== days.length - 1) return null
          if (!point.date) return null
          return (
            <text
              key={`${point.date}-label`}
              x={point.x}
              y={layout.baselineY + 28}
              textAnchor="middle"
              className="fill-slate-600 text-[8px] dark:fill-slate-400"
            >
              {cetFormatShortDate(point.date)}
            </text>
          )
        })}
        </svg>
      </div>
      <p className="border-t border-slate-200/80 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700/80 dark:text-slate-400">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Grün</span> über dem Ziel (
        {target} XP),{' '}
        <span className="font-semibold text-amber-700 dark:text-amber-400">gelb/rot</span> darunter.
        Gestrichelte Linie = Tagesziel.
      </p>
    </div>
  )
}
