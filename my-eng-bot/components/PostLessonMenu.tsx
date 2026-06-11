'use client'

import { useEffect, useRef, useState } from 'react'
import {
  POST_LESSON_BLUE_BUTTON_CLASS,
  POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import type { PostLessonAction, PostLessonOption } from '@/types/lesson'

interface Props {
  options: PostLessonOption[]
  onSelect: (action: PostLessonAction) => void
  disabled?: boolean
  primaryAction?: PostLessonAction
  optionHints?: Partial<Record<PostLessonAction, string>>
  className?: string
}

const SELECT_DELAY_MS = 200

const SELECTED_PRIMARY_CLASS =
  'btn-3d-menu flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#1e40af] bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] px-2 py-2 text-center text-white shadow-md ring-2 ring-[#93c5fd]/50 touch-manipulation'

const SELECTED_SECONDARY_CLASS =
  'btn-3d-menu flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#1d4ed8] bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] px-2 py-2 text-center text-white shadow-md ring-2 ring-[#93c5fd]/40 touch-manipulation'

export default function PostLessonMenu({
  options,
  onSelect,
  disabled = false,
  primaryAction,
  optionHints,
  className = '',
}: Props) {
  const [selectedAction, setSelectedAction] = useState<PostLessonAction | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSelect = (action: PostLessonAction) => {
    if (disabled || selectedAction) return
    setSelectedAction(action)
    timeoutRef.current = setTimeout(() => {
      onSelect(action)
      timeoutRef.current = null
    }, SELECT_DELAY_MS)
  }

  return (
    <div className={`mx-auto grid w-full grid-cols-2 gap-2 ${className}`.trim()}>
      {options.map((option, index) => {
        const isSelected = selectedAction === option.action
        const hasPendingSelection = selectedAction !== null
        const isPrimary = primaryAction === option.action
        const hint = optionHints?.[option.action]
        const surfaceClass = isSelected
          ? isPrimary
            ? SELECTED_PRIMARY_CLASS
            : SELECTED_SECONDARY_CLASS
          : isPrimary
            ? POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS
            : POST_LESSON_BLUE_BUTTON_CLASS

        return (
          <div
            key={option.action}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <button
              type="button"
              onClick={() => handleSelect(option.action)}
              disabled={disabled || hasPendingSelection}
              className={`group ${surfaceClass} ${
                hasPendingSelection && !isSelected ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <span className="shrink-0 text-base leading-none">{option.icon}</span>
              <span className="min-w-0 flex flex-col items-center leading-tight">
                <span className="text-[11px] font-semibold text-white sm:text-xs">{option.label}</span>
                {hint ? (
                  <span className="text-[9px] leading-tight text-white/90 sm:text-[10px]">{hint}</span>
                ) : null}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
