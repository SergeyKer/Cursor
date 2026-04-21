import type { NextRequest } from 'next/server'
import type { Audience, LevelId } from '@/lib/types'
import { callProviderChat } from '@/lib/callProviderChat'
import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import { getCefrLevelConfig } from '@/lib/cefr/cefrConfig'

export function normalizeGoldEnglishSentence(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const normalized = normalizeEnglishLearnerContractions(compact)
  return /[.!?]\s*$/.test(normalized) ? normalized : `${normalized}.`
}

/**
 * Один эталонный перевод русского задания для скрытого __TRAN_REPEAT_REF__ (отдельный короткий вызов провайдера).
 */
export async function translateRussianPromptToGoldEnglish(params: {
  ruSentence: string
  level: LevelId
  audience: Audience
  provider: 'openrouter' | 'openai'
  req: NextRequest
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
}): Promise<string | null> {
  const { ruSentence, level, audience, provider, req, openAiChatPreset = 'gpt-4o-mini' } = params
  const trimmed = ruSentence.replace(/\s+/g, ' ').trim()
  if (!trimmed || !/[А-Яа-яЁё]/.test(trimmed)) return null

  const audienceHint = audience === 'child' ? 'young learner' : 'adult'
  const cefr = getCefrLevelConfig(level)
  const cefrHints = cefr
    ? ` AllowedVocabulary: ${cefr.allowedVocabulary}. Grammar focus: ${cefr.grammarKey}. Sentence length guideline: ${cefr.sentenceLengthGuideline}.`
    : ''
  const a1a2LengthRule =
    level === 'a1' || level === 'a2'
      ? ' Keep the sentence short and simple for beginner level (prefer one clause, avoid extra details not present in Russian).'
      : ' Keep natural complexity appropriate for this level without over-simplifying meaning.'
  const audienceToneRule =
    audience === 'child'
      ? ' Use clear, child-friendly wording with common everyday vocabulary.'
      : ' Use natural adult learner wording with clear, concise phrasing.'
  const russianIsQuestion = /\?\s*$/.test(trimmed)
  const questionRule = russianIsQuestion
    ? ' The Russian ends with a question mark: you MUST output a natural English question that translates it, ending with ? (same speech act as the Russian).'
    : ''
  const preferenceLexiconRule =
    ' If Russian means stable preference (for example: люблю / не люблю / мне нравится), prefer like/don\'t like in the canonical answer and avoid enjoy/enjoying as the main predicate.'
  const system = `You translate one Russian exercise sentence into exactly one natural English sentence for a language learner. CEFR context: level ${level}, audience ${audienceHint}.${cefrHints}${a1a2LengthRule}${audienceToneRule}${preferenceLexiconRule} Output ONLY the English sentence on one line. No quotes, no labels, no Russian, no commentary. Preserve the original meaning exactly; do not add extra facts, time markers, or objects not present in Russian. Use standard adverb placement: in Present Perfect put already/just/ever/never/recently/lately between have/has and the past participle; use yet only at the end in questions/negatives; in Present/Past Simple put frequency adverbs before the main verb (after be).${questionRule}`

  let res: Awaited<ReturnType<typeof callProviderChat>>
  try {
    res = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      maxTokens: 64,
      openAiChatPreset,
    })
  } catch {
    return null
  }

  if (!res?.ok) return null
  const firstLine =
    res.content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => Boolean(l) && !/^(system|user|assistant)\s*:/i.test(l)) ?? ''
  const stripped = firstLine.replace(/^["'`«»]+|["'`«»]+$/g, '').trim()
  if (!/[A-Za-z]/.test(stripped)) return null
  return normalizeGoldEnglishSentence(stripped)
}
