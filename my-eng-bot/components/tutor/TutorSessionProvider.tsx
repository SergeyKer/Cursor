'use client'

import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import { resolveReviewChipTopic } from '@/lib/languageNote/resolveReviewChipTopic'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import {
  stashTutorReturnContext,
  type TutorReturnContextSnapshot,
} from '@/lib/tutor/tutorReturnContext'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export type TutorSessionSettings = {
  audience: Audience
  level: LevelId
  provider: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
}

export type TutorCheatsheetResult =
  | { kind: 'opened' }
  | { kind: 'missing'; message: string }
  | { kind: 'unavailable'; message: string }

type TutorSessionContextValue = {
  settings: TutorSessionSettings
  referenceEnabled: boolean
  openCheatsheet: (params: {
    answer: TutorExplainAnswer
    snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
  }) => TutorCheatsheetResult
}

const TutorSessionContext = createContext<TutorSessionContextValue | null>(null)

export type TutorSessionProviderProps = {
  children: React.ReactNode
  settings: TutorSessionSettings
  /** Open catalog reference sheet and return via from:'tutor'. */
  onOpenLocalReference: (lessonId: string) => void | Promise<void>
}

export function TutorSessionProvider({
  children,
  settings,
  onOpenLocalReference,
}: TutorSessionProviderProps) {
  const openCheatsheet = useCallback(
    (params: {
      answer: TutorExplainAnswer
      snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
    }): TutorCheatsheetResult => {
      if (!featureFlags.referenceV1) {
        return { kind: 'unavailable', message: TUTOR_CHAT_COPY.cheatsheetUnavailable }
      }
      if (params.answer.cheatsheetVisibility === 'hidden') {
        return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
      }

      const hint = params.answer.topicAnchor.lessonIdHint?.trim() || null
      if (hint) {
        stashTutorReturnContext(params.snapshot)
        void onOpenLocalReference(hint)
        return { kind: 'opened' }
      }

      const chipTitle =
        params.answer.topicAnchor.title ||
        params.answer.title ||
        params.answer.topicAnchor.canonicalKey
      const resolved = resolveReviewChipTopic({
        chipTitle,
        noteLessonId: hint,
      })

      if (resolved.kind === 'local') {
        stashTutorReturnContext(params.snapshot)
        void onOpenLocalReference(resolved.lessonId)
        return { kind: 'opened' }
      }

      // Generate path: Phase 2 soft-miss until dedicated tutor generate wiring lands.
      // Plan allows generate for real topics; allowlist miss is an expected soft miss.
      return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
    },
    [onOpenLocalReference]
  )

  const value = useMemo<TutorSessionContextValue>(
    () => ({
      settings,
      referenceEnabled: featureFlags.referenceV1,
      openCheatsheet,
    }),
    [openCheatsheet, settings]
  )

  return <TutorSessionContext.Provider value={value}>{children}</TutorSessionContext.Provider>
}

export function useTutorSession(): TutorSessionContextValue {
  const ctx = useContext(TutorSessionContext)
  if (!ctx) {
    throw new Error('useTutorSession must be used within TutorSessionProvider')
  }
  return ctx
}

/** Soft access when panel may render outside provider in tests. */
export function useTutorSessionOptional(): TutorSessionContextValue | null {
  return useContext(TutorSessionContext)
}
