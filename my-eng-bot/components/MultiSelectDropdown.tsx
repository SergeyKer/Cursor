'use client'

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react'

export interface MultiSelectOption {
  id: string
  label: string
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Минимум один выбран: при снятии последней галочки не менять значение */
  minOne?: boolean
  /** Первый пункт «Выбрать все»: при выборе отмечает все опции */
  selectAllLabel?: string
  /** Значение, которое нужно оставить при повторном клике по «Выбрать все» */
  selectAllResetValue?: string[]
  className?: string
  triggerClassName?: string
  panelClassName?: string
  /** Вариант для компактного меню (меньший шрифт) */
  compact?: boolean
  /** id элемента-подписи для aria-labelledby у кнопки-триггера */
  ariaLabelledBy?: string
}

function formatSummary(
  options: MultiSelectOption[],
  value: string[],
  placeholder: string,
  selectAllLabel?: string
): string {
  if (value.length === 0) return placeholder
  if (selectAllLabel && value.length === options.length) return selectAllLabel
  const labels = value.map((id) => options.find((o) => o.id === id)?.label ?? id)
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`
  return `${labels[0]}, ${labels[1]} и ещё ${labels.length - 2}`
}

export default function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Выберите…',
  minOne = true,
  selectAllLabel,
  selectAllResetValue = [],
  className = '',
  triggerClassName = '',
  panelClassName = '',
  compact = false,
  ariaLabelledBy,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !containerRef.current || typeof window === 'undefined') return
    const trigger = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - trigger.bottom
    const spaceAbove = trigger.top
    const minPanel = 180
    setOpenUp(spaceBelow < minPanel && spaceAbove > spaceBelow)
  }, [open])

  const allIds = options.map((o) => o.id)
  const hasAllOption = allIds.includes('all')
  const effectiveValue = selectAllLabel ? value.filter((id) => id !== 'all') : value
  const selectableIds = hasAllOption ? allIds.filter((id) => id !== 'all') : allIds
  const legacyAllOnlySelected = selectAllLabel && hasAllOption && value.includes('all') && effectiveValue.length === 0
  const allSelected =
    selectableIds.length > 0 && (legacyAllOnlySelected || selectableIds.every((id) => effectiveValue.includes(id)))
  const visibleOptions = selectAllLabel && hasAllOption ? options.filter((o) => o.id !== 'all') : options
  const summary = allSelected
    ? (selectAllLabel ?? placeholder)
    : formatSummary(visibleOptions, effectiveValue, placeholder, selectAllLabel)
  const textSize = compact ? 'text-xs' : 'text-sm'

  const toggle = (id: string) => {
    const next = effectiveValue.includes(id)
      ? effectiveValue.filter((v) => v !== id)
      : [...effectiveValue, id]
    if (minOne && next.length === 0) return
    onChange(next)
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      if (minOne) {
        onChange(selectAllResetValue.length > 0 ? [...selectAllResetValue] : [...selectableIds])
        return
      }
      onChange([])
    } else {
      onChange([...selectableIds])
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={ariaLabelledBy}
        className={`w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-left ${textSize} text-[var(--text)] flex items-center justify-between gap-2 ${triggerClassName}`}
      >
        <span className="truncate">{summary}</span>
        <span className="shrink-0 text-[var(--text-muted)] inline-flex items-center" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={open ? 'rotate-180' : ''}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 z-50 rounded-lg border border-[var(--border)] bg-white shadow-lg py-1 overflow-y-auto ${textSize} ${panelClassName} ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: 'min(220px, 40vh)' }}
        >
          {selectAllLabel && (
            <label
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--border)]/50 border-b border-[var(--border)]"
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.tagName.toLowerCase() === 'input') return
                e.preventDefault()
                toggleSelectAll()
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-[var(--border)]"
              />
              <span className="text-[var(--text)] font-medium">{selectAllLabel}</span>
            </label>
          )}
          {visibleOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--border)]/50"
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.tagName.toLowerCase() === 'input') return
                e.preventDefault()
                toggle(opt.id)
              }}
            >
              <input
                type="checkbox"
                checked={effectiveValue.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-[var(--border)]"
              />
              <span className="text-[var(--text)]">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
