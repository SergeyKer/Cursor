'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPopularTopicsForLevel,
  getQuickTestBankBySlug,
  isLevelFrozen,
  resolveRecommendedTopicSlug,
} from '@/lib/quickTest/catalog'
import { getCompletedVariantIds, selectVariantId } from '@/lib/quickTest/selectVariant'
import { readProgress } from '@/lib/quickTest/storage'
import type { QuickTestLevelId } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY, buildQuickTestGreeting } from '@/lib/uiCopy/quickTest'
import { splitGreetingIntoBlocks } from '@/lib/homeGreeting'
import { trackQuickTest } from '@/lib/quickTest/analytics'

const LEVELS: QuickTestLevelId[] = ['A1', 'A2', 'B1', 'B2']

type LobbyPhase = 'levels' | 'topics'

type QuickTestEngvoDialogProps = {
  onFooterChange?: (dynamic: string, staticText: string, frozenHint?: boolean) => void
}

export function QuickTestEngvoDialog({ onFooterChange }: QuickTestEngvoDialogProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<LobbyPhase>('levels')
  const [level, setLevel] = useState<QuickTestLevelId | null>(null)
  const [extraBubbles, setExtraBubbles] = useState<string[]>([])

  const greetingBlocks = useMemo(() => splitGreetingIntoBlocks(buildQuickTestGreeting()), [])
  const topics = level ? getPopularTopicsForLevel(level) : []

  useEffect(() => {
    if (phase === 'levels') {
      onFooterChange?.(QUICK_TEST_COPY.pickLevelDynamic, QUICK_TEST_COPY.staticLobby, false)
    } else if (level) {
      onFooterChange?.(QUICK_TEST_COPY.pickTopicDynamic, `Уровень ${level} | выбери тему`, false)
    }
  }, [phase, level, onFooterChange])

  const startTopic = (slug: string) => {
    const bank = getQuickTestBankBySlug(slug)
    if (!bank) return
    const completed = getCompletedVariantIds(readProgress(), bank.lessonId)
    const variantId = selectVariantId({
      slug,
      completedVariantIds: completed,
      forceDefault: false,
    })
    trackQuickTest('page_view', {
      entrySource: 'test_lobby',
      slug,
      lessonId: bank.lessonId,
      variantId,
    })
    router.push(`/test/${slug}?variant=${encodeURIComponent(variantId)}`)
  }

  const onLevel = (id: QuickTestLevelId) => {
    if (isLevelFrozen(id)) {
      setExtraBubbles((prev) => [...prev, QUICK_TEST_COPY.frozenLevelBubble])
      onFooterChange?.('B1 скоро', QUICK_TEST_COPY.staticLobby, true)
      return
    }
    setLevel(id)
    setPhase('topics')
    setExtraBubbles([])
  }

  const onDontKnow = () => {
    const slug = resolveRecommendedTopicSlug()
    if (slug) startTopic(slug)
  }

  return (
    <div className="chat-shell-x mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-3 py-4">
      {greetingBlocks.map((block) => (
        <div
          key={block}
          className="chat-section-surface glass-surface max-w-[92%] self-start rounded-2xl border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--text)]"
        >
          {block}
        </div>
      ))}

      {extraBubbles.map((text, index) => (
        <div
          key={`${text}-${index}`}
          className="chat-section-surface glass-surface max-w-[92%] self-start rounded-2xl border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--text)]"
        >
          {text}
        </div>
      ))}

      {phase === 'topics' ? (
        <div className="chat-section-surface glass-surface max-w-[92%] self-start rounded-2xl border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--text)]">
          {QUICK_TEST_COPY.pickTopicBubble}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Выбор">
        {phase === 'levels'
          ? LEVELS.map((id) => {
              const frozen = isLevelFrozen(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onLevel(id)}
                  className={`min-h-[44px] rounded-full border px-3.5 py-2 text-[14px] font-medium touch-manipulation ${
                    frozen
                      ? 'border-dashed border-black/25 bg-white/30 text-[var(--text)] opacity-70'
                      : 'border-[var(--chat-section-neutral-border)] bg-white/55 text-[var(--text)]'
                  }`}
                >
                  {QUICK_TEST_COPY.levelLabels[id]}
                  {frozen ? ` · ${QUICK_TEST_COPY.frozenChipHint}` : ''}
                </button>
              )
            })
          : null}

        {phase === 'levels' ? (
          <button
            type="button"
            onClick={onDontKnow}
            className="min-h-[44px] rounded-full border border-[var(--chat-section-neutral-border)] bg-white/55 px-3.5 py-2 text-[14px] font-medium text-[var(--text)] touch-manipulation"
          >
            {QUICK_TEST_COPY.dontKnowChip}
          </button>
        ) : null}

        {phase === 'topics'
          ? topics.map((topic) => (
              <button
                key={topic.slug}
                type="button"
                onClick={() => startTopic(topic.slug)}
                className="min-h-[44px] rounded-full border border-[var(--chat-section-neutral-border)] bg-white/55 px-3.5 py-2 text-[14px] font-medium text-[var(--text)] touch-manipulation"
              >
                {topic.title}
              </button>
            ))
          : null}
      </div>
    </div>
  )
}
