import { chipsFromLabels } from '@/lib/tutor/normalizeTriage'
import type { TutorTriageResult } from '@/lib/tutor/types'
import { compactText } from '@/lib/tutor/text'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

const QUESTION_RE =
  /[?？]|^(почему|зачем|как|что|когда|где|чем|в\s+ч[её]м|можно\s+ли|а\s+можно|is|are|does|do|what|why|how|when|where)\b/i

const NARROW_TOPIC_RE =
  /\b(present\s+perfect|past\s+simple|present\s+simple|past\s+perfect|future\s+simple|present\s+continuous|past\s+continuous|articles?|артикл|to\s+be|have\s+got|there\s+is|there\s+are|passive|услови|conditional|gerund|infinitive|модальные|modal)\b/i

const BROAD_TERM_RE =
  /^(существительн\w*|глагол\w*|прилагательн\w*|времен\w*|tense|noun|verb|adjective|grammar|грамматик\w*|слово|words?)$/i

const NOISE_RE = /^(.)\1{3,}$|^\W+$|^[a-zа-яё]{1,2}$/i

/**
 * Client-side triage until Phase 2 wires a dedicated model call.
 * Deterministic, cheap, no network.
 */
export function localTutorTriage(rawQuery: string): TutorTriageResult {
  const query = compactText(rawQuery, 400)
  if (!query || NOISE_RE.test(query)) {
    return { kind: 'D', clarifyPromptRu: TUTOR_CHAT_COPY.clarifyDefault }
  }

  if (BROAD_TERM_RE.test(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([
        'Как образуется',
        'Когда использовать',
        'Частые ошибки',
        'Пример в предложении',
      ]),
    }
  }

  if (NARROW_TOPIC_RE.test(query) && !QUESTION_RE.test(query)) {
    return {
      kind: 'B',
      topicHint: query,
      chips: chipsFromLabels([
        'Зачем это нужно',
        'Как образуется',
        'Чем отличается от похожего',
        'Частые ошибки',
      ]),
    }
  }

  if (QUESTION_RE.test(query) || query.split(/\s+/).length >= 4) {
    return { kind: 'A', query }
  }

  // Bare short token like "cars" → ask intent first
  if (query.split(/\s+/).length <= 2 && !QUESTION_RE.test(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([
        'Что значит',
        'Как сказать',
        'Какая форма правильная',
        'Пример в предложении',
      ]),
    }
  }

  return { kind: 'A', query }
}
