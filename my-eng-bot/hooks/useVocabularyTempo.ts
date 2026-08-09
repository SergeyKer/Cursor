'use client'

import React from 'react'
import {
  resolveVocabularyTempo,
  saveVocabularyTempo,
  sessionSizeForTempo,
} from '@/lib/vocabulary/srs'
import type { VocabularyTempo } from '@/types/vocabulary'

export function useVocabularyTempo() {
  const [tempo, setTempoState] = React.useState<VocabularyTempo>(() => resolveVocabularyTempo())

  const setTempo = React.useCallback((next: VocabularyTempo) => {
    saveVocabularyTempo(next)
    setTempoState(next)
  }, [])

  const size = sessionSizeForTempo(tempo)

  return { tempo, setTempo, size }
}
