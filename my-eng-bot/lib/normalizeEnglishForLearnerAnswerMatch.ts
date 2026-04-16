import { ENGLISH_ANSWER_EQUIVALENCE_GROUPS, type EquivalenceGroup, type EquivalenceScope } from '@/lib/data/englishAnswerEquivalenceGroups'
import { normalizeAttitudeVerbGerundOrInfinitive } from '@/lib/englishAttitudeGerundInfinitive'
import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'

export type LearnerAnswerMatchScope = EquivalenceScope

const EQ_MARKER_PREFIX = '\uE000'
const EQ_MARKER_SUFFIX = '\uE001'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function groupAppliesToScope(group: EquivalenceGroup, scope: LearnerAnswerMatchScope): boolean {
  const scopes = group.scopes
  if (!scopes || scopes.length === 0) return true
  return scopes.includes(scope)
}

/** Регекс для фразы после `normalizeEnglishForRepeatMatch` (одиночные пробелы, lower case). */
function variantPattern(variant: string): RegExp {
  const compact = variant.trim().toLowerCase().replace(/\s+/g, ' ')
  const parts = compact.split(/\s+/).filter(Boolean)
  const inner = parts.map(escapeRegExp).join(String.raw`\s+`)
  return new RegExp(String.raw`\b(?:${inner})\b`, 'gi')
}

export function applyEnglishEquivalenceGroups(normalized: string, scope: LearnerAnswerMatchScope): string {
  let s = normalized
  for (const group of ENGLISH_ANSWER_EQUIVALENCE_GROUPS) {
    if (!groupAppliesToScope(group, scope)) continue
    const marker = `${EQ_MARKER_PREFIX}eq:${group.id}${EQ_MARKER_SUFFIX}`
    const ordered = [...group.variants].sort((a, b) => b.trim().length - a.trim().length)
    for (const v of ordered) {
      if (!v.trim()) continue
      s = s.replace(variantPattern(v), marker)
    }
  }
  return s
}

/**
 * Единая нормализация для сравнения ответа ученика с эталоном (перевод и диалог).
 * Порядок: пробелы → контракции ученика → repeat-match → like/hate/don't like/don't mind + gerund|to+V → группы эквивалентности.
 */
export function normalizeEnglishForLearnerAnswerMatch(text: string, scope: LearnerAnswerMatchScope): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const afterContractions = normalizeEnglishLearnerContractions(compact)
  const afterRepeat = normalizeEnglishForRepeatMatch(afterContractions)
  const afterAttitude = normalizeAttitudeVerbGerundOrInfinitive(afterRepeat)
  return applyEnglishEquivalenceGroups(afterAttitude, scope)
}
