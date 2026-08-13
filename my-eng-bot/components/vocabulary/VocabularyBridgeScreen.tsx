'use client'

import React from 'react'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import {
  applyFocusLemmasOutcome,
} from '@/lib/vocabulary/applyFocusOutcome'
import { utteranceHasLemma } from '@/lib/vocabulary/wordFeed'
import type { Audience } from '@/lib/types'
import type { NecessaryWord, VocabularyFocusLemma, VocabularyFooterView } from '@/types/vocabulary'

type Props = {
  lemmas: VocabularyFocusLemma[]
  words: NecessaryWord[]
  audience: Audience
  onDone: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
}

export default function VocabularyBridgeScreen({ lemmas, onDone, onFooterViewChange }: Props) {
  const target = Math.min(4, Math.max(2, lemmas.length + 1))
  const [turn, setTurn] = React.useState(0)
  const [text, setText] = React.useState('')
  const [hits, setHits] = React.useState(0)
  const [done, setDone] = React.useState(false)
  const focus = lemmas[Math.min(turn, lemmas.length - 1)]

  React.useEffect(() => {
    onFooterViewChange?.({
      dynamicText: done ? (hits > 0 ? 'Теперь в Умею.' : 'Осталось в деле.') : 'Скажи слово в ответе.',
      staticText: done ? (hits > 0 ? 'Слова | Умею' : 'Слова | В деле') : 'Слова',
      typingKey: `vocab-bridge-${turn}-${done ? 'done' : 'live'}`,
      sessionMeter: done
        ? null
        : {
            current: turn,
            target,
            sessionXp: 0,
            statusLabel: `${turn}/${target}`,
            fillPercent: Math.round((turn / target) * 100),
          },
    })
    return () => onFooterViewChange?.(null)
  }, [done, hits, onFooterViewChange, target, turn])

  const finish = (nextHits: number) => {
    setHits(nextHits)
    setDone(true)
  }

  const send = () => {
    const raw = text.trim()
    if (!raw || !focus) return
    const hit = utteranceHasLemma(raw, focus.en)
    applyFocusLemmasOutcome({
      lemmas: [focus],
      outcome: hit ? 'success' : 'fail',
      userText: raw,
      source: 'communication',
    })
    const nextHits = hits + (hit ? 1 : 0)
    setText('')
    if (turn + 1 >= target) {
      finish(nextHits)
      return
    }
    setHits(nextHits)
    setTurn((n) => n + 1)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3 overflow-y-auto py-3">
        <p className="px-1 text-[17px] font-semibold text-[var(--text)]">Сказать боту</p>
        {done ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-4 py-4">
            <p className="text-[15px] text-[var(--text)]">
              {hits > 0 ? `+${hits} в Умею` : 'Слово осталось в деле.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--chat-shell-bg)] px-4 py-4">
            <p className="text-[14px] text-[var(--text-muted)]">Скажи в ответе:</p>
            <p className="mt-1 text-[22px] font-bold text-[var(--text)]">{focus?.en}</p>
            <p className="text-[14px] text-[var(--text-muted)]">{focus?.ru}</p>
          </div>
        )}
        {!done ? (
          <div className="mt-auto flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[15px] text-[var(--text)]"
              placeholder="Напиши по-английски…"
            />
            <ProgressCtaButton onClick={send}>Отправить</ProgressCtaButton>
          </div>
        ) : (
          <ProgressCtaButton onClick={onDone}>К списку</ProgressCtaButton>
        )}
      </div>
    </div>
  )
}
