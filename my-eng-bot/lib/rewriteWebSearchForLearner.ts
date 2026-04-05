import type { NextRequest } from 'next/server'
import type { AppMode, Audience, LevelId } from '@/lib/types'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildCefrPromptBlock } from '@/lib/cefr/cefrSpec'

function buildRewriteDetailInstruction(detailLevel: 0 | 1 | 2): string {
  if (detailLevel === 2) {
    return 'Length: up to two short paragraphs; still stay inside the CEFR ceiling above.'
  }
  if (detailLevel === 1) {
    return 'Length: about 4–6 short sentences.'
  }
  return 'Length: 2–4 very short sentences only.'
}

function buildEnglishAudienceHint(audience: Audience): string {
  return audience === 'child'
    ? 'Audience: CHILD. Warm, friendly, concrete wording; short lines; no formal news-anchor tone; avoid frightening framing.'
    : 'Audience: ADULT. Neutral, respectful adult tone; clear and concise; not childish.'
}

/**
 * Второй проход после web-search: переписывает черновик под уровень и аудиторию.
 * Не добавляет URL, маркеры (i), приветствия.
 */
export async function rewriteWebSearchAnswerForLearner(params: {
  provider: 'openai' | 'openrouter'
  req: NextRequest
  rawAnswer: string
  level: LevelId
  audience: Audience
  detailLevel: 0 | 1 | 2
  userQuery: string
  /** Для level === "all": короткие образцы речи пользователя (латиница), чтобы не уходить сложнее их. */
  learnerEnglishSamples?: string[]
}): Promise<string | null> {
  return simplifyEnglishAnswerForLearner({
    provider: params.provider,
    req: params.req,
    rawAnswer: params.rawAnswer,
    level: params.level,
    audience: params.audience,
    detailLevel: params.detailLevel,
    userQuery: params.userQuery,
    learnerEnglishSamples: params.learnerEnglishSamples,
    sourceKind: 'web_search',
  })
}

export async function simplifyEnglishAnswerForLearner(params: {
  provider: 'openai' | 'openrouter'
  req: NextRequest
  rawAnswer: string
  level: LevelId
  audience: Audience
  detailLevel: 0 | 1 | 2
  userQuery: string
  learnerEnglishSamples?: string[]
  sourceKind?: 'web_search' | 'chat'
  previousDraftTooHard?: boolean
  requireFactualSummary?: boolean
}): Promise<string | null> {
  const raw = params.rawAnswer.trim()
  if (!raw) return null

  const cefrBlock = buildCefrPromptBlock({
    level: params.level,
    audience: params.audience,
    mode: 'communication',
  })

  const adaptiveBlock =
    params.level === 'all'
      ? [
          'CEFR mode is adaptive ("all"). Infer the learner\'s English level ONLY from the recent user samples below.',
          'Match their apparent vocabulary and sentence length; do not jump to noticeably harder English than their samples.',
          'Recent user English samples (may be empty):',
          params.learnerEnglishSamples?.length
            ? params.learnerEnglishSamples.map((s, i) => `${i + 1}. ${s}`).join('\n')
            : '(none — keep plain simple English.)',
        ].join('\n')
      : ''

  const sourceKindHint =
    params.sourceKind === 'chat'
      ? 'You rewrite normal communication chat replies for an English-learning app.'
      : 'You rewrite web-search summaries for an English-learning chat app.'

  const retryHint = params.previousDraftTooHard
    ? 'Previous draft was still above target CEFR. Rewrite even simpler: keep only 1-2 easiest facts that fit the level; drop extra details.'
    : ''
  const factualHint = params.requireFactualSummary
    ? 'Return 1-2 simple factual sentences about the user topic. Do not return only a clarification question.'
    : ''

  const system = [
    sourceKindHint,
    'Keep the same core facts, names, numbers, and dates. Do not invent new facts.',
    'Simplify vocabulary and grammar to fit the learner profile below.',
    'If all facts cannot fit the CEFR ceiling, keep only the 1-2 simplest facts and drop the rest.',
    'Output plain text only: no markdown, no bullet labels like "National News", no URLs, no source names, no "(i)" prefix, no greetings.',
    cefrBlock,
    buildEnglishAudienceHint(params.audience),
    buildRewriteDetailInstruction(params.detailLevel),
    adaptiveBlock,
    retryHint,
    factualHint,
  ]
    .filter(Boolean)
    .join('\n\n')

  const user = `User question:\n${params.userQuery.trim() || '(no question)'}\n\nDraft answer to rewrite:\n${raw}`

  const maxTokens = params.previousDraftTooHard
    ? (params.detailLevel === 2 ? 360 : params.detailLevel === 1 ? 260 : 180)
    : (params.detailLevel === 2 ? 480 : params.detailLevel === 1 ? 340 : 240)

  const res = await callProviderChat({
    provider: params.provider,
    req: params.req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens,
  })

  if (!res.ok) return null
  const out = res.content.trim().replace(/^\(i\)\s*/i, '').trim()
  return out || null
}

export function collectLearnerEnglishSamples(messages: Array<{ role: string; content: string }>, maxSamples = 4): string[] {
  const out: string[] = []
  for (let i = messages.length - 1; i >= 0 && out.length < maxSamples; i--) {
    const m = messages[i]
    if (m?.role !== 'user' || typeof m.content !== 'string') continue
    const t = m.content.replace(/\s+/g, ' ').trim()
    if (!/[A-Za-z]/.test(t)) continue
    const short = t.length > 220 ? `${t.slice(0, 217)}...` : t
    out.push(short)
  }
  return out.reverse()
}

/**
 * Safety gate: learner rewrite is allowed only for English communication
 * responses that were generated via web-search path.
 */
export function shouldRewriteWebSearchForLearner(params: {
  mode: AppMode
  webSearchTriggered: boolean
  replyLanguage: 'ru' | 'en'
}): boolean {
  return params.mode === 'communication' && params.webSearchTriggered && params.replyLanguage === 'en'
}
