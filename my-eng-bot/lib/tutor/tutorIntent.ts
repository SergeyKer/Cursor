/**
 * Pure shared intent/topic helpers for tutor first-hop + hop2 router.
 * No imports from gate/triage/router/UI — avoids cycles and regex drift.
 */

import { compactText } from '@/lib/tutor/text'

// No trailing \b after Cyrillic: JS \b is ASCII-only and breaks почему/зачем/….
export const TUTOR_QUESTION_RE =
  /[?？]|^(почему|зачем|как|что|когда|где|чем|в\s+ч[её]м|можно\s+ли|а\s+можно|is|are|does|do|what|why|how|when|where)(?=\s|$|[?？,.!…])/i

export const TUTOR_NARROW_TOPIC_RE =
  /\b(present\s+perfect|past\s+simple|present\s+simple|past\s+perfect|future\s+simple|present\s+continuous|past\s+continuous|articles?|артикл|to\s+be|have\s+got|there\s+is|there\s+are|passive|услови|conditional|gerund|infinitive|модальные|modal)\b/i

export const TUTOR_BROAD_TERM_RE =
  /^(существительн\w*|глагол\w*|прилагательн\w*|времен\w*|tense|noun|verb|adjective|grammar|грамматик\w*|слово|words?)$/i

// No leading \b: JS \b is ASCII-only and breaks Cyrillic starts.
export const TUTOR_EXPLICIT_INTENT_RE =
  /(как\s+сказать|перевед\w*|как\s+будет|как\s+пишется|how\s+to\s+say|translate|произнес\w*|pronounce|правильно\s+ли|is\s+this\s+correct|составь\s+предложен|почему\s+неправильн|почему\s+пиш)/i

export const TUTOR_META_TEACH_RE = /научи\s+англ/i

export const TUTOR_QUIZ_HINT_RE = /(квиз|закреп\w*|проверк\w*\s*2\s*мин)/i

/** Garbage / empty-ish — not short English tokens like do/go/a. Avoid bare \W (ASCII-only). */
export const TUTOR_NOISE_RE = /^(.)\1{3,}$|^[^a-zа-яё0-9]+$|^[а-яё]{1,2}$/i

export function normalizeTutorQuery(raw: string, max = 400): string {
  return compactText(raw, max)
}

export function hasExplicitTutorIntent(query: string): boolean {
  const q = normalizeTutorQuery(query)
  if (!q) return false
  if (TUTOR_EXPLICIT_INTENT_RE.test(q)) return true
  // Quoted phrase often means how_to_say / translate target
  if (/[«"“].+[»"”]/.test(q) && q.split(/\s+/).length <= 12) return true
  return false
}

export function hasTutorTopicMarker(query: string): boolean {
  const q = normalizeTutorQuery(query)
  if (!q) return false
  return TUTOR_NARROW_TOPIC_RE.test(q) || TUTOR_BROAD_TERM_RE.test(q)
}

export function isTutorMetaTeach(query: string): boolean {
  return TUTOR_META_TEACH_RE.test(normalizeTutorQuery(query))
}

/**
 * New grammar/topic not present in current explain text → treat as topic switch.
 */
export function hasExplicitTopicSwitch(query: string, currentExplainText: string): boolean {
  const q = normalizeTutorQuery(query)
  if (!q) return false
  const hay = currentExplainText.toLowerCase()
  const markers: Array<{ re: RegExp; needle: string }> = [
    { re: /\bdo(es|ed)?\b/i, needle: 'do' },
    { re: /\bwill\b|\bwould\b/i, needle: 'will' },
    { re: /present\s+perfect/i, needle: 'present perfect' },
    { re: /past\s+simple/i, needle: 'past simple' },
    { re: /present\s+simple/i, needle: 'present simple' },
    { re: /present\s+continuous/i, needle: 'present continuous' },
    { re: /past\s+continuous/i, needle: 'past continuous' },
    { re: /past\s+perfect/i, needle: 'past perfect' },
    { re: /future\s+simple/i, needle: 'future simple' },
    { re: /\barticles?\b|\bартикл/i, needle: 'article' },
    { re: /\bthe\b|\ba\b|\ban\b/i, needle: 'the' },
    { re: /\bpassive\b/i, needle: 'passive' },
    { re: /\bconditional\b|\bуслови/i, needle: 'conditional' },
    { re: /\bgerund\b/i, needle: 'gerund' },
    { re: /\binfinitive\b/i, needle: 'infinitive' },
    { re: /\bmodal\b|\bмодальные/i, needle: 'modal' },
  ]
  for (const { re, needle } of markers) {
    if (!re.test(q)) continue
    if (!hay.includes(needle) && !re.test(hay)) return true
  }
  // Explicit switch phrasing
  if (/^(а\s+теперь|другая\s+тема|давай\s+про|сменим)\b/i.test(q)) return true
  return false
}

export function isShortAsciiToken(query: string): boolean {
  return /^[a-z]{1,2}$/i.test(normalizeTutorQuery(query))
}

export function isTutorNoise(query: string): boolean {
  const q = normalizeTutorQuery(query)
  if (!q) return true
  if (isShortAsciiToken(q)) return false
  return TUTOR_NOISE_RE.test(q)
}
