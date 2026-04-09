import type { NextRequest } from 'next/server'
import type { Audience, LevelId } from '@/lib/types'
import { callProviderChat } from '@/lib/callProviderChat'
import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'

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
}): Promise<string | null> {
  const { ruSentence, level, audience, provider, req } = params
  const trimmed = ruSentence.replace(/\s+/g, ' ').trim()
  if (!trimmed || !/[А-Яа-яЁё]/.test(trimmed)) return null

  const audienceHint = audience === 'child' ? 'young learner' : 'adult'
  const system = `You translate one Russian exercise sentence into exactly one natural English sentence for a language learner. CEFR context: level ${level}, audience ${audienceHint}. Output ONLY the English sentence on one line. No quotes, no labels, no Russian, no commentary.`

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
