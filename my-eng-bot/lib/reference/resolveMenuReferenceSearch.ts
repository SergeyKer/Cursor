import { featureFlags } from '@/lib/featureFlags'
import { generateReferenceSheet } from '@/lib/reference/generateReferenceSheet'
import {
  materializeReferenceCandidate,
  resolveReferenceOpen,
  type ReferenceCandidate,
} from '@/lib/reference/resolveReferenceOpen'
import type { ReferenceSheet } from '@/lib/reference/types'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export type MenuReferenceSearchResult =
  | { kind: 'opened' }
  | { kind: 'miss'; message: string }
  | { kind: 'choose'; candidates: ReferenceCandidate[] }

/**
 * Gold-first menu search submit. Generate only on miss + referenceGenerate.
 */
export async function resolveMenuReferenceSearch(params: {
  query: string
  audience?: Audience
  level?: LevelId | string
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  openLocalLesson: (lessonId: string) => void | Promise<void>
  openSheet: (sheet: ReferenceSheet) => void | Promise<void>
}): Promise<MenuReferenceSearchResult> {
  const query = params.query.trim()
  if (!query) {
    return { kind: 'miss', message: 'Введи слово или фразу для поиска.' }
  }

  const resolved = resolveReferenceOpen({
    rawQuery: query,
    audience: params.audience,
  })

  if (resolved.kind === 'open') {
    const materialized = materializeReferenceCandidate(resolved.candidate)
    if (materialized.kind === 'open') {
      if (resolved.candidate.openKind === 'local_lesson' && resolved.candidate.lessonId) {
        await params.openLocalLesson(resolved.candidate.lessonId)
      } else {
        await params.openSheet(materialized.sheet)
      }
      return { kind: 'opened' }
    }
    if (materialized.kind === 'generate' && featureFlags.referenceGenerate) {
      const generated = await generateReferenceSheet({
        query,
        generateQuery: materialized.query,
        level: params.level,
        audience: params.audience,
        provider: params.provider,
        openAiChatPreset: params.openAiChatPreset,
      })
      if (generated.kind === 'generated') {
        await params.openSheet(generated.sheet)
        return { kind: 'opened' }
      }
      return { kind: 'miss', message: 'Не удалось собрать шпаргалку. Уточни тему и попробуй ещё раз.' }
    }
    return { kind: 'miss', message: resolved.candidate.whyRu || 'Пока нет готовой шпаргалки.' }
  }

  if (resolved.kind === 'choose') {
    return { kind: 'choose', candidates: resolved.candidates }
  }

  if (resolved.kind === 'needs_llm' && featureFlags.referenceGenerate) {
    const generated = await generateReferenceSheet({
      query: resolved.query,
      level: params.level,
      audience: params.audience,
      provider: params.provider,
      openAiChatPreset: params.openAiChatPreset,
    })
    if (generated.kind === 'generated') {
      await params.openSheet(generated.sheet)
      return { kind: 'opened' }
    }
    return { kind: 'miss', message: 'Не удалось собрать шпаргалку. Уточни тему и попробуй ещё раз.' }
  }

  if (resolved.kind === 'reject') {
    return { kind: 'miss', message: resolved.message }
  }

  return { kind: 'miss', message: 'Пока нет готовой шпаргалки по этому запросу.' }
}

export async function openMenuReferenceCandidate(params: {
  candidate: ReferenceCandidate
  level?: LevelId | string
  audience?: Audience
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  openLocalLesson: (lessonId: string) => void | Promise<void>
  openSheet: (sheet: ReferenceSheet) => void | Promise<void>
}): Promise<MenuReferenceSearchResult> {
  const materialized = materializeReferenceCandidate(params.candidate)
  if (materialized.kind === 'open') {
    if (params.candidate.openKind === 'local_lesson' && params.candidate.lessonId) {
      await params.openLocalLesson(params.candidate.lessonId)
    } else {
      await params.openSheet(materialized.sheet)
    }
    return { kind: 'opened' }
  }
  if (materialized.kind === 'generate' && featureFlags.referenceGenerate) {
    const generated = await generateReferenceSheet({
      query: params.candidate.generateQuery,
      generateQuery: params.candidate.generateQuery,
      level: params.level,
      audience: params.audience,
      provider: params.provider,
      openAiChatPreset: params.openAiChatPreset,
    })
    if (generated.kind === 'generated') {
      await params.openSheet(generated.sheet)
      return { kind: 'opened' }
    }
    return { kind: 'miss', message: 'Не удалось собрать шпаргалку. Уточни тему и попробуй ещё раз.' }
  }
  return { kind: 'miss', message: 'Пока нет готовой шпаргалки по этому запросу.' }
}
