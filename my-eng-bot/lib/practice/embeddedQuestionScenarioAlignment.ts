import type { PracticeExerciseType } from '@/types/practice'

const LIKES_RU = /нрав|вкус/i
const LIKES_EN = /\blikes?\b/i
const LIVES_RU = /жив|адрес/i
const LIVES_EN = /\blives?\b/i
const WORKS_RU = /работ/i
const WORKS_EN = /\bworks?\b/i
const WHO_RU = /\bкто\b|незнаком|человеке/i
const WHO_EN = /\bwho\b/i
const WHEN_RU = /когда|начин|урок|расписан/i
const WHEN_EN = /\bwhen\b|\bstarts?\b/i
const STATION_RU = /станц/i
const STATION_EN = /\bstation\b/i
const WANTS_RU = /хочет|нужн|нужд/i
const WANTS_EN = /\bwants?\b/i
const TEA_RU = /напитк|чай/i
const TEA_EN = /\btea\b|\bthat\b/i
const BUT_RU = /but|две мысли|свяжите/i
const BUT_EN = /\bbut\b/i

export function embeddedTargetHasBadInversion(targetAnswer: string): boolean {
  const normalized = targetAnswer.trim().toLowerCase()
  return (
    /\b(what|where|who|when)\s+does\b/.test(normalized) ||
    /\b(what|where|who|when)\s+do\b/.test(normalized)
  )
}

export function embeddedRoleplayInterlocutorOk(interlocutorEn: string): boolean {
  const trimmed = interlocutorEn.trim()
  if (!trimmed.endsWith('?')) return false
  if (/\b(where|what|who|when)\s+does\b/i.test(trimmed)) return false
  return /\b(do you know|can you tell me|tell me)\b/i.test(trimmed)
}

/** Smoke check: RU situation and EN target share at least one semantic axis. */
export function embeddedScenarioRuEnAligned(situationRu: string, targetAnswer: string): boolean {
  const ru = situationRu.toLowerCase()
  const en = targetAnswer.toLowerCase()

  const pairs: Array<[RegExp, RegExp]> = [
    [LIKES_RU, LIKES_EN],
    [LIVES_RU, LIVES_EN],
    [WORKS_RU, WORKS_EN],
    [WHO_RU, WHO_EN],
    [WHEN_RU, WHEN_EN],
    [STATION_RU, STATION_EN],
    [WANTS_RU, WANTS_EN],
    [TEA_RU, TEA_EN],
    [BUT_RU, BUT_EN],
  ]

  for (const [ruPattern, enPattern] of pairs) {
    if (ruPattern.test(ru) && enPattern.test(en)) return true
  }

  if (/\bwhere\b/.test(en) && /где/.test(ru)) return true
  if (/\bwhat\b/.test(en) && /что/.test(ru)) return true
  if (/\bbut\b/.test(en) && /, но /.test(ru)) return true

  return false
}

export function embeddedErrorFixPairIsAligned(situationRu: string, targetAnswer: string): boolean {
  return embeddedScenarioRuEnAligned(situationRu, targetAnswer) && !embeddedTargetHasBadInversion(targetAnswer)
}

/** Grammar recipe that reveals answer shape, e.g. "Tell me + what + she + likes." */
export function isRecipeAnswerHint(hint: string | null | undefined): boolean {
  if (!hint?.trim()) return false
  const text = hint.trim()
  if (/\w\s*\+\s*\w/.test(text)) return true
  if (/\b(what|where|who|when)\s*\+\s*/i.test(text)) return true
  if (/\+\s*(what|where|who|when)\b/i.test(text)) return true
  return false
}

/**
 * True when situationRu is a near-literal RU translation of the embedded target
 * (leaks the answer in the task bubble). Free-response may use translateRu separately.
 */
export function situationRuIsTranslateLeak(
  situationRu: string,
  _targetAnswer: string,
  type?: PracticeExerciseType | string
): boolean {
  if (type === 'free-response') return false
  const ru = situationRu.trim()
  if (!ru) return false
  // Avoid \\b: JS word boundaries do not treat Cyrillic as word chars.
  return /^(Я знаю|Я не знаю|Скажи(те)?( мне)?|Ты знаешь|Вы знаете),?\s+(что|где|кто|когда)(?:\s|$|[,.!?])/iu.test(
    ru
  )
}
