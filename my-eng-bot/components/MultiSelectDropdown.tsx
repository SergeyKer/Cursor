'use client'

import React, { useRef, useEffect } from 'react'

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
  className?: string
  triggerClassName?: string
  panelClassName?: string
  /** Вариант для компактного меню (меньший шрифт) */
  compact?: boolean
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
  className = '',
  triggerClassName = '',
  panelClassName = '',
  compact = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false)
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

  const allIds = options.map((o) => o.id)
  const allSelected = value.length === options.length
  const summary = formatSummary(options, value, placeholder, selectAllLabel)
  const textSize = compact ? 'text-xs' : 'text-sm'

  const toggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id]
    if (minOne && next.length === 0) return
    onChange(next)
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      onChange(minOne ? [allIds[0]] : [])
    } else {
      onChange([...allIds])
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
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
          className={`absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border)] bg-white shadow-lg py-1 max-h-[240px] overflow-y-auto ${textSize} ${panelClassName}`}
        >
          {selectAllLabel && (
            <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--border)]/50 border-b border-[var(--border)]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="rounded border-[var(--border)]"
              />
              <span className="text-[var(--text)] font-medium">{selectAllLabel}</span>
            </label>
          )}
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[var(--border)]/50"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.id)}
                onChange={() => toggle(opt.id)}
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
