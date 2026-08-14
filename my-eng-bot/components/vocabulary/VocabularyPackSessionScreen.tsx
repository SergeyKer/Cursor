'use client'

import React from 'react'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import { getCachedNecessaryWords } from '@/lib/vocabulary/catalogCache'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { pickNextSessionWords, VOCAB_CYCLE_SIZE } from '@/lib/vocabulary/srs'
import { VOCAB_SCREEN_TITLE } from '@/lib/vocabulary/cardStyles'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
} from '@/lib/vocabulary/storage'
import type { Audience } from '@/lib/types'
import type { VocabularyFooterView, VocabularyProgressState } from '@/types/vocabulary'

type Props = {
  packId: string
  audience?: Audience
  onBack: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onSessionActiveChange?: (active: boolean) => void
  onRegisterLeaveHandler?: (handler: (() => void) | null) => void
  exitRequestKey?: number
  onOpenTranslationWithHandoff?: () => void
  onOpenCallWithHandoff?: () => void
  onOpenPracticeTopic?: (topic: string) => void
}

export default function VocabularyPackSessionScreen({
  packId,
  audience = 'adult',
  onBack,
  onFooterViewChange,
  onSessionActiveChange,
  onRegisterLeaveHandler,
  exitRequestKey = 0,
  onOpenTranslationWithHandoff,
}: Props) {
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [started, setStarted] = React.useState(false)
  const pack = React.useMemo(() => loadCustomWordPacks().find((item) => item.id === packId) ?? null, [packId])
  const pool = React.useMemo(() => {
    if (!pack) return []
    return customPackToNecessaryWords(pack, {
      catalog: getCachedNecessaryWords() ?? [],
      progressMap: progress.words,
    })
  }, [pack, progress.words])
  const [nonce, setNonce] = React.useState(0)
  const words = React.useMemo(() => {
    return pickNextSessionWords({
      words: pool,
      progressMap: progress.words,
      size: VOCAB_CYCLE_SIZE,
    })
  }, [nonce, pool, progress.words])

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [])

  React.useEffect(() => {
    onRegisterLeaveHandler?.(() => onBack())
    return () => onRegisterLeaveHandler?.(null)
  }, [onBack, onRegisterLeaveHandler])

  React.useEffect(() => {
    if (exitRequestKey <= 0) return
    onBack()
  }, [exitRequestKey, onBack])

  React.useEffect(() => {
    if (started) return
    onFooterViewChange?.({
      dynamicText: 'Начни порцию из своего списка.',
      staticText: pack ? `Свой список | ${pack.title}` : 'Свой список',
      typingKey: `vocab-pack-preflight-${packId}`,
    })
  }, [started, onFooterViewChange, pack, packId])

  if (!pack) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--text-muted)]">Список не найден.</p>
        <button type="button" className="btn-3d-menu mt-3 px-3 py-2 text-sm" onClick={onBack}>
          Назад
        </button>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--text-muted)]">В списке «{pack.title}» пока нечего учить.</p>
        <button type="button" className="btn-3d-menu mt-3 px-3 py-2 text-sm" onClick={onBack}>
          Назад
        </button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
        <div className="chat-shell-x mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3 py-3">
          <div className="flex items-center justify-between gap-2 rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className={VOCAB_SCREEN_TITLE}>{pack.title}</p>
              <p className="text-[13px] text-[var(--text-muted)]">Свой список · порция до старта</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="btn-3d-menu rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)]"
            >
              Назад
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
          >
            Учить · {words.length}
          </button>
        </div>
      </div>
    )
  }

  return (
    <VocabularyThinSession
      key={`${packId}-${nonce}`}
      words={words}
      distractorPool={pool}
      route={{ kind: 'pack', packId }}
      tempo="sprint"
      routeTitle={pack.title}
      audience={audience}
      setProgress={setProgress}
      onFooterViewChange={onFooterViewChange}
      onSessionActiveChange={onSessionActiveChange}
      onExit={onBack}
      onAgain={() => {
        const latest = loadVocabularyProgress()
        setProgress(latest)
        const next = pickNextSessionWords({
          words: pool,
          progressMap: latest.words,
          size: VOCAB_CYCLE_SIZE,
        })
        if (next.length === 0) {
          setStarted(false)
          return
        }
        setNonce((n) => n + 1)
      }}
      onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
    />
  )
}
