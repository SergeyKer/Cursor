'use client'

import { playVocabTts, stopVocabTts } from '@/lib/vocabulary/playVocabTts'
import { VOCAB_CARD_SURFACE, VOCAB_LEMMA_RU, VOCAB_PAIR_EN, VOCAB_PAIR_LINE } from '@/lib/vocabulary/cardStyles'

type Props = {
  en: string
  ru: string
  statusLabel: string
  listenLabel: string
}

export default function VocabShelfRow({ en, ru, statusLabel, listenLabel }: Props) {
  return (
    <article className={`${VOCAB_CARD_SURFACE} px-3 py-2`}>
      <div className="flex items-start gap-2">
        <p className={`min-w-0 flex-1 ${VOCAB_PAIR_LINE}`}>
          <span className={VOCAB_PAIR_EN}>{en}</span>
        </p>
        {statusLabel ? (
          <span className="shrink-0 whitespace-nowrap rounded-md border border-[var(--chat-section-neutral-border)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--text)] sm:text-[11px]">
            {statusLabel}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={listenLabel}
          className="shrink-0 rounded-lg px-2 py-1 text-[16px] text-[var(--text-muted)]"
          onClick={() => {
            stopVocabTts()
            void playVocabTts(en)
          }}
        >
          ♪
        </button>
      </div>
      <p className={`mt-0.5 break-words ${VOCAB_LEMMA_RU}`}>{ru}</p>
    </article>
  )
}
