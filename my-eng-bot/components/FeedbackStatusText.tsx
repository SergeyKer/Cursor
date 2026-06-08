'use client'

import { parseFeedbackStatusText } from '@/lib/feedbackMarkers'

type FeedbackStatusTextProps = {
  text: string
  className?: string
}

export default function FeedbackStatusText({ text, className = '' }: FeedbackStatusTextProps) {
  const parsed = parseFeedbackStatusText(text)

  if (parsed.kind === 'plain') {
    return (
      <p className={`whitespace-pre-line break-words text-[15px] leading-[1.45] ${className}`.trim()}>
        {parsed.text}
      </p>
    )
  }

  return (
    <p
      className={`flex items-start gap-1.5 text-[15px] leading-[1.45] ${className}`.trim()}
      aria-label={text}
    >
      <span
        className={`mt-[0.4em] h-2.5 w-2.5 shrink-0 rounded-full ${parsed.dotClass}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 whitespace-pre-line break-words">{parsed.text}</span>
    </p>
  )
}

