'use client'

import React from 'react'
import { manropeHome } from '@/lib/manropeHome'

type HomeEmptyBubbleProps = {
  text?: string | null
  className?: string
}

/**
 * Пустой декоративный пузырь под стартовым контентом.
 * При наличии текста показывает его как отдельный факт-блок без вложенных карточек.
 */
export default function HomeEmptyBubble({ text, className = '' }: HomeEmptyBubbleProps) {
  const hasText = Boolean(text?.trim())

  return (
    <section
      className={`w-full max-w-[23.2rem] ${className}`}
      aria-hidden={hasText ? undefined : 'true'}
      aria-label={hasText ? 'Факт MyEng' : undefined}
    >
      <div className="relative min-h-[7rem] overflow-hidden rounded-[1.2825rem] border border-[#e6d38a] bg-[linear-gradient(180deg,rgba(255,250,214,0.98)_0%,rgba(255,241,173,0.95)_100%)] px-4 py-4 shadow-[0_14px_32px_rgba(176,148,36,0.16)] backdrop-blur-[2px] sm:px-5 sm:py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(228,191,53,0)_0%,rgba(228,191,53,0.95)_50%,rgba(228,191,53,0)_100%)]" />
        {hasText && (
          <div className={`${manropeHome.className} flex max-w-[22rem] flex-col gap-3`}>
            <span className="inline-flex w-fit rounded-full border border-[#ead78a] bg-[#fff8d8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#846a0f]">
              Интересный факт
            </span>
            <p className="break-words text-[17px] font-[557] leading-[1.58] text-[#2f2a1c] sm:text-[18px]">
              {text}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
