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
      className={`whitespace-pre-line break-words text-[15px] leading-[1.45] ${className}`.trim()}
      aria-label={text}
    >
      <span
        className="mr-1.5 inline-flex h-[1.45em] w-2.5 shrink-0 items-center align-text-top"
        aria-hidden
      >
        <span className={`h-2.5 w-2.5 rounded-full ${parsed.dotClass}`} />
      </span>
      {parsed.text}
    </p>
  )
}

