'use client'

import React from 'react'
import VocabularyThinSession from '@/components/vocabulary/VocabularyThinSession'
import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import {
  pickNextSessionWords,
  resolveVocabularyTempo,
  sessionSizeForTempo,
} from '@/lib/vocabulary/srs'
import {
  createEmptyVocabularyProgress,
  loadVocabularyProgress,
} from '@/lib/vocabulary/storage'
import type { VocabularyFooterView, VocabularyProgressState, VocabularyTempo } from '@/types/vocabulary'

type Props = {
  packId: string
  onBack: () => void
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onOpenTranslationWithHandoff?: () => void
}

export default function VocabularyPackSessionScreen({
  packId,
  onBack,
  onFooterViewChange,
  onOpenTranslationWithHandoff,
}: Props) {
  const [progress, setProgress] = React.useState<VocabularyProgressState>(createEmptyVocabularyProgress())
  const [tempo] = React.useState<VocabularyTempo>(() => resolveVocabularyTempo())
  const pack = React.useMemo(() => loadCustomWordPacks().find((item) => item.id === packId) ?? null, [packId])
  const pool = React.useMemo(() => (pack ? customPackToNecessaryWords(pack) : []), [pack])
  const [nonce, setNonce] = React.useState(0)
  const words = React.useMemo(() => {
    return pickNextSessionWords({
      words: pool,
      progressMap: progress.words,
      size: sessionSizeForTempo(tempo),
    })
  }, [nonce, pool, progress.words, tempo])

  React.useEffect(() => {
    setProgress(loadVocabularyProgress())
  }, [])

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

  return (
    <VocabularyThinSession
      key={`${packId}-${nonce}`}
      words={words}
      distractorPool={pool}
      route={{ kind: 'pack', packId }}
      tempo={tempo}
      routeTitle={pack.title}
      setProgress={setProgress}
      onFooterViewChange={onFooterViewChange}
      onExit={onBack}
      onAgain={() => setNonce((n) => n + 1)}
      onHandoffTranslation={() => onOpenTranslationWithHandoff?.()}
    />
  )
}
