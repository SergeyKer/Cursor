import { NextRequest, NextResponse } from 'next/server'
import { callProviderVision } from '@/lib/callProviderVision'
import type { AiProvider, ImageAnalysisResult, LevelId, Audience, OpenAiChatPreset } from '@/lib/types'

type AnalyzeImageBody = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  imageDataUrl?: string
  level?: LevelId
  audience?: Audience
  customFocus?: string
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx < 0) return 0
  const base64 = dataUrl.slice(commaIdx + 1)
  return Math.floor((base64.length * 3) / 4)
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function normalizeResult(parsed: unknown): ImageAnalysisResult | null {
  if (!parsed || typeof parsed !== 'object') return null
  const data = parsed as Record<string, unknown>
  const whatISee = (data.whatISee ?? {}) as Record<string, unknown>
  const whatToLearn = (data.whatToLearn ?? {}) as Record<string, unknown>

  const summaryRu = typeof whatISee.summaryRu === 'string' ? whatISee.summaryRu : ''
  const objectsRaw = Array.isArray(whatISee.objects) ? whatISee.objects : []
  const actionsRaw = Array.isArray(whatISee.actions) ? whatISee.actions : []
  const focusRaw = Array.isArray(whatToLearn.focus) ? whatToLearn.focus : []
  const vocabRaw = Array.isArray(whatToLearn.vocabulary) ? whatToLearn.vocabulary : []
  const practiceHint = typeof whatToLearn.practiceHint === 'string' ? whatToLearn.practiceHint : ''
  const nextStepHint = typeof data.nextStepHint === 'string' ? data.nextStepHint : ''

  const normalized: ImageAnalysisResult = {
    whatISee: {
      summaryRu: summaryRu || 'Не удалось уверенно описать изображение.',
      objects: objectsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const nameRu = typeof row.nameRu === 'string' ? row.nameRu : ''
          const confidence = typeof row.confidence === 'number' ? row.confidence : undefined
          if (!nameRu) return null
          return { nameRu, confidence }
        })
        .filter(Boolean) as ImageAnalysisResult['whatISee']['objects'],
      actions: actionsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const phraseRu = typeof row.phraseRu === 'string' ? row.phraseRu : ''
          if (!phraseRu) return null
          return { phraseRu }
        })
        .filter(Boolean) as ImageAnalysisResult['whatISee']['actions'],
    },
    whatToLearn: {
      focus: focusRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const topic = typeof row.topic === 'string' ? row.topic : ''
          const why = typeof row.why === 'string' ? row.why : ''
          if (!topic || !why) return null
          return { topic, why }
        })
        .filter(Boolean) as ImageAnalysisResult['whatToLearn']['focus'],
      vocabulary: vocabRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const word = typeof row.word === 'string' ? row.word : ''
          const translation = typeof row.translation === 'string' ? row.translation : ''
          if (!word || !translation) return null
          return { word, translation }
        })
        .filter(Boolean) as ImageAnalysisResult['whatToLearn']['vocabulary'],
      practiceHint: practiceHint || 'Опиши фото 2-3 короткими предложениями по теме.',
    },
    nextStepHint: nextStepHint || 'Выберите тему из рекомендаций и переходите к тренировке.',
  }

  return normalized
}

function buildPrompt(level: LevelId, audience: Audience, customFocus?: string): string {
  const lines = [
    'Ты ассистент по английскому для приложения MyEng.',
    'Проанализируй изображение и ответь СТРОГО JSON-объектом без markdown.',
    `Уровень ученика: ${level}. Аудитория: ${audience}.`,
    'Используй только русский язык для текста рекомендаций.',
    'Точный JSON-формат:',
    '{',
    '  "whatISee": {',
    '    "summaryRu": "строка",',
    '    "objects": [{"nameRu": "строка", "confidence": 0.0}],',
    '    "actions": [{"phraseRu": "строка"}]',
    '  },',
    '  "whatToLearn": {',
    '    "focus": [{"topic": "строка", "why": "строка"}],',
    '    "vocabulary": [{"word": "строка", "translation": "строка"}],',
    '    "practiceHint": "строка"',
    '  },',
    '  "nextStepHint": "строка"',
    '}',
    'Не добавляй никаких комментариев и пояснений вне JSON.',
  ]
  if (customFocus?.trim()) {
    lines.push(`Пожелание ученика по теме: ${customFocus.trim()}. Учти это в блоке whatToLearn.`)
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  let body: AnalyzeImageBody
  try {
    body = (await req.json()) as AnalyzeImageBody
  } catch {
    return NextResponse.json({ error: 'Неверный JSON в запросе.' }, { status: 400 })
  }

  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset: OpenAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const level: LevelId = body.level ?? 'a2'
  const audience: Audience = body.audience ?? 'adult'
  const customFocus = typeof body.customFocus === 'string' ? body.customFocus : undefined
  const imageDataUrl = body.imageDataUrl?.trim() ?? ''

  if (!imageDataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Ожидается изображение в формате data URL.' }, { status: 400 })
  }
  if (estimateDataUrlBytes(imageDataUrl) > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Изображение слишком большое. Максимум 6 MB.' }, { status: 413 })
  }

  const modelResult = await callProviderVision({
    provider,
    req,
    imageDataUrl,
    prompt: buildPrompt(level, audience, customFocus),
    openAiChatPreset,
  })
  if (!modelResult.ok) {
    const text = modelResult.errText || 'Не удалось выполнить анализ изображения.'
    return NextResponse.json({ error: text }, { status: modelResult.status })
  }

  const jsonText = extractJsonObject(modelResult.content)
  if (!jsonText) {
    return NextResponse.json({ error: 'Модель вернула невалидный ответ анализа.' }, { status: 502 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return NextResponse.json({ error: 'Не удалось разобрать JSON анализа.' }, { status: 502 })
  }

  const analysis = normalizeResult(parsed)
  if (!analysis) {
    return NextResponse.json({ error: 'Некорректная структура результата анализа.' }, { status: 502 })
  }

  return NextResponse.json({ analysis })
}
