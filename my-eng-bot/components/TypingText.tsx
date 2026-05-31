'use client'

import { useEffect, useRef, useState } from 'react'

interface TypingTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
  singleLine?: boolean
  startDelayMs?: number
  fadeWhileTyping?: boolean
  /** Без посимвольной анимации — текст сразу (футер при подгрузке storage). */
  instant?: boolean
}

export default function TypingText({
  text,
  speed = 30,
  onComplete,
  className,
  singleLine = false,
  startDelayMs = 100,
  fadeWhileTyping = true,
  instant = false,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState(instant ? text : '')
  const [isTypingComplete, setIsTypingComplete] = useState(instant)
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

    if (instant) {
      setDisplayedText(text)
      setIsTypingComplete(true)
      onComplete?.()
      return
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
    }, startDelayMs)

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
  }, [text, speed, onComplete, startDelayMs, instant])

  return (
    <div
      className={`flex w-full overflow-visible ${singleLine ? 'h-auto min-h-0 items-center' : 'min-h-6 items-start'}`}
    >
      <span
        className={`max-w-full text-sm text-[var(--text-muted,#6b7280)] ${
          singleLine
            ? 'footer-dynamic-line truncate-x whitespace-nowrap'
            : 'emoji-line whitespace-normal break-words leading-[1.35]'
        } ${
          className ?? ''
        }`}
        style={{
          opacity: !fadeWhileTyping || isTypingComplete ? 1 : 0.94,
          transition: fadeWhileTyping ? 'opacity 180ms ease-out' : 'none',
        }}
      >
        {displayedText}
      </span>
    </div>
  )
}
