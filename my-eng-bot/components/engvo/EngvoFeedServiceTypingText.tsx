'use client'

import TypingText from '@/components/TypingText'
import { ENGVO_SERVICE_TYPEWRITER_CHAR_MS } from '@/lib/practice/practiceRevealTiming'

const ENGVO_FEED_SERVICE_TYPING_CLASS =
  'w-fit text-[14px] italic typing-indicator-text-shimmer'

type EngvoFeedServiceTypingTextProps = {
  text: string
  className?: string
}

export default function EngvoFeedServiceTypingText({
  text,
  className,
}: EngvoFeedServiceTypingTextProps) {
  return (
    <TypingText
      text={text}
      mode="char"
      speed={ENGVO_SERVICE_TYPEWRITER_CHAR_MS}
      startDelayMs={0}
      fadeWhileTyping={false}
      singleLine
      className={className ?? ENGVO_FEED_SERVICE_TYPING_CLASS}
    />
  )
}
