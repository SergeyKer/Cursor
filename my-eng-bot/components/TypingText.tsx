'use client'

import { useEffect, useRef, useState } from 'react'

type TypingTextMode = 'char' | 'word'

interface TypingTextProps {
  text: string
  speed?: number
  mode?: TypingTextMode
  onComplete?: () => void
  className?: string
  singleLine?: boolean
  startDelayMs?: number
  fadeWhileTyping?: boolean
  /** Без посимвольной анимации — текст сразу (футер при подгрузке storage). */
  instant?: boolean
  /** Стили контейнера: footer (default) или chat bubble body. */
  variant?: 'footer' | 'chat'
}

function splitTypingUnits(text: string, mode: TypingTextMode): string[] {
  if (mode === 'char') return [...text]
  const words = text.match(/\S+\s*/g)
  return words ?? (text ? [text] : [])
}

export default function TypingText({
  text,
  speed = 30,
  mode = 'char',
  onComplete,
  className,
  singleLine = false,
  startDelayMs = 100,
  fadeWhileTyping = true,
  instant = false,
  variant = 'footer',
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState(instant ? text : '')
  const [isTypingComplete, setIsTypingComplete] = useState(instant)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

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
      onCompleteRef.current?.()
      return
    }

    setDisplayedText('')
    setIsTypingComplete(false)

    const units = splitTypingUnits(text, mode)
    let unitIndex = 0
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (unitIndex < units.length) {
          setDisplayedText(units.slice(0, unitIndex + 1).join(''))
          unitIndex += 1
          return
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsTypingComplete(true)
        onCompleteRef.current?.()
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
  }, [text, speed, mode, startDelayMs, instant])

  const isChatVariant = variant === 'chat'

  return (
    <div
      className={`flex w-full overflow-visible ${
        isChatVariant
          ? 'min-h-0 items-start'
          : singleLine
            ? 'h-auto min-h-0 items-center'
            : 'min-h-6 items-start'
      }`}
    >
      <span
        className={`max-w-full ${
          isChatVariant
            ? 'whitespace-pre-line break-words text-[15px] leading-[1.45] text-[var(--text)]'
            : `text-sm text-[var(--text-muted,#6b7280)] ${
                singleLine
                  ? 'footer-dynamic-line truncate-x whitespace-nowrap'
                  : 'emoji-line whitespace-normal break-words leading-[1.35]'
              }`
        } ${className ?? ''}`}
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
