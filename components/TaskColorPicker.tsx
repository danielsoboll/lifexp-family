'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

import {
  TASK_COLOR_KEYS,
  taskColorDefinition,
  type TaskColorKey,
  type TaskColorLabels,
} from '../lib/taskColors'

type TaskColorPickerProps = {
  value: TaskColorKey
  labels: TaskColorLabels
  onChange: (next: TaskColorKey) => void
  disabled?: boolean
  id?: string
}

const MENU_Z_INDEX = 200
const VIEWPORT_PADDING = 8
const MENU_GAP = 6
const ESTIMATED_OPTION_HEIGHT = 48

const triggerClass =
  'flex w-full items-center gap-3 rounded-2xl border-2 border-stone-400 bg-white px-4 py-3 text-left text-base font-semibold disabled:opacity-60 dark:border-stone-600 dark:bg-stone-950'

function optionClass(selected: boolean) {
  return `flex w-full px-4 py-3 text-left text-base font-semibold ${
    selected ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-900/80'
  }`
}

export default function TaskColorPicker({
  value,
  labels,
  onChange,
  disabled = false,
  id = 'task-color-picker',
}: TaskColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [openUpward, setOpenUpward] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const current = taskColorDefinition(value)

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? TASK_COLOR_KEYS.length * ESTIMATED_OPTION_HEIGHT + 8
    const viewport = window.visualViewport
    const viewportHeight = viewport?.height ?? window.innerHeight
    const viewportWidth = viewport?.width ?? window.innerWidth

    const spaceAbove = rect.top - MENU_GAP
    const spaceBelow = viewportHeight - rect.bottom - MENU_GAP
    const preferUp = spaceAbove >= menuHeight || spaceAbove >= spaceBelow
    setOpenUpward(preferUp)

    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(rect.left, viewportWidth - rect.width - VIEWPORT_PADDING),
    )

    const style: CSSProperties = {
      position: 'fixed',
      left,
      width: rect.width,
      zIndex: MENU_Z_INDEX,
    }

    if (preferUp) {
      const bottom = viewportHeight - rect.top + MENU_GAP
      style.bottom = bottom
      style.top = undefined
      if (spaceAbove < menuHeight) {
        style.maxHeight = Math.max(ESTIMATED_OPTION_HEIGHT * 2, spaceAbove)
        style.overflowY = 'auto'
      }
    } else {
      style.top = rect.bottom + MENU_GAP
      style.bottom = undefined
      if (spaceBelow < menuHeight) {
        style.maxHeight = Math.max(ESTIMATED_OPTION_HEIGHT * 2, spaceBelow)
        style.overflowY = 'auto'
      }
    }

    setMenuStyle(style)
  }, [])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()
    const frame = requestAnimationFrame(() => updateMenuPosition())

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const onLayoutChange = () => updateMenuPosition()

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)
    window.visualViewport?.addEventListener('resize', onLayoutChange)
    window.visualViewport?.addEventListener('scroll', onLayoutChange)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
      window.visualViewport?.removeEventListener('resize', onLayoutChange)
      window.visualViewport?.removeEventListener('scroll', onLayoutChange)
    }
  }, [open, updateMenuPosition])

  const pick = (next: TaskColorKey) => {
    setOpen(false)
    if (next !== value) onChange(next)
  }

  const menu =
    open && typeof document !== 'undefined' ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-labelledby={id}
        style={menuStyle}
        className={`overflow-hidden rounded-2xl border-2 border-stone-400 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-950 ${
          openUpward ? 'origin-bottom' : 'origin-top'
        }`}
      >
        {TASK_COLOR_KEYS.map((colorKey) => {
          const color = taskColorDefinition(colorKey)
          return (
            <li key={colorKey} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={colorKey === value}
                onClick={() => pick(colorKey)}
                className={optionClass(colorKey === value)}
              >
                <span className={`block truncate ${color.pickerLabelClass}`}>{labels[colorKey]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    ) : null

  return (
    <div ref={rootRef}>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        Typ
      </label>
      <div className="flex items-center gap-3">
        <span
          className={`h-10 w-10 shrink-0 rounded-xl border-2 ${current.swatchClass}`}
          aria-hidden
        />
        <div className="relative min-w-0 flex-1">
          <button
            ref={triggerRef}
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => {
              if (!disabled) setOpen((currentOpen) => !currentOpen)
            }}
            className={triggerClass}
          >
            <span className={`min-w-0 flex-1 truncate ${current.pickerLabelClass}`}>{labels[value]}</span>
            <span className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden>
              ▾
            </span>
          </button>
          {menu ? createPortal(menu, document.body) : null}
        </div>
      </div>
    </div>
  )
}
