'use client'

import { useEffect, useRef, useState } from 'react'

interface TypingTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
  singleLine?: boolean
}

export default function TypingText({
  text,
  speed = 30,
  onComplete,
  className,
  singleLine = false,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
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
    setIsTypingComplete(false)

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
        setIsTypingComplete(true)
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
    <div className={`flex min-h-6 w-full overflow-hidden ${singleLine ? 'items-center' : 'items-start'}`}>
      <span
        className={`max-w-full text-sm leading-tight text-[var(--text-muted,#6b7280)] ${
          singleLine ? 'truncate whitespace-nowrap' : 'whitespace-normal break-words'
        } ${
          className ?? ''
        }`}
        style={{
          opacity: isTypingComplete ? 1 : 0.94,
          transition: 'opacity 180ms ease-out',
        }}
      >
        {displayedText}
      </span>
    </div>
  )
}
