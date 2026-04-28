'use client'

import { useEffect, useRef, useState } from 'react'

interface TypingTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export default function TypingText({ text, speed = 30, onComplete, className }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setDisplayedText('')

    let charIndex = 0
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1))
          charIndex += 1
          return
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onComplete?.()
      }, speed)
    }, 100)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [text, speed, onComplete])

  return (
    <div className="flex min-h-6 w-full items-start gap-1 overflow-hidden">
      <span
        className={`max-w-full whitespace-normal break-words text-sm leading-tight text-[var(--text-muted,#6b7280)] ${
          className ?? ''
        }`}
      >
        {displayedText}
      </span>
      {displayedText.length < text.length && (
        <span
          className="typing-caret mt-0.5 inline-block h-4 w-1.5 shrink-0 rounded-[1px] bg-blue-400"
          aria-hidden
        />
      )}
    </div>
  )
}
