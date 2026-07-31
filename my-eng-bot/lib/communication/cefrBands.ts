import type { Audience, LevelId } from '@/lib/types'

export type CommunicationCefrBand = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'adaptive'

/** Fixed A-band levels that get RU meta on the first assistant bubble. */
export function isCommunicationALevelForRuWarn(level: LevelId): boolean {
  return level === 'starter' || level === 'a1' || level === 'a2'
}

export function resolveCommunicationCefrBand(level: LevelId): CommunicationCefrBand {
  if (level === 'all') return 'adaptive'
  if (level === 'starter' || level === 'a1') return 'a1'
  if (level === 'a2') return 'a2'
  if (level === 'b1') return 'b1'
  if (level === 'b2') return 'b2'
  if (level === 'c1') return 'c1'
  if (level === 'c2') return 'c2'
  return 'a1'
}

export function buildCommunicationNegativeConstraints(level: LevelId): string {
  const band = resolveCommunicationCefrBand(level)
  if (band === 'adaptive') {
    return 'Negative constraints (adaptive): do not jump above the complexity the learner shows in this thread; avoid sudden academic or rare vocabulary.'
  }
  if (band === 'a1') {
    return [
      'Negative constraints (A1 / CEFR): do not use idioms, phrasal-heavy slang, abstract debate language, or rare synonyms.',
      'Do not use C1/C2 vocabulary, long academic words, or multi-clause explanations.',
      'Prefer Present/Past/Future Simple (acquaintance level) over Perfect, Continuous stacks, passive, or conditionals.',
    ].join(' ')
  }
  if (band === 'a2') {
    return [
      'Negative constraints (A2 / CEFR): do not use rare idioms, heavy abstraction, or specialized jargon.',
      'Keep connectors simple (and/but/because); avoid dense academic register.',
    ].join(' ')
  }
  if (band === 'b1') {
    return [
      'Negative constraints (B1 / CEFR): do not use rare C2 idioms or overly formal academic style.',
      'Do not baby-talk; stay natural everyday English.',
    ].join(' ')
  }
  if (band === 'b2') {
    return [
      'Negative constraints (B2 / CEFR): avoid robotic template phrasing and archaic C2 wording outside need.',
      'Do not write like a research paper; stay conversational.',
    ].join(' ')
  }
  if (band === 'c1') {
    return [
      'Negative constraints (C1 / CEFR): do not oversimplify into B2 baby-talk when the task does not require it.',
      'Do not add complexity only for show; avoid essay/lecture dumps unless the learner asks for depth.',
    ].join(' ')
  }
  return [
    'Negative constraints (C2 / CEFR): avoid heavy verbosity without value.',
    'Do not teach-down to B2; do not write an academic monograph unless asked.',
  ].join(' ')
}

export function buildCommunicationFewShotBlock(level: LevelId, audience: Audience): string {
  const band = resolveCommunicationCefrBand(level)
  const child = audience === 'child'
  if (band === 'adaptive') {
    return 'Few-shot (adaptive): match the learner’s last English complexity; when unsure, stay slightly simpler.'
  }
  if (band === 'a1') {
    const sample = child
      ? 'Example reply at this level: "Hi! I like football. Do you like football?"'
      : 'Example reply at this level: "Hello! I like coffee. What do you like?"'
    return `Few-shot (A1): ${sample} Keep replies this short and concrete.`
  }
  if (band === 'a2') {
    const sample = child
      ? 'Example reply at this level: "Nice! I played football yesterday. What did you do?"'
      : 'Example reply at this level: "That sounds good. I usually cook on Sundays. What about you?"'
    return `Few-shot (A2): ${sample}`
  }
  if (band === 'b1') {
    return (
      'Few-shot (B1): "That makes sense — when I travel I ask locals for tips. What do you usually do first in a new city?"'
    )
  }
  if (band === 'b2') {
    return (
      'Few-shot (B2): "I see both sides — remote work helps focus, but offices keep teams closer. Which trade-off matters more to you?"'
    )
  }
  if (band === 'c1') {
    return (
      'Few-shot (C1): "Fair point — the real constraint is usually coordination, not effort itself. How do you usually negotiate that at work?"'
    )
  }
  return (
    'Few-shot (C2): "Exactly — once you name the trade-off, the choice gets sharper. What’s the one nuance you refuse to sand away?"'
  )
}

/** Peer practice for C1/C2 chat communication (no lessons → practice AT level). */
export function buildCommunicationCPeerRule(level: LevelId): string {
  const band = resolveCommunicationCefrBand(level)
  if (band !== 'c1' && band !== 'c2') return ''
  if (band === 'c1') {
    return [
      'C1 peer practice (chat communication): the learner already operates near this level; there is no lesson drill here.',
      'Speak as a capable peer: precise wording, natural discourse markers, flexible register for everyday and professional topics.',
      'Do not teach-down to B2 baby-talk; do not write academic essays or dumps unless asked for more depth.',
      'Keep replies conversational (still concise), with denser phrasing when detail keywords ask for more volume.',
    ].join(' ')
  }
  return [
    'C2 peer practice (chat communication): the learner practices language they already know at proficiency level; no lesson tutor mode.',
    'Speak as a near-native peer: idioms and fine shades of meaning when natural; clear logic; pragmatic naturalness.',
    'Do not oversimplify toward B2; do not pad with heavy verbosity or academic monograph style unless asked.',
  ].join(' ')
}

export function buildCommunicationBandReinforcement(level: LevelId, audience: Audience): string {
  const band = resolveCommunicationCefrBand(level)
  const child = audience === 'child'
  const negatives = buildCommunicationNegativeConstraints(level)
  const fewShot = buildCommunicationFewShotBlock(level, audience)

  if (band === 'adaptive') {
    return [
      'Band reinforcement (adaptive): mirror the learner’s apparent English complexity in this thread.',
      negatives,
      fewShot,
    ].join(' ')
  }

  if (band === 'a1') {
    const childHint = child
      ? 'Child A1: warm, concrete words (home, school, friends, games, food); one short idea + one simple question.'
      : 'Adult A1: warm, concrete everyday words; one short idea + one simple question.'
    return [
      'Band reinforcement (A1 / CEFR): helpful partner scaffolding — keep a very simple conversation with support.',
      'Use common everyday vocabulary; short sentences; Present/Past/Future Simple at acquaintance level.',
      childHint,
      negatives,
      fewShot,
    ].join(' ')
  }

  if (band === 'a2') {
    return [
      'Band reinforcement (A2 / CEFR): short situational dialogues about daily life; simple connectors.',
      child
        ? 'Child A2: keep topics concrete (school, hobbies, family); still easy wording.'
        : 'Adult A2: everyday situations; clear short-to-medium sentences.',
      negatives,
      fewShot,
    ].join(' ')
  }

  if (band === 'b1') {
    return [
      'Band reinforcement (B1 / CEFR): unprepared everyday interaction (e.g. travel-like situations); reasons and opinions.',
      'Stay clear and natural; do not baby-talk and do not go academic.',
      negatives,
      fewShot,
    ].join(' ')
  }

  if (band === 'b2') {
    return [
      'Band reinforcement (B2 / CEFR): confident discussion partner; precise topic words and natural collocations.',
      'Nuanced open questions; conversational, not a research paper.',
      negatives,
      fewShot,
    ].join(' ')
  }

  const peer = buildCommunicationCPeerRule(level)
  return [peer, negatives, fewShot].filter(Boolean).join(' ')
}

/** RU meta line for A-level first assistant bubble only. */
export const COMMUNICATION_A_RU_WARN_CHILD =
  'Мы общаемся только по-английски. Пиши по-русски или как удобно — я отвечу простыми английскими словами. Кнопка «Перевод» всегда рядом.'

export const COMMUNICATION_A_RU_WARN_ADULT =
  'Мы общаемся только по-английски. Пишите как удобно — я отвечу по-английски в пределах вашего уровня. Кнопка «Перевод» всегда рядом.'

export function buildCommunicationARuWarn(audience: Audience): string {
  return audience === 'child' ? COMMUNICATION_A_RU_WARN_CHILD : COMMUNICATION_A_RU_WARN_ADULT
}
