import { buildAiSafetyRulesBlock } from '@/lib/ai/safetyPolicy'
import { TUTOR_TRIAGE_MAX_CHIPS } from '@/lib/tutor/types'
import { asRecord, compactList, compactText } from '@/lib/tutor/text'
import type { Audience } from '@/lib/types'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorSchoolPhotoRejectReason = 'not_en' | 'blur' | 'other'

export type TutorSchoolPhotoResult =
  | {
      kind: 'rejected'
      reason: TutorSchoolPhotoRejectReason
      messageRu: string
    }
  | {
      kind: 'ok'
      topics: string[]
    }

export function normalizeTutorSchoolPhoto(input: unknown): TutorSchoolPhotoResult {
  const row = asRecord(input)
  if (!row) {
    return {
      kind: 'rejected',
      reason: 'other',
      messageRu: TUTOR_CHAT_COPY.photoReject,
    }
  }

  const status = compactText(row.status ?? row.kind, 32).toLowerCase()
  const reasonRaw = compactText(row.reason ?? row.rejectReason, 32).toLowerCase()
  const reason: TutorSchoolPhotoRejectReason =
    reasonRaw === 'blur' || reasonRaw === 'blurry'
      ? 'blur'
      : reasonRaw === 'not_en' || reasonRaw === 'not-en' || reasonRaw === 'irrelevant'
        ? 'not_en'
        : 'other'

  if (status === 'rejected' || status === 'reject' || row.relevant === false) {
    const messageRu =
      compactText(row.messageRu ?? row.rejectReasonRu, 240) ||
      (reason === 'blur' ? TUTOR_CHAT_COPY.photoBlur : TUTOR_CHAT_COPY.photoReject)
    return { kind: 'rejected', reason, messageRu }
  }

  const topics = compactList(row.topics ?? row.topicAnchors ?? row.focus, TUTOR_TRIAGE_MAX_CHIPS, 80)
  if (topics.length === 0) {
    return {
      kind: 'rejected',
      reason: 'other',
      messageRu: TUTOR_CHAT_COPY.photoReject,
    }
  }

  return { kind: 'ok', topics }
}

export function buildTutorSchoolPhotoPrompt(level: string, audience: string): string {
  const safetyAudience: Audience = audience === 'child' ? 'child' : 'adult'
  return [
    'Ты помощник репетитора английского. Разбери школьное фото (учебник, тетрадь, доска, упражнение).',
    `Уровень: ${level}. Аудитория: ${audience}.`,
    'Верни ТОЛЬКО JSON без markdown.',
    '{',
    '  "status": "ok" | "rejected",',
    '  "reason": "not_en" | "blur" | "other",',
    '  "messageRu": "если rejected — коротко по-русски",',
    '  "topics": ["English grammar topic 1", "topic 2"]',
    '}',
    'Правила:',
    '- ok: фото про английский / школьную тему EN; topics 1..4 коротких якоря тем.',
    '- rejected + blur: слишком размыто / нечитаемо (НЕ путать с not_en).',
    '- rejected + not_en: не про английский / не школьная тема.',
    '- Не выдумывай темы, если фото не подходит.',
    'AI safety status-bridge: NSFW/gore/explicit harm in frame → status rejected, reason other, short messageRu. English workbook/exercise (even with a hard word in the task) → ok + topics. Never answer outside the required JSON. Never speak AI_SAFETY marker tokens.',
    buildAiSafetyRulesBlock({ channel: 'tutor', audience: safetyAudience }),
  ].join('\n')
}
