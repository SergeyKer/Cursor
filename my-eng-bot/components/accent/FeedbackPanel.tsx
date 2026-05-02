'use client'

import type { AccentBlockFeedback } from '@/types/accent'

interface FeedbackPanelProps {
  feedback: AccentBlockFeedback
}

export default function FeedbackPanel({ feedback }: FeedbackPanelProps) {
  const toneClass =
    feedback.score >= 80
      ? 'border-green-200/90 bg-green-50/95 text-green-800'
      : feedback.score >= 55
        ? 'border-amber-200/90 bg-amber-50/95 text-amber-800'
        : 'border-blue-200/90 bg-blue-50/95 text-blue-800'

  return (
    <section className={`lesson-enter chat-section-surface glass-surface rounded-xl border px-3 py-3 ${toneClass}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{feedback.summary}</p>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-sm font-bold">{feedback.score}%</span>
      </div>
      <p className="whitespace-pre-line text-[14px] leading-[1.45]">{feedback.coachMessage}</p>
      {feedback.problemWords.length > 0 && (
        <p className="mt-2 text-xs leading-[1.35] opacity-80">В фокусе: {feedback.problemWords.slice(0, 8).join(', ')}</p>
      )}
    </section>
  )
}
