'use client'

import ProgressiveRenderer from '@/components/accent/ProgressiveRenderer'
import type { AccentBlockType, AccentMinimalPair } from '@/types/accent'

interface BlockRecorderProps {
  blockType: AccentBlockType
  words: string[]
  pairs: AccentMinimalPair[]
  progressiveLines: string[]
  targetSound: string
}

export default function BlockRecorder({ blockType, words, pairs, progressiveLines, targetSound }: BlockRecorderProps) {
  if (blockType === 'pairs') {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/90">
        <div className="grid grid-cols-2 border-b border-[var(--chat-section-neutral-border)] bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <span>Цель {targetSound}</span>
          <span>Контраст</span>
        </div>
        {pairs.map((item, index) => (
          <div key={`${item.target}-${item.contrast}-${index}`} className="grid grid-cols-2 gap-2 border-b border-[var(--chat-section-neutral-border)] px-3 py-2 last:border-b-0">
            <span className="font-semibold text-[var(--text)]">{item.target}</span>
            <span className="text-[var(--text-muted)]">{item.contrast}</span>
          </div>
        ))}
      </div>
    )
  }

  if (blockType === 'progressive') {
    return <ProgressiveRenderer lines={progressiveLines} />
  }

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="lesson-enter rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[15px] font-semibold text-blue-800"
          style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}
