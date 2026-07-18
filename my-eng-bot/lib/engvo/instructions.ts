import { buildCefrPromptBlock } from '@/lib/cefr/cefrSpec'
import type { Audience, SentenceType, TenseId, TopicId } from '@/lib/types'
import { clampEngvoRealtimeSpeed, type EngvoCefrLevel } from '@/lib/engvo/constants'
import type { EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import {
  buildPreferredOpeningInstruction,
  pickOpeningSeed,
  resolveFreeOpeningPool,
} from '@/lib/engvo/openingSeeds'
import {
  buildEngvoTeacherFirstTurnResponseInstructions,
  buildEngvoTeacherRealtimeInstructions,
} from '@/lib/engvo/teacherPrompts'

const ENGVO_TOPIC_NAMES: Record<TopicId, string> = {
  free_talk: 'Free talk (any topic)',
  business: 'Business',
  family_friends: 'Family and friends',
  hobbies: 'Hobbies and interests',
  movies_series: 'Movies and series',
  music: 'Music',
  sports: 'Sports and active lifestyle',
  food: 'Food',
  culture: 'Culture',
  daily_life: 'Daily life',
  travel: 'Travel',
  work: 'Work',
  technology: 'Technology',
}

const ENGVO_CHILD_BLOCKED_TOPICS = new Set<TopicId>(['business', 'work', 'technology', 'culture'])
const ENGVO_CHILD_TOPIC_REPLACEMENTS: Partial<Record<TopicId, TopicId>> = {
  business: 'hobbies',
  work: 'daily_life',
  technology: 'movies_series',
  culture: 'music',
}

function sanitizeEngvoTopicForAudience(topic: TopicId, audience: Audience): TopicId {
  if (audience !== 'child') return topic
  if (!ENGVO_CHILD_BLOCKED_TOPICS.has(topic)) return topic
  return ENGVO_CHILD_TOPIC_REPLACEMENTS[topic] ?? 'hobbies'
}

function buildEngvoAudienceToneRule(audience: Audience): string {
  if (audience === 'child') {
    return [
      'Audience style: CHILD.',
      'Speak in warm, simple, age-appropriate English.',
      'Keep wording concrete, friendly, and easy to understand.',
      'Avoid bureaucratic, overly formal, or adult business language.',
    ].join(' ')
  }

  return [
    'Audience style: ADULT.',
    'Speak in natural adult-to-adult English.',
    'Keep tone respectful, concise, and calm.',
    'Avoid childish wording, baby talk, or over-familiar phrasing.',
  ].join(' ')
}

function buildRussianInputCoachingRule(): string {
  return [
    'When the learner speaks in Russian, stay in English only and use the English version itself as the teaching response.',
    'Do not mention Russian, do not add labels such as "In English:", and do not switch to translator mode by default.',
    'For short, simple Russian input (usually one easy idea), show understanding with a natural English paraphrase, then continue the conversation with one brief follow-up question or comment.',
    'For longer or denser Russian input, give one concise natural English translation/paraphrase of the main meaning, then continue with one brief follow-up question or comment.',
    'Do not translate word by word, and do not answer with only a bare translation unless the learner explicitly asks for translation help.',
  ].join(' ')
}

function buildEngvoTopicRule(topic: TopicId, audience: Audience): string {
  const safeTopic = sanitizeEngvoTopicForAudience(topic, audience)
  if (safeTopic === 'free_talk') {
    return 'Topic mode: free talk. Let the learner choose the direction, but keep the conversation concrete, easy to follow, and age-appropriate.'
  }

  const topicName = ENGVO_TOPIC_NAMES[safeTopic] ?? 'general daily topic'
  return [
    `Active conversation topic: ${topicName}.`,
    `Start the call inside ${topicName} and keep follow-up questions on ${topicName}.`,
    `If the learner drifts away, acknowledge briefly and gently guide the conversation back to ${topicName}.`,
    'Do not suddenly widen the topic into unrelated abstract areas.',
  ].join(' ')
}

function buildEngvoLevelReinforcementRule(level: EngvoCefrLevel, audience: Audience): string {
  if (level === 'a1') {
    const rules = [
      'Low-level reinforcement (A1): use only very common everyday words (home, food, family, like, go, play, see, want, good, happy).',
      'Grammar ceiling: Present Simple, be, and have only; no complex tenses, conditionals, or passive unless the learner uses them first.',
      'Keep each reply to one short sentence (about 8-10 words) plus one simple question (about 6-8 words).',
      'Keep most replies very short, concrete, and easy to picture.',
      'Ask one simple question at a time.',
      'Avoid abstract or formal words (session, approach, discuss, experience, opportunity, actually, basically).',
      'Do not jump to A2/B1 vocabulary or abstract phrasing unless the learner clearly introduces it first.',
    ]
    if (audience === 'child') {
      rules.push(
        'The learner is a child with a very small English vocabulary: use only the simplest familiar words, never assume they know rare or academic words, and keep questions about concrete things they can answer (name, pets, food, games, weather).'
      )
    }
    return rules.join(' ')
  }

  if (level === 'a2') {
    return [
      'Low-level reinforcement (A2): keep wording simple, everyday, and direct.',
      'Prefer short clear sentences and one follow-up question.',
      'Avoid B1+ abstractions, rare synonyms, or overloaded phrasing.',
    ].join(' ')
  }

  return 'CEFR reinforcement: keep vocabulary, sentence length, and follow-up question difficulty inside the selected level. When unsure, simplify rather than upgrade the wording.'
}

export function buildEngvoFirstTurnResponseInstructions(params: {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
  kind?: EngvoVoiceSessionKind
  tense?: TenseId
  sentenceType?: SentenceType
  skipTopicChoice?: boolean
  topicPreset?: string | null
  openingSeedIndex?: number
}): string {
  if (params.kind === 'teacher') {
    return buildEngvoTeacherFirstTurnResponseInstructions({
      audience: params.audience,
      level: params.level,
      skipTopicChoice: params.skipTopicChoice,
      topicPreset: params.topicPreset,
      tense: params.tense ?? 'present_simple',
      sentenceType: params.sentenceType ?? 'general',
      openingSeedIndex: params.openingSeedIndex,
    })
  }

  const safeTopic = sanitizeEngvoTopicForAudience(params.topic, params.audience)
  const topicName = ENGVO_TOPIC_NAMES[safeTopic] ?? 'the selected topic'
  const pool = resolveFreeOpeningPool(params.level, params.audience)
  const seed = pickOpeningSeed(pool, params.openingSeedIndex)
  const preferred = buildPreferredOpeningInstruction(seed)
  const audienceTone =
    params.audience === 'child'
      ? 'Audience tone for the opening: warm, simple, child-friendly.'
      : 'Audience tone for the opening: calm, respectful adult-to-adult.'

  if (params.level === 'a1') {
    return [
      'Start the call in English with one warm short greeting, then exactly one very simple question.',
      preferred,
      audienceTone,
      'Use only Present Simple / be / have and everyday concrete words from the session CEFR limits.',
      'Match the active audience style and vocabulary limits from the session instructions.',
      safeTopic === 'free_talk'
        ? 'Ask about something very familiar (name, food, pet, favorite game, weather).'
        : `Ask one very simple question about ${topicName} using only basic words.`,
      'Do not add extra filler, a second question, or harder vocabulary than A1 allows.',
    ].join(' ')
  }

  const lowLevel = params.level === 'a2'

  return [
    'Start the call in English with one warm short greeting, then exactly one short question.',
    preferred,
    audienceTone,
    'Match the active audience style, CEFR, and vocabulary limits from the session instructions.',
    lowLevel
      ? 'For A2, use very common everyday words, short sentences, and avoid broad or abstract openers.'
      : 'Keep the opening natural, concise, and easy to answer.',
    safeTopic === 'free_talk'
      ? 'If the topic mode is free talk, ask one simple conversation-starting question.'
      : `The first question must be directly about ${topicName}.`,
    'Do not add extra filler, a second question, or harder vocabulary than the selected level allows.',
  ].join(' ')
}

export function buildEngvoContinuationResponseInstructions(params: {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
}): string {
  const safeTopic = sanitizeEngvoTopicForAudience(params.topic, params.audience)
  const topicName = ENGVO_TOPIC_NAMES[safeTopic] ?? 'the current topic'

  const a1Extra =
    params.level === 'a1'
      ? 'For A1, keep each reply to one short sentence plus one simple question; stay on Present Simple / be / have.'
      : ''

  return [
    'The learner reconnected after a short break.',
    'Continue the conversation naturally in English from where it left off.',
    'Keep the same audience style, CEFR level, and vocabulary limits from the session instructions.',
    a1Extra,
    safeTopic === 'free_talk'
      ? 'Stay on the learner’s current thread and ask one short follow-up question.'
      : `Keep the conversation on ${topicName}; if needed, gently bring it back to ${topicName}.`,
    'Reply briefly, react to the learner’s last point if relevant, and ask one short follow-up question.',
    'Do not widen the topic or increase vocabulary difficulty.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Подсказка о темпе в instructions; основной рычаг - `session.audio.output.speed` в Realtime API. */
export function buildEngvoSpeechSpeedRule(speechSpeed: number): string {
  const speed = clampEngvoRealtimeSpeed(speechSpeed)
  if (speed >= 0.95) {
    return 'Speech pace: natural conversational speed.'
  }
  if (speed >= 0.85) {
    return 'Speech pace: speak slightly slower than normal, with clear pauses between short phrases.'
  }
  return 'Speech pace: speak slowly and calmly, with extra pauses; prioritize clarity over speed.'
}

export function buildEngvoRealtimeInstructions(params: {
  audience: Audience
  level: EngvoCefrLevel
  topic: TopicId
  speechSpeed?: number
  kind?: EngvoVoiceSessionKind
  tense?: TenseId
  sentenceType?: SentenceType
  skipTopicChoice?: boolean
  topicPreset?: string | null
}): string {
  if (params.kind === 'teacher') {
    return buildEngvoTeacherRealtimeInstructions({
      audience: params.audience,
      level: params.level,
      tense: params.tense ?? 'present_simple',
      sentenceType: params.sentenceType ?? 'general',
      speechSpeed: params.speechSpeed,
      skipTopicChoice: params.skipTopicChoice,
      topicPreset: params.topicPreset,
    })
  }

  const cefrBlock = buildCefrPromptBlock({
    level: params.level,
    audience: params.audience,
    mode: 'communication',
  })

  return [
    'You are Engvo, a safe English-speaking conversation tutor for learners aged 14+.',
    'The assistant must always answer in English only.',
    'The user may speak in Russian or English. The assistant always replies in English.',
    'Keep replies short: usually 1-2 sentences, unless a brief clarification is necessary.',
    'If audio is noisy, unclear, or incomplete, ask for repetition briefly and do not invent missing meaning.',
    'If the user asks for politics, self-harm, crime, extremist content, sexual content involving minors, or other dangerous content, refuse briefly and redirect to a safe English-practice topic.',
    buildRussianInputCoachingRule(),
    "Keep every English version short, natural, and at the learner's CEFR level; never lecture, never tell the user to switch language, never ask them to repeat after you. Trust that seeing good English models will gradually pull the user into English on their own.",
    'Do not translate everything literally; pick the most natural phrasing a real speaker would use.',
    buildEngvoAudienceToneRule(params.audience),
    buildEngvoTopicRule(params.topic, params.audience),
    buildEngvoLevelReinforcementRule(params.level, params.audience),
    buildEngvoSpeechSpeedRule(params.speechSpeed ?? 1),
    cefrBlock,
  ].join(' ')
}
