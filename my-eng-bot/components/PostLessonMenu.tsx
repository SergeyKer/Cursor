'use client'

import { useEffect, useRef, useState } from 'react'
import type { PostLessonAction, PostLessonOption } from '@/types/lesson'

interface Props {
  options: PostLessonOption[]
  onSelect: (action: PostLessonAction) => void
  disabled?: boolean
}

const SELECT_DELAY_MS = 200

export default function PostLessonMenu({ options, onSelect, disabled = false }: Props) {
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
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      {options.map((option, index) => {
        const isSelected = selectedAction === option.action
        const hasPendingSelection = selectedAction !== null
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
              className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                isSelected
                  ? 'scale-[1.02] border-blue-500 bg-blue-100 text-blue-800 shadow-sm'
                  : 'border-gray-200 bg-white hover:scale-[1.02] hover:border-blue-300 hover:bg-blue-50'
              } ${hasPendingSelection && !isSelected ? 'pointer-events-none opacity-60' : ''}`}
            >
              <span
                className={`text-xl transition-transform duration-200 ${
                  isSelected ? '-translate-y-0.5' : 'group-hover:-translate-y-0.5'
                }`}
              >
                {option.icon}
              </span>
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700 group-hover:text-blue-700'}`}>
                {option.label}
              </span>
              <span className={`ml-auto ${isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>→</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
