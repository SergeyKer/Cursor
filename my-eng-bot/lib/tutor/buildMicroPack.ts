import type { TutorExplainAnswer, TutorMicroItem, TutorMicroPack } from '@/lib/tutor/types'
import { normalizeTutorMicroPack } from '@/lib/tutor/normalizeMicro'

function skillFrom(answer: TutorExplainAnswer): string | undefined {
  return answer.topicAnchor.skillTagIds?.[0] || answer.topicAnchor.canonicalKey || undefined
}

/**
 * Build a local micro pack from Explain fields (no extra LLM).
 * Phase 3: enough for in-thread check; optional API pack later.
 */
export function buildTutorMicroPackFromExplain(answer: TutorExplainAnswer): TutorMicroPack | null {
  const skillTagId = skillFrom(answer)
  const items: TutorMicroItem[] = []
  const topic = answer.topicAnchor.title || answer.title

  if (answer.contrastPair) {
    const [left, right] = answer.contrastPair
    items.push({
      id: 'contrast_pick',
      kind: 'pick_side',
      promptRu: `Что ближе к теме «${topic}»?`,
      options: [left, right],
      correctIndex: 0,
      ...(skillTagId ? { skillTagId } : {}),
    })
    if (answer.examplesEn[0]) {
      items.push({
        id: 'contrast_example',
        kind: 'best_fit',
        promptRu: `Какая форма лучше подходит к примеру: ${answer.examplesEn[0]}`,
        options: [left, right],
        correctIndex: 0,
        ...(skillTagId ? { skillTagId } : {}),
      })
    }
  }

  for (let i = 0; i < answer.examplesEn.length && items.length < 4; i += 1) {
    const ex = answer.examplesEn[i]!
    const trap =
      answer.examplesEn[(i + 1) % Math.max(answer.examplesEn.length, 1)] ??
      `${ex.replace(/\b(have|has|had)\b/i, 'had')}?`
    if (trap === ex) continue
    items.push({
      id: `ex_${i}`,
      kind: 'best_fit',
      promptRu: 'Выбери верный пример',
      options: i % 2 === 0 ? [ex, trap] : [trap, ex],
      correctIndex: i % 2 === 0 ? 0 : 1,
      ...(skillTagId ? { skillTagId } : {}),
    })
  }

  if (items.length < 2 && answer.rememberRu) {
    items.push({
      id: 'remember_true',
      kind: 'choice',
      promptRu: 'Верно ли это правило?',
      options: [answer.rememberRu, 'Это правило про другое время/форму'],
      correctIndex: 0,
      ...(skillTagId ? { skillTagId } : {}),
    })
    items.push({
      id: 'remember_topic',
      kind: 'choice',
      promptRu: `Тема сейчас — «${topic}»?`,
      options: ['Да', 'Нет, другая'],
      correctIndex: 0,
      ...(skillTagId ? { skillTagId } : {}),
    })
  }

  const summaryRu =
    answer.rememberRu ||
    `Коротко: ${topic}. Можно уточнить или открыть шпаргалку.`

  return normalizeTutorMicroPack({ items, summaryRu })
}
