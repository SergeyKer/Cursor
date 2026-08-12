'use client'

import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import {
  abandonCheatsheetGenerate,
  resolveTutorCheatsheetOpen,
} from '@/lib/tutor/resolveTutorCheatsheetOpen'
import { resolveGroundedCheatsheetSheet } from '@/lib/tutor/resolveGroundedCheatsheetSheet'
import { generateReferenceSheet } from '@/lib/reference/generateReferenceSheet'
import { materializeReferenceCandidate } from '@/lib/reference/resolveReferenceOpen'
import type { ReferenceCandidate } from '@/lib/reference/resolveReferenceOpen'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import {
  peekTutorReturnContext,
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
  | { kind: 'needs_choose'; candidates: ReferenceCandidate[] }

type TutorSessionContextValue = {
  settings: TutorSessionSettings
  referenceEnabled: boolean
  openCheatsheet: (params: {
    answer: TutorExplainAnswer
    snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
  }) => Promise<TutorCheatsheetResult>
  openCheatsheetCandidate: (candidate: ReferenceCandidate) => Promise<TutorCheatsheetResult>
}

const TutorSessionContext = createContext<TutorSessionContextValue | null>(null)

export type TutorSessionProviderProps = {
  children: React.ReactNode
  settings: TutorSessionSettings
  onOpenLocalReference: (lessonId: string) => boolean | void | Promise<boolean | void>
  onOpenGeneratedReference?: (sheet: import('@/lib/reference/types').ReferenceSheet) => void | Promise<void>
}

export function TutorSessionProvider({
  children,
  settings,
  onOpenLocalReference,
  onOpenGeneratedReference,
}: TutorSessionProviderProps) {
  const openRuntime = useCallback(
    async (sheet: import('@/lib/reference/types').ReferenceSheet) => {
      if (onOpenGeneratedReference) await onOpenGeneratedReference(sheet)
    },
    [onOpenGeneratedReference]
  )

  const openCheatsheetCandidate = useCallback(
    async (candidate: ReferenceCandidate): Promise<TutorCheatsheetResult> => {
      const materialized = materializeReferenceCandidate(candidate)
      if (materialized.kind === 'open') {
        if (candidate.openKind === 'local_lesson' && candidate.lessonId) {
          void onOpenLocalReference(candidate.lessonId)
        } else {
          await openRuntime(materialized.sheet)
        }
        return { kind: 'opened' }
      }
      const groundedExplain = peekTutorReturnContext()?.lastExplain ?? undefined
      if (materialized.kind === 'generate' && (featureFlags.referenceGenerate || groundedExplain)) {
        const generated = await generateReferenceSheet({
          query: materialized.query,
          level: settings.level,
          audience: settings.audience,
          provider: settings.provider,
          openAiChatPreset: settings.openAiChatPreset,
          groundedExplain,
        })
        if (generated.kind === 'generated' && onOpenGeneratedReference) {
          await onOpenGeneratedReference(generated.sheet)
          return { kind: 'opened' }
        }
        abandonCheatsheetGenerate()
        return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
      }
      return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
    },
    [onOpenGeneratedReference, onOpenLocalReference, openRuntime, settings]
  )

  const openCheatsheet = useCallback(
    async (params: {
      answer: TutorExplainAnswer
      snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
    }): Promise<TutorCheatsheetResult> => {
      const result = resolveTutorCheatsheetOpen({
        answer: params.answer,
        snapshot: params.snapshot,
        openLocalReference: (lessonId) => {
          void onOpenLocalReference(lessonId)
        },
        openRuntimeSheet: (sheet) => {
          void openRuntime(sheet)
        },
      })
      if (result.kind === 'needs_choose') {
        return { kind: 'needs_choose', candidates: result.candidates }
      }
      if (result.kind === 'needs_generate') {
        const answer = params.answer
        const richQuery = [
          answer.topicAnchor.title,
          answer.title,
          answer.contrastPair?.join(' / '),
          answer.paragraphs[0],
          answer.examplesEn[0],
        ]
          .map((part) => (part ?? '').trim())
          .filter(Boolean)
          .join(' — ')
        const resolved = await resolveGroundedCheatsheetSheet({
          answer,
          query: richQuery || result.query,
          level: settings.level,
          audience: settings.audience,
          provider: settings.provider,
          openAiChatPreset: settings.openAiChatPreset,
        })
        if (resolved.kind === 'opened' && onOpenGeneratedReference) {
          await onOpenGeneratedReference(resolved.sheet)
          return { kind: 'opened' }
        }
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[tutor] grounded cheatsheet open failed', resolved)
        }
        abandonCheatsheetGenerate()
        return {
          kind: 'missing',
          message: TUTOR_CHAT_COPY.cheatsheetGenerateFailed,
        }
      }
      return result
    },
    [onOpenGeneratedReference, onOpenLocalReference, openRuntime, settings]
  )

  const value = useMemo<TutorSessionContextValue>(
    () => ({
      settings,
      referenceEnabled: featureFlags.referenceV1,
      openCheatsheet,
      openCheatsheetCandidate,
    }),
    [openCheatsheet, openCheatsheetCandidate, settings]
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
