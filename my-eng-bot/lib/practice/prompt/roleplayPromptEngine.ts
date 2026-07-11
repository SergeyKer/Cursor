import { inferScenarioCategory } from '@/lib/practice/buildPracticeDiversity'
import { mergePromptParts } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptAxis, PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import type { LessonData, LessonRepeatStepBlueprint } from '@/types/lesson'
import type { Audience } from '@/lib/types'
import type { PracticeMode } from '@/types/practice'

const CHALLENGE_ROLEPLAY_STEP_INDEX = 9

const LESSON_HINT_BY_AXIS: Record<string, Record<PracticePromptAxis, string>> = {
  '1': {
    state: 'It is + прилагательное',
    action: 'It is time to + глагол',
    creative: 'It is time to + новый глагол',
  },
  '2': {
    state: 'Who + глагол с -s',
    action: 'Subject + глагол с -s + объект',
    creative: 'Who + глагол с -s + новый объект',
  },
  '3': {
    state: 'Tell/Know + wh-слово + порядок слов',
    action: 'Вложенный вопрос без инверсии',
    creative: 'Новая лексика во вложенной части',
  },
  '4': {
    state: 'I am / I\'m + прилагательное',
    action: 'I am from + место',
    creative: 'I am a/an + роль',
  },
}

const LESSON_INTERLOCUTOR_EN: Record<string, Record<PracticePromptAxis, string>> = {
  '1': {
    state: "What's the weather like?",
    action: 'What should we do now?',
    creative: 'What is it time to do?',
  },
  '2': {
    state: 'Who likes music?',
    action: 'Who likes tea?',
    creative: 'Who likes pizza?',
  },
  '3': {
    state: 'Where does Anna work?',
    action: 'Where does Alex live?',
    creative: 'When does the bus arrive?',
  },
  '4': {
    state: 'How are you?',
    action: 'Where are you from?',
    creative: 'Who are you?',
  },
}

const SUBJECT_RU_BY_EN: Record<string, string> = {
  'my brother': 'Ваш брат',
  'my sister': 'Ваша сестра',
  'my friend': 'Ваш друг',
  'my cousin': 'Ваш кузен',
  'my dad': 'Ваш папа',
  'my grandma': 'Ваша бабушка',
  'my team': 'Ваша команда',
  'my cat': 'Ваш кот',
  anna: 'Анна',
  max: 'Макс',
  nina: 'Нина',
  alex: 'Алекс',
}

const LESSON2_CLASSMATE_INTRO_BY_SUBJECT: Record<string, string> = {
  anna: 'Вы рассказываете об однокласснице Анне.',
  nina: 'Вы рассказываете об однокласснице Нине.',
  max: 'Вы рассказываете об однокласнике Максе.',
  alex: 'Вы рассказываете об однокласнике Алексе.',
}

const COUNTRY_RU_BY_EN: Record<string, string> = {
  russia: 'России',
  spain: 'Испании',
  canada: 'Канады',
  italy: 'Италии',
  japan: 'Японии',
  brazil: 'Бразилии',
  france: 'Франции',
  germany: 'Германии',
}

const OBJECT_RU_BY_EN: Record<string, string> = {
  music: 'музыку',
  tea: 'чай',
  books: 'книги',
  football: 'футбол',
  juice: 'сок',
  coffee: 'кофе',
  comics: 'комиксы',
  pizza: 'пиццу',
  milk: 'молоко',
  poems: 'стихи',
  basketball: 'баскетбол',
  chess: 'шахматы',
  tennis: 'теннис',
  stories: 'истории',
}

const SCENE_SEMANTIC_LEXICON: ReadonlyArray<{ ru: string[]; en: string[] }> = [
  { ru: ['темно', 'темн'], en: ['dark'] },
  { ru: ['холодно', 'холод'], en: ['cold'] },
  { ru: ['жарко'], en: ['hot'] },
  { ru: ['дожд'], en: ['rain'] },
]

export type LessonRoleplayProfile = {
  lessonId: string
  stepBlueprint: LessonRepeatStepBlueprint | null
}

export type RoleplayScenario = {
  roleIntroRu: string
  interlocutorEn: string
  grammarAxis: PracticePromptAxis
}

export function resolveLessonRoleplayProfile(lesson: LessonData): LessonRoleplayProfile {
  const blueprint =
    lesson.repeatConfig?.stepBlueprints?.find((item) => item.stepNumber === 6) ?? null
  return { lessonId: lesson.id, stepBlueprint: blueprint }
}

export function resolveRoleplayTargetAnswer(step6Target: string, lessonId: string): string {
  const trimmed = step6Target.trim()
  if (lessonId !== '2') return trimmed

  const pairMatch = /^(Who\s[^?]+\?)\s+(.+)$/iu.exec(trimmed)
  if (pairMatch?.[2]?.trim()) return pairMatch[2].trim()
  return trimmed
}

export function inferRoleplayAxis(
  targetAnswer: string,
  lesson: LessonData,
  variantIndex?: number
): PracticePromptAxis {
  const normalized = resolveRoleplayTargetAnswer(targetAnswer, lesson.id).trim().toLowerCase()
  const lessonId = lesson.id

  if (lessonId === '1') {
    if (/\btime\s+to\b/.test(normalized)) return 'action'
    return variantIndex === 2 ? 'creative' : 'state'
  }
  if (lessonId === '2') {
    if (variantIndex === 2) return 'creative'
    if (variantIndex === 1) return 'action'
    return 'state'
  }
  if (lessonId === '3') {
    const lower = normalized
    if (/\bwho\b/.test(lower)) return 'creative'
    if (/\bwhere\b/.test(lower)) return 'action'
    if (/\bwhen\b/.test(lower)) return 'creative'
    if (/\bbut\b/.test(lower)) return 'creative'
    return 'state'
  }
  if (lessonId === '4') {
    if (/\bfrom\b/.test(normalized)) return 'action'
    if (/\b(a|an)\s+\w/.test(normalized)) return 'creative'
    return 'state'
  }

  if (/\btime\s+to\b/.test(normalized)) return 'action'
  if (variantIndex === 2) return 'creative'
  return 'state'
}

export function buildRoleplayHint(axis: PracticePromptAxis, lessonId: string): string {
  const hints = LESSON_HINT_BY_AXIS[lessonId] ?? LESSON_HINT_BY_AXIS['1']!
  return hints[axis]
}

export function buildRoleplayExpectedAnswerCue(
  mode: PracticeMode,
  stepIndex: number,
  audience: Audience
): string {
  const isChallengeAnchor =
    mode === 'challenge' && stepIndex === CHALLENGE_ROLEPLAY_STEP_INDEX
  if (isChallengeAnchor) {
    return audience === 'child'
      ? 'Сейчас дословно: нужна та же фраза, что на прошлых шагах.'
      : 'Сейчас дословно: нужна та же фраза, что на предыдущих шагах.'
  }
  return audience === 'child'
    ? 'Ответ - одно полное предложение по шаблону темы, не одним словом.'
    : 'Ответ - одно полное предложение по шаблону темы, не одним словом.'
}

function roleplayTypeLabel(mode: PracticeMode): string {
  if (mode === 'challenge') return 'Ответьте собеседнику по-английски.'
  return 'Ответьте в мини-диалоге.'
}

export function formatRoleplayInfoLabel(params: {
  axis: PracticePromptAxis
  mode: PracticeMode
  stepIndex: number
  lessonId: string
  audience: Audience
}): string {
  const cue = buildRoleplayExpectedAnswerCue(params.mode, params.stepIndex, params.audience)
  // Lesson 3: do not put grammar recipes in info (they leak embedded-answer shape).
  if (params.lessonId === '3') {
    return mergePromptParts([roleplayTypeLabel(params.mode), cue])
  }
  const grammarHint = buildRoleplayHint(params.axis, params.lessonId)
  return mergePromptParts([roleplayTypeLabel(params.mode), grammarHint, cue])
}

export const ROLEPLAY_INTERLOCUTOR_PREFIX = 'Собеседник: «'

function extractTranslateQuote(text: string | undefined): string | null {
  if (!text?.trim()) return null
  const match = /Переведите[^"]*"([^"]+)"/iu.exec(text)
  return match?.[1]?.trim() || null
}

function toSecondPersonRu(line: string, audience: Audience): string {
  const trimmed = line.trim().replace(/[.!?…]+$/u, '')
  if (!trimmed) return trimmed
  if (audience === 'child') {
    return trimmed
      .replace(/^Я\b/u, 'Ты')
      .replace(/^Мой\b/u, 'Твой')
      .replace(/^Моя\b/u, 'Твоя')
      .replace(/^Мои\b/u, 'Твои')
  }
  return trimmed
    .replace(/^Я\b/u, 'Вы')
    .replace(/^Мой\b/u, 'Ваш')
    .replace(/^Моя\b/u, 'Ваша')
    .replace(/^Мои\b/u, 'Ваши')
}

function objectEnFromLikesAnswer(targetAnswer: string): string | null {
  const match = /\b(?:likes?|drinks?|reads?|plays?)\s+([a-z]+)/i.exec(targetAnswer)
  return match?.[1]?.toLowerCase() ?? null
}

function subjectEnFromLikesAnswer(targetAnswer: string): string | null {
  const match = /^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:likes?|drinks?|reads?|plays?)/i.exec(
    targetAnswer.trim()
  )
  return match?.[1]?.trim().toLowerCase() ?? null
}

export function resolveLesson2AnswerSubjectEn(targetAnswer: string): string | null {
  return subjectEnFromLikesAnswer(resolveRoleplayTargetAnswer(targetAnswer, '2'))
}

function lesson2ClassmateIntroFromSubject(subjectEn: string, audience: Audience): string | null {
  const template = LESSON2_CLASSMATE_INTRO_BY_SUBJECT[subjectEn.trim().toLowerCase()]
  if (!template) return null
  if (audience === 'child') {
    return template.replace(/^Вы рассказываете/u, 'Ты рассказываешь')
  }
  return template
}

function countryEnFromAnswer(targetAnswer: string): string | null {
  const match = /\bfrom\s+([A-Za-z]+)/i.exec(targetAnswer)
  return match?.[1]?.toLowerCase() ?? null
}

function feelingEnFromAnswer(targetAnswer: string): string | null {
  const match = /\b(?:i'?m|i am)\s+([a-z]+)/i.exec(targetAnswer.trim().toLowerCase())
  return match?.[1] ?? null
}

function lesson1IntroFromTarget(targetAnswer: string, lesson: LessonData, stepIndex: number): string {
  const normalized = targetAnswer.trim().toLowerCase()
  const situations = lesson.repeatConfig?.sourceSituations ?? []

  if (/\bdark\b/.test(normalized)) return 'На улице темно.'
  if (/\bcold\b/.test(normalized)) return 'Сегодня холодно.'
  if (/\bhot\b/.test(normalized)) return 'В комнате жарко.'
  if (/\btime\s+to\b/.test(normalized)) {
    const actionSituation = situations.find((item) => /пора/i.test(item))
    return actionSituation ? `${actionSituation.replace(/[.!?…]+$/u, '')}.` : 'Уже поздно, пора действовать.'
  }

  const situation = situations[stepIndex % Math.max(situations.length, 1)] ?? situations[0]
  if (situation) {
    const category = inferScenarioCategory(situation)
    if (category === 'weather') return `На улице ${situation.toLowerCase().replace(/^на улице\s*/iu, '')}.`
    return `${situation.replace(/[.!?…]+$/u, '')}.`
  }
  return 'Короткая бытовая сцена.'
}

function lesson2IntroFromTarget(
  targetAnswer: string,
  source: PracticePromptSource | undefined,
  audience: Audience
): string {
  const variant = source?.exercise.variants?.[source.variantIndex ?? 0]
  const quote = extractTranslateQuote(variant?.question ?? source?.exercise.question)
  if (quote) {
    const parts = quote.split(/\?\s*/)
    const declarativePart = parts.find((part) => /любит|пьет|читает|играет/i.test(part))
    if (declarativePart?.trim()) {
      return `${toSecondPersonRu(declarativePart.trim(), audience).replace(/[.!?…]+$/u, '')}.`
    }
  }

  const subject = subjectEnFromLikesAnswer(targetAnswer)
  const object = objectEnFromLikesAnswer(targetAnswer)
  if (subject?.startsWith('my ')) {
    const subjectRu = SUBJECT_RU_BY_EN[subject]
    const objectRu = object ? OBJECT_RU_BY_EN[object] ?? object : null
    if (subjectRu && objectRu) return `${subjectRu} любит ${objectRu}.`
    if (subjectRu) return `${subjectRu} в классе.`
  }
  if (subject && !subject.startsWith('my ')) {
    const named = lesson2ClassmateIntroFromSubject(subject, audience)
    if (named) return named
    return 'Вы рассказываете об однокласснице.'
  }
  return 'Вы отвечаете на вопрос о классе.'
}

function lesson3IntroFromSource(
  source: PracticePromptSource | undefined,
  stepIndex: number,
  lesson: LessonData,
  audience: Audience
): string {
  const variant = source?.exercise.variants?.[source.variantIndex ?? 0]
  const quote = extractTranslateQuote(variant?.question ?? source?.exercise.question)
  if (quote) {
    const cleaned = quote.replace(/\?.*$/u, '').trim()
    if (cleaned) return `${toSecondPersonRu(cleaned, audience).replace(/[.!?…]+$/u, '')}.`
  }
  const situations = lesson.repeatConfig?.sourceSituations ?? []
  const situation = situations[stepIndex % Math.max(situations.length, 1)] ?? situations[0]
  if (situation) return `${situation.replace(/[.!?…]+$/u, '')}.`
  return 'Короткий диалог по теме урока.'
}

function lesson4IntroFromTarget(
  targetAnswer: string,
  source: PracticePromptSource | undefined,
  audience: Audience
): string {
  const normalized = targetAnswer.trim().toLowerCase()
  const variant = source?.exercise.variants?.[source.variantIndex ?? 0]
  const quote = extractTranslateQuote(variant?.question ?? source?.exercise.question)

  if (/\bfrom\b/.test(normalized)) {
    const country = countryEnFromAnswer(targetAnswer)
    const countryRu = country ? COUNTRY_RU_BY_EN[country] : null
    if (countryRu) return `Вы из ${countryRu}.`
    if (quote) return `${toSecondPersonRu(quote, audience).replace(/[.!?…]+$/u, '')}.`
    return 'Вас спрашивают, откуда вы.'
  }

  if (/\b(a|an)\s+\w/.test(normalized)) {
    if (quote) return `${toSecondPersonRu(quote, audience).replace(/[.!?…]+$/u, '')}.`
    return 'Вы студент.'
  }

  const feeling = feelingEnFromAnswer(targetAnswer)
  if (feeling === 'happy') return 'Вы счастливы.'
  if (feeling === 'tired') return 'Вы устали.'
  if (feeling === 'fine') return 'У вас всё нормально.'
  if (quote) return `${toSecondPersonRu(quote, audience).replace(/[.!?…]+$/u, '')}.`
  return 'Вас спрашивают о настроении.'
}

export function resolveRoleIntroRu(params: {
  lesson: LessonData
  axis: PracticePromptAxis
  targetAnswer: string
  source?: PracticePromptSource
  stepIndex: number
  audience: Audience
  priorIntroRu?: string | null
}): string {
  if (params.priorIntroRu?.trim()) {
    return params.priorIntroRu.trim().replace(/[.!?…]+$/u, '') + '.'
  }

  const lessonId = params.lesson.id
  if (lessonId === '1') {
    return lesson1IntroFromTarget(params.targetAnswer, params.lesson, params.stepIndex)
  }
  if (lessonId === '2') {
    return lesson2IntroFromTarget(params.targetAnswer, params.source, params.audience)
  }
  if (lessonId === '3') {
    return lesson3IntroFromSource(params.source, params.stepIndex, params.lesson, params.audience)
  }
  if (lessonId === '4') {
    return lesson4IntroFromTarget(params.targetAnswer, params.source, params.audience)
  }

  const situations = params.lesson.repeatConfig?.sourceSituations ?? []
  const situation = situations[params.stepIndex % Math.max(situations.length, 1)]
  return situation ? `${situation.replace(/[.!?…]+$/u, '')}.` : 'Короткая сцена по теме урока.'
}

function lesson2InterlocutorEn(targetAnswer: string, axis: PracticePromptAxis): string {
  const object = objectEnFromLikesAnswer(targetAnswer)
  if (object) {
    const verb = /\bdrinks?\b/i.test(targetAnswer)
      ? 'drink'
      : /\breads?\b/i.test(targetAnswer)
        ? 'read'
        : /\bplays?\b/i.test(targetAnswer)
          ? 'play'
          : 'like'
    const verbThird = verb === 'like' ? 'likes' : verb === 'read' ? 'reads' : verb === 'play' ? 'plays' : 'drinks'
    if (verb === 'play') return `Who plays ${object}?`
    return `Who ${verbThird} ${object}?`
  }
  return LESSON_INTERLOCUTOR_EN['2']![axis]
}

function lesson3EmbeddedInterlocutorEn(targetAnswer: string): string {
  const trimmed = targetAnswer.trim().replace(/[.!?…]+$/u, '')
  const lower = trimmed.toLowerCase()

  if (/^i don't know\b/i.test(trimmed)) {
    return `Do you know${trimmed.slice("I don't know".length)}?`
  }
  if (/^i do not know\b/i.test(trimmed)) {
    return `Do you know${trimmed.slice('I do not know'.length)}?`
  }
  if (/^i know\b/i.test(trimmed)) {
    return `Do you know${trimmed.slice('I know'.length)}?`
  }
  if (/^tell me\b/i.test(trimmed)) {
    return `Can you tell me${trimmed.slice('Tell me'.length)}?`
  }
  if (/^do you know\b/i.test(trimmed)) {
    return `${trimmed}?`
  }

  if (/\bwhere\b/.test(lower)) return 'Do you know where he lives?'
  if (/\bwho\b/.test(lower)) return 'Do you know who he is?'
  if (/\bwhen\b/.test(lower)) return 'Do you know when the lesson starts?'
  return 'Do you know what she likes?'
}

function isDirectWhInversionQuestion(candidate: string): boolean {
  return /^(?:what|where|when|who|how)\s+does\b/i.test(candidate.trim())
}

function isEmbeddedInterlocutorLead(candidate: string): boolean {
  const lower = candidate.trim().toLowerCase()
  return (
    lower.startsWith('do you know') ||
    lower.startsWith('can you tell me') ||
    lower.startsWith('tell me') ||
    lower.startsWith('can you say')
  )
}

type Lesson1SceneKey = 'dark' | 'cold' | 'hot' | 'time'

const LESSON1_WH_BY_SCENE: Record<Lesson1SceneKey, string> = {
  dark: 'What is it like outside?',
  cold: "What's the weather like?",
  hot: 'What is it like in the room?',
  time: 'What should we do now?',
}

function extractLesson1SceneKey(targetAnswer: string, roleIntroRu: string): Lesson1SceneKey | null {
  const normalized = targetAnswer.trim().toLowerCase()
  if (/\btime\s+to\b/.test(normalized)) return 'time'

  const itsMatch = /\bit'?s\s+(\w+)/i.exec(normalized)
  if (itsMatch) {
    const adj = itsMatch[1].toLowerCase()
    if (adj === 'dark') return 'dark'
    if (adj === 'cold') return 'cold'
    if (adj === 'hot') return 'hot'
  }

  const introLower = roleIntroRu.toLowerCase()
  if (introLower.includes('темно') || introLower.includes('темн')) return 'dark'
  if (introLower.includes('холод')) return 'cold'
  if (introLower.includes('жарко')) return 'hot'
  if (/пора/i.test(introLower)) return 'time'
  return null
}

export function collectWhQuestionCandidates(params: {
  lesson: LessonData
  axis: PracticePromptAxis
  targetAnswer: string
  roleIntroRu: string
}): string[] {
  const lessonId = params.lesson.id

  if (lessonId === '2') {
    return [lesson2InterlocutorEn(params.targetAnswer, params.axis)]
  }

  if (lessonId === '3') {
    const embedded = lesson3EmbeddedInterlocutorEn(params.targetAnswer)
    const table = LESSON_INTERLOCUTOR_EN['3']!
    return [embedded, table[params.axis]]
  }

  if (lessonId === '4') {
    const table = LESSON_INTERLOCUTOR_EN['4']!
    return [table[params.axis]]
  }

  const scene = extractLesson1SceneKey(params.targetAnswer, params.roleIntroRu)
  const axisTable = LESSON_INTERLOCUTOR_EN['1']!
  const candidates: string[] = []

  if (scene) candidates.push(LESSON1_WH_BY_SCENE[scene])
  candidates.push(axisTable[params.axis])
  candidates.push('What is it like outside?', 'How is it?', 'What should we do now?')

  return Array.from(new Set(candidates.filter(Boolean)))
}

export function isInterlocutorQuestionAdequate(params: {
  candidate: string
  targetAnswer: string
  roleIntroRu: string
  lessonId: string
}): boolean {
  const candidateLower = params.candidate.trim().toLowerCase()
  if (!candidateLower.includes('?')) return false

  if (params.lessonId === '3') {
    if (isDirectWhInversionQuestion(params.candidate)) return false
    return isEmbeddedInterlocutorLead(params.candidate)
  }

  if (params.lessonId !== '1') return true

  const scene = extractLesson1SceneKey(params.targetAnswer, params.roleIntroRu)
  if (!scene) return true

  if (scene === 'dark') {
    if (candidateLower.includes('weather')) return false
    return candidateLower.includes('outside') || candidateLower.includes('like')
  }
  if (scene === 'cold') {
    return candidateLower.includes('weather') || candidateLower.includes('like') || candidateLower.includes('how')
  }
  if (scene === 'hot') {
    return candidateLower.includes('room') || candidateLower.includes('like')
  }
  if (scene === 'time') {
    return (
      candidateLower.includes('should') ||
      candidateLower.includes('do now') ||
      candidateLower.includes('time')
    )
  }

  return true
}

export function isYesNoScaffoldInterlocutor(text: string): boolean {
  return /[—–-]\s*Yes,/i.test(text.trim())
}

export function buildYesNoScaffoldQuestion(targetAnswer: string, roleIntroRu: string): string {
  const normalized = targetAnswer.trim().toLowerCase()
  const introLower = roleIntroRu.toLowerCase()
  const target = targetAnswer.trim().replace(/[.!?…]+$/u, '')
  const targetWithPeriod = `${target}.`

  const itsMatch = /\bit'?s\s+(\w+)/i.exec(normalized)
  const adj = itsMatch?.[1]
  if (!adj) {
    return `Is that right? - Yes, ${targetWithPeriod}`
  }

  const context = introLower.includes('комнат')
    ? 'in the room'
    : introLower.includes('улиц') || introLower.includes('темно')
      ? 'outside'
      : 'outside'

  return `Is it ${adj} ${context}? - Yes, ${targetWithPeriod}`
}

export function resolveInterlocutorQuestionEn(params: {
  lesson: LessonData
  axis: PracticePromptAxis
  targetAnswer: string
  roleIntroRu: string
}): string {
  const lessonId = params.lesson.id
  const candidates = collectWhQuestionCandidates(params)

  for (const candidate of candidates) {
    if (
      isInterlocutorQuestionAdequate({
        candidate,
        targetAnswer: params.targetAnswer,
        roleIntroRu: params.roleIntroRu,
        lessonId,
      })
    ) {
      return candidate
    }
  }

  if (lessonId === '1') {
    return buildYesNoScaffoldQuestion(params.targetAnswer, params.roleIntroRu)
  }

  return candidates[0] ?? LESSON_INTERLOCUTOR_EN['1']!.state
}

export function resolveRoleplayScenario(params: {
  lesson: LessonData
  targetAnswer: string
  source?: PracticePromptSource
  stepIndex: number
  audience: Audience
  priorIntroRu?: string | null
}): RoleplayScenario {
  const resolvedTarget = resolveRoleplayTargetAnswer(params.targetAnswer, params.lesson.id)
  const grammarAxis = inferRoleplayAxis(
    resolvedTarget,
    params.lesson,
    params.source?.variantIndex
  )
  const roleIntroRu = resolveRoleIntroRu({
    lesson: params.lesson,
    axis: grammarAxis,
    targetAnswer: resolvedTarget,
    source: params.source,
    stepIndex: params.stepIndex,
    audience: params.audience,
    priorIntroRu: params.priorIntroRu,
  })
  const interlocutorEn = resolveInterlocutorQuestionEn({
    lesson: params.lesson,
    axis: grammarAxis,
    targetAnswer: resolvedTarget,
    roleIntroRu,
  })
  return { roleIntroRu, interlocutorEn, grammarAxis }
}

export function parseRoleIntroFromPrompt(prompt: string): string | null {
  const trimmed = prompt.trim()
  const markerIndex = trimmed.search(/Собеседник:\s*«/u)
  if (markerIndex <= 0) return null
  const intro = trimmed.slice(0, markerIndex).replace(/\s+/g, ' ').trim()
  return intro.length >= 3 ? intro : null
}

export function parseInterlocutorFromPrompt(prompt: string): string | null {
  const match = /Собеседник:\s*«([^»]+)»/u.exec(prompt)
  return match?.[1]?.trim() || null
}

export function formatRoleplayTaskBubble(interlocutorLine: string): string {
  const trimmed = interlocutorLine.trim()
  if (isYesNoScaffoldInterlocutor(trimmed)) {
    const core = trimmed.replace(/[.!?…]+$/u, '')
    return `${ROLEPLAY_INTERLOCUTOR_PREFIX}${core}.»`
  }
  const core = trimmed.replace(/[.!?…]+$/u, '')
  const closing = trimmed.includes('?') ? '?' : '.'
  return `${ROLEPLAY_INTERLOCUTOR_PREFIX}${core}${closing}»`
}

function roleplayTaskLabel(audience: Audience): string {
  return audience === 'child' ? 'Скажи ответ' : 'Скажите ответ'
}

export function buildCanonicalRoleplayPrompt(scenario: RoleplayScenario): string {
  return `${scenario.roleIntroRu.trim()}\n${formatRoleplayTaskBubble(scenario.interlocutorEn)}`
}

export function formatRoleplayTaskDisplay(prompt: string, audience: Audience = 'adult'): string {
  const intro = parseRoleIntroFromPrompt(prompt)
  const interlocutor = parseInterlocutorFromPrompt(prompt)
  const taskLabel = roleplayTaskLabel(audience)
  if (!interlocutor) return stripRoleplayTaskInstruction(prompt, audience)
  const interlocutorBubble = formatRoleplayTaskBubble(interlocutor)
  if (!intro) return `${interlocutorBubble}. ${taskLabel}.`
  return `${intro} ${interlocutorBubble}. ${taskLabel}.`
}

export function stripRoleplayTaskInstruction(prompt: string, audience: Audience = 'adult'): string {
  return formatRoleplayTaskDisplay(prompt, audience)
}

export function resolveInterlocutorForSource(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string,
  audience: Audience = 'adult'
): string {
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer,
    source,
    stepIndex,
    audience,
  })
  return buildCanonicalRoleplayPrompt(scenario)
}

export function isRoleplayAnswerSemanticallyAligned(params: {
  userInput: string
  roleIntro: string
  targetAnswer: string
}): boolean {
  const introLower = params.roleIntro.toLowerCase()
  const answerLower = params.userInput.trim().toLowerCase()

  for (const entry of SCENE_SEMANTIC_LEXICON) {
    const introMatches = entry.ru.some((token) => introLower.includes(token))
    if (!introMatches) continue

    const hasExpected = entry.en.some((token) => answerLower.includes(token))
    if (!hasExpected) return false

    for (const other of SCENE_SEMANTIC_LEXICON) {
      if (other === entry) continue
      if (other.en.some((token) => answerLower.includes(token))) return false
    }
  }

  return true
}

const ROLEPLAY_KEYWORD_STOP = new Set([
  'i',
  "i'm",
  'im',
  "it's",
  'its',
  'it',
  'is',
  'am',
  'are',
  'the',
  'a',
  'an',
  'my',
  'your',
  'me',
  'do',
  'does',
  'tell',
  'know',
  'say',
])

export function extractRoleplayKeywords(targetAnswer: string, lesson: LessonData): string[] {
  const normalized = resolveRoleplayTargetAnswer(targetAnswer, lesson.id).trim().toLowerCase()
  const keywords: string[] = []

  if (/\btime\s+to\b/.test(normalized)) keywords.push('time to')
  if (/\bi am from\b/.test(normalized) || /\bi'm from\b/.test(normalized)) keywords.push('from')

  const tokens = normalized
    .replace(/[.,!?;:()[\]{}'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  for (const token of tokens) {
    if (ROLEPLAY_KEYWORD_STOP.has(token)) continue
    if (keywords.includes(token)) continue
    keywords.push(token)
    if (keywords.length >= 5) break
  }

  const profile = resolveLessonRoleplayProfile(lesson)
  const mustInclude = profile.stepBlueprint?.semanticExpectations?.mustInclude ?? []
  for (const item of mustInclude) {
    const key = item.trim().toLowerCase()
    if (!key || keywords.includes(key)) continue
    if (!normalized.includes(key)) continue
    keywords.push(key)
  }

  return keywords.slice(0, 6)
}

export function roleplayPromptHasInterlocutor(prompt: string): boolean {
  const interlocutor = parseInterlocutorFromPrompt(prompt)
  if (!interlocutor) return false
  return interlocutor.includes('?') && !/[а-яё]/iu.test(interlocutor)
}

export function roleplayPromptHasContext(prompt: string): boolean {
  const intro = parseRoleIntroFromPrompt(prompt)
  return Boolean(intro && intro.length >= 3 && roleplayPromptHasInterlocutor(prompt))
}

/** @deprecated use resolveRoleplayScenario */
export function buildInterlocutorLine(
  situationRu: string,
  axis: PracticePromptAxis,
  lessonId: string
): string {
  void situationRu
  const table = LESSON_INTERLOCUTOR_EN[lessonId] ?? LESSON_INTERLOCUTOR_EN['1']!
  return table[axis]
}
