import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'
import { ROLEPLAY_INTERLOCUTOR_PREFIX } from '@/lib/practice/prompt/roleplayPromptEngine'
import { buildDictationTaskPrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import { formatErrorFixPrompt } from '@/lib/practice/prompt/buildErrorFixPrompt'
import { tokensFromTargetAnswer } from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
import type { LessonChallengeAtom, LessonData } from '@/types/lesson'
import type { PracticeMode, PracticeQuestion } from '@/types/practice'

const LESSON3_CHOICE_FRAME = 'Какая фраза звучит правильно во вложенном вопросе?'

function formatSituationLine(situationRu: string): string {
  const trimmed = situationRu.trim().replace(/[.!?…]+$/u, '')
  return `Ситуация: ${trimmed}.`
}

function mergeParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getLessonChallengeAtoms(lesson: LessonData): LessonChallengeAtom[] {
  return lesson.repeatConfig?.challengeAtoms ?? []
}

export function getLessonChallengeAtom(
  lesson: LessonData,
  stepIndex: number
): LessonChallengeAtom | null {
  if (lesson.id !== '3') return null
  const atoms = getLessonChallengeAtoms(lesson)
  return atoms.find((atom) => atom.stepIndex === stepIndex) ?? null
}

export function shouldApplyLessonChallengeAtom(
  lesson: LessonData,
  mode: PracticeMode,
  stepIndex: number
): boolean {
  return lesson.id === '3' && mode === 'challenge' && getLessonChallengeAtom(lesson, stepIndex) != null
}

function buildAtomPrompt(
  question: PracticeQuestion,
  atom: LessonChallengeAtom,
  lesson: LessonData
): string {
  const situation = formatSituationLine(atom.situationRu)

  switch (question.type) {
    case 'choice':
      return mergeParts([situation, LESSON3_CHOICE_FRAME])
    case 'voice-shadow':
      return situation
    case 'context-clue':
      return mergeParts([situation, LESSON3_CHOICE_FRAME])
    case 'sentence-surgery':
      return mergeParts([situation, 'Расставьте слова в правильном порядке.'])
    case 'free-response':
      return `Переведите на английский: "${atom.situationRu.replace(/[.!?…]+$/u, '')}."`
    case 'dropdown-fill': {
      const frame = atom.dropdownFrameEn?.trim()
      if (!frame) return situation
      return `Выберите слово для пропуска: «${atom.situationRu.replace(/[.!?…]+$/u, '')}» — «${frame}»`
    }
    case 'word-builder-pro':
      return mergeParts([situation, 'Расставьте слова в правильном порядке.'])
    case 'dictation':
      return buildDictationTaskPrompt(atom.situationRu)
    case 'listening-select':
      return situation
    case 'roleplay-mini': {
      const intro = atom.roleIntroRu?.trim() || situation
      const interlocutor = atom.interlocutorEn?.trim()
      if (!interlocutor) return intro
      return `${intro}\n${ROLEPLAY_INTERLOCUTOR_PREFIX}${interlocutor}»`
    }
    case 'error-fix':
      return formatErrorFixPrompt(situation, atom.brokenPhrase ?? atom.targetAnswer)
    case 'boss-challenge':
      return mergeParts([
        situation,
        'Напишите по-английски две связанные мысли через but.',
      ])
    default:
      return situation
  }
}

function shuffleWordTokens(tokens: string[]): string[] {
  const copy = [...tokens]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

export function applyLessonChallengeAtom(
  question: PracticeQuestion,
  atom: LessonChallengeAtom,
  lesson: LessonData
): PracticeQuestion {
  const expectedType = CHALLENGE_STEP_SPECS[atom.stepIndex]?.type
  if (expectedType && question.type !== expectedType) return question

  const targetAnswer = atom.targetAnswer.trim()
  const acceptedAnswers = Array.from(
    new Set([targetAnswer, ...(atom.acceptedAnswers ?? [])].map((item) => item.trim()).filter(Boolean))
  )
  const prompt = buildAtomPrompt(question, atom, lesson)
  const isPuzzle =
    question.type === 'sentence-surgery' || question.type === 'word-builder-pro'
  const shuffledWords = isPuzzle
    ? shuffleWordTokens(tokensFromTargetAnswer(targetAnswer))
    : question.shuffledWords
  const extraWords =
    question.type === 'word-builder-pro'
      ? atom.extraWords ?? buildWordBuilderProExtraWords(targetAnswer, lesson)
      : question.extraWords
  const audioTypes = new Set(['dictation', 'listening-select', 'voice-shadow'])
  const audioText = audioTypes.has(question.type) ? targetAnswer : question.audioText

  return {
    ...question,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: atom.options?.length ? [...atom.options] : question.options,
    hint:
      atom.hint ??
      (question.type === 'dictation' ||
      question.type === 'voice-shadow' ||
      question.type === 'listening-select' ||
      question.type === 'error-fix' ||
      question.type === 'boss-challenge'
        ? undefined
        : question.hint),
    shuffledWords,
    extraWords,
    audioText,
    keywords: atom.keywords ?? question.keywords,
    minWords: atom.minWords ?? question.minWords,
    requireExactTarget: question.type === 'roleplay-mini' && atom.stepIndex === 9 ? true : question.requireExactTarget,
  }
}
