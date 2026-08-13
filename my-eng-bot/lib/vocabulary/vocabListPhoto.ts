import { buildAiSafetyRulesBlock } from '@/lib/ai/safetyPolicy'
import type { Audience } from '@/lib/types'

export type VocabListPhotoItem = { word: string; translation: string }

export type VocabListPhotoResult = {
  vocabulary: VocabListPhotoItem[]
}

export function buildVocabListPhotoPrompt(level: string, audience: Audience): string {
  const safetyAudience: Audience = audience === 'child' ? 'child' : 'adult'
  return [
    'Ты разбираешь фото списка слов для учёбы английского (доска, учебник, тетрадь, скрин чата, упражнение).',
    `Уровень: ${level}. Аудитория: ${audience}.`,
    'Верни ТОЛЬКО JSON без markdown:',
    '{ "vocabulary": [{ "word": "english lemma or short phrase", "translation": "русский перевод" }] }',
    'Правила:',
    '- word всегда английский (слово или короткая фраза вроде boarding pass).',
    '- translation всегда русский.',
    '- Если на фото только английский столбик — всё равно дай русский перевод.',
    '- Если на фото только русский столбик — подставь английский в word и оставь русский в translation.',
    '- Выкинь мусор: Unit, номера упражнений, заголовки, имена учеников.',
    '- Не выдумывай слова, которых нет на фото.',
    '- Пустой vocabulary если это не список/упражнение по английскому или фото нечитаемо.',
    'AI safety: NSFW/gore/explicit harm → empty vocabulary. Never speak AI_SAFETY marker tokens.',
    buildAiSafetyRulesBlock({ channel: 'tutor', audience: safetyAudience }),
  ].join('\n')
}

export function normalizeVocabListPhoto(input: unknown): VocabListPhotoResult {
  if (!input || typeof input !== 'object') return { vocabulary: [] }
  const row = input as Record<string, unknown>
  const raw = Array.isArray(row.vocabulary) ? row.vocabulary : []
  const vocabulary: VocabListPhotoItem[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const word = typeof rec.word === 'string' ? rec.word.trim() : ''
    const translation = typeof rec.translation === 'string' ? rec.translation.trim() : ''
    if (!word) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    vocabulary.push({ word, translation })
  }
  return { vocabulary }
}
