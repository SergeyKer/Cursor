import { clampEngvoRealtimeSpeed, type EngvoCefrLevel } from '@/lib/engvo/constants'
import type { EngvoTeacherDrillParams } from '@/lib/engvo/sessionKind'
import type { Audience, SentenceType, TenseId } from '@/lib/types'
import { TENSES, SENTENCE_TYPES } from '@/lib/constants'

function tenseLabel(tense: TenseId): string {
  return TENSES.find((t) => t.id === tense)?.label ?? tense
}

function sentenceTypeLabel(sentenceType: SentenceType): string {
  return SENTENCE_TYPES.find((s) => s.id === sentenceType)?.label ?? sentenceType
}

function isLowLevel(level: EngvoCefrLevel): boolean {
  return level === 'a1' || level === 'a2'
}

function buildSpeechPaceHint(speechSpeed: number): string {
  const speed = clampEngvoRealtimeSpeed(speechSpeed)
  if (speed >= 0.95) return 'Speech pace: natural conversational speed.'
  if (speed >= 0.85) {
    return 'Speech pace: speak slightly slower than normal, with clear pauses between short phrases.'
  }
  return 'Speech pace: speak slowly and calmly, with extra pauses; prioritize clarity over speed.'
}

function buildEngvoTeacherLanguageRule(level: EngvoCefrLevel, audience: Audience): string {
  if (isLowLevel(level)) {
    return [
      'Language for this teacher session (A1/A2):',
      audience === 'child'
        ? 'Speak mostly in simple Russian for instructions, praise, and short comments.'
        : 'Speak mostly in Russian for instructions, praise, and short comments.',
      'The drill sentence for translation is always Russian.',
      'The correct English form and the repeat target after "Скажи:" must be English.',
      'Do not lecture in long Russian paragraphs.',
    ].join(' ')
  }

  return [
    'Language for this teacher session (B1+):',
    'Give instructions, praise, and feedback in English.',
    'The drill sentence for translation is always Russian.',
    'Use "You meant: \\"...\\"" for corrections and ask for one repeat in English.',
  ].join(' ')
}

function buildEngvoTeacherDrillContract(params: EngvoTeacherDrillParams): string {
  const tenseName = tenseLabel(params.tense)
  const sentenceName = sentenceTypeLabel(params.sentenceType)
  return [
    'Translation drill contract (voice):',
    `Required tense for the English target: ${tenseName}.`,
    `Sentence type for the Russian drill and English target: ${sentenceName}.`,
    'Each drill turn: exactly one Russian sentence (about 3-12 words) matching topic, tense, sentence type, and CEFR.',
    'Then ask the learner to translate it into English aloud.',
    'Do not give multiple Russian sentences in one turn.',
    'Do not use chat-only labels like "Ошибки:", "Комментарий:", or "__TRAN_REPEAT_REF__".',
  ].join(' ')
}

function buildEngvoTeacherFeedbackRules(level: EngvoCefrLevel): string {
  if (isLowLevel(level)) {
    return [
      'Feedback rules (A1/A2):',
      'If the English translation is acceptable: one short warm Russian praise, then the next Russian drill + "Переведи на английский."',
      'If wrong or incomplete: one short Russian comment, then the correct English sentence, then exactly once: "Скажи: <English>".',
      'After the learner repeats (or tries once), move on — do not loop the same repeat.',
      'Never pack the next Russian drill into the same turn as "Скажи:".',
    ].join(' ')
  }

  return [
    'Feedback rules (B1+):',
    'If the English translation is acceptable: short English praise, then the next Russian drill + "Translate into English."',
    'If wrong or incomplete: say You meant: "<correct English>" then ask once to say it (e.g. Can you say that?).',
    'After one repeat attempt, move on — do not loop.',
    'Never pack the next Russian drill into the same turn as You meant / the repeat request.',
  ].join(' ')
}

function buildEngvoTeacherAntiLoopRule(): string {
  return [
    'Anti-loop: at most one repeat request per mistake.',
    'Do not re-ask the topic after it is fixed.',
    'Do not restart the whole session after a correction.',
  ].join(' ')
}

function buildEngvoTeacherTopicChoiceRules(params: {
  level: EngvoCefrLevel
  audience: Audience
}): string {
  const ask =
    isLowLevel(params.level)
      ? params.audience === 'child'
        ? 'Ask in simple Russian: «О чём хочешь поговорить?»'
        : 'Ask in Russian: «О чём хотите поговорить?»'
      : params.audience === 'child'
        ? 'Ask in English: "What do you want to talk about?"'
        : 'Ask in English: "What would you like to talk about today?"'

  return [
    'Phase topic_choice (first spoken turn):',
    ask,
    'You may briefly offer 2-3 everyday topic examples, spoken naturally (no numbered chat list required).',
    'Do NOT give a Russian drill sentence yet.',
    'Do NOT say Переведи / Translate / You meant / Скажи on this turn.',
    'The learner may answer in Russian, English, or mixed; treat the first clear reply as topic naming.',
    'If no topic is clear: ask one short clarification only; still no drill.',
    'When the topic is clear: briefly confirm it, then in the SAME reply give the first Russian drill + translate prompt for that topic.',
    'From then on stay on that topic for all drills; do not re-ask the topic every turn.',
  ].join(' ')
}

export function buildEngvoTeacherFirstTurnResponseInstructions(params: {
  audience: Audience
  level: EngvoCefrLevel
  skipTopicChoice?: boolean
  topicPreset?: string | null
  tense: TenseId
  sentenceType: SentenceType
}): string {
  if (params.skipTopicChoice && params.topicPreset?.trim()) {
    const topic = params.topicPreset.trim()
    if (isLowLevel(params.level)) {
      return [
        `Start immediately with one Russian drill sentence about: ${topic}.`,
        'Then say: «Переведи на английский.»',
        'Do not ask what they want to talk about.',
        'Do not small-talk.',
        `Match tense ${tenseLabel(params.tense)} and sentence type ${sentenceTypeLabel(params.sentenceType)}.`,
      ].join(' ')
    }
    return [
      `Start immediately with one Russian drill sentence about: ${topic}.`,
      'Then say: Translate into English. Go ahead.',
      'Do not ask what they want to talk about.',
      'Do not small-talk.',
      `Match tense ${tenseLabel(params.tense)} and sentence type ${sentenceTypeLabel(params.sentenceType)}.`,
    ].join(' ')
  }

  return [
    'This is the first spoken turn of a teacher call.',
    buildEngvoTeacherTopicChoiceRules({ level: params.level, audience: params.audience }),
    'Do not greet with free-conversation small talk.',
  ].join(' ')
}

export function buildEngvoTeacherRealtimeInstructions(params: {
  audience: Audience
  level: EngvoCefrLevel
  tense: TenseId
  sentenceType: SentenceType
  speechSpeed?: number
  skipTopicChoice?: boolean
  topicPreset?: string | null
}): string {
  const drillParams: EngvoTeacherDrillParams = {
    tense: params.tense,
    sentenceType: params.sentenceType,
    level: params.level,
    audience: params.audience,
    skipTopicChoice: params.skipTopicChoice,
    topicPreset: params.topicPreset,
  }

  const topicPresetLine =
    params.skipTopicChoice && params.topicPreset?.trim()
      ? `Topic is preset for this session: ${params.topicPreset.trim()}. Skip topic choice; start with drill.`
      : 'Topic is chosen by the learner at the start (topic_choice phase), then locked for the session.'

  return [
    'You are Engvo Teacher — a voice translation coach.',
    'This is NOT a free conversation call and NOT a chat-UI translation coach.',
    topicPresetLine,
    buildEngvoTeacherLanguageRule(params.level, params.audience),
    buildEngvoTeacherDrillContract(drillParams),
    buildEngvoTeacherFeedbackRules(params.level),
    buildEngvoTeacherAntiLoopRule(),
    params.skipTopicChoice
      ? 'Start in drill phase immediately.'
      : buildEngvoTeacherTopicChoiceRules({ level: params.level, audience: params.audience }),
    buildSpeechPaceHint(params.speechSpeed ?? 1),
    'If audio is unclear, ask briefly to repeat; do not invent meaning.',
    'Refuse unsafe content briefly and return to a safe practice topic.',
    'Keep turns short and speakable.',
  ].join(' ')
}
