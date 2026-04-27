'use client'

import { useEffect, useRef, useState } from 'react'

type LessonChoiceChipsProps = {
  choices: string[]
  onChoose: (choice: string) => void
  disabled?: boolean
  resetKey?: string
}

const CHOICE_DELAY_MS = 300

export default function LessonChoiceChips({
  choices,
  onChoose,
  disabled = false,
  resetKey = '',
}: LessonChoiceChipsProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSelectedChoice(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [resetKey])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const visibleChoices = selectedChoice ? choices.filter((choice) => choice === selectedChoice) : choices

  return (
    <div className="flex flex-col items-end gap-2 px-4 py-2">
      {visibleChoices.map((choice) => {
        const isSelected = selectedChoice === choice
        return (
          <button
            key={choice}
            type="button"
            disabled={disabled || Boolean(selectedChoice)}
            onClick={() => {
              if (disabled || selectedChoice) return
              setSelectedChoice(choice)
              timeoutRef.current = setTimeout(() => {
                onChoose(choice)
              }, CHOICE_DELAY_MS)
            }}
            className={`max-w-[85%] px-4 py-2.5 text-left text-sm font-medium shadow-sm transition-all duration-300 ${
              isSelected
                ? 'rounded-[var(--bubble-radius)] rounded-br-md bg-[#3B82F6] text-white'
                : 'rounded-[var(--bubble-radius)] rounded-br-md border border-[#BFDBFE] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE]'
            }`}
          >
            {choice}
          </button>
        )
      })}
    </div>
  )
}
