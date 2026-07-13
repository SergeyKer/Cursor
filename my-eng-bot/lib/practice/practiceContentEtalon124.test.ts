import { describe, expect, it } from 'vitest'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { RELAXED_STEP_SPECS, BALANCED_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import { REFERENCE_EXERCISE_OPTIONS } from '@/lib/practice/referenceExerciseOptions'
import { ITS_TIME_TO_CHALLENGE_ATOMS } from '@/lib/lessons/itsTimeToChallengeAtoms'
import { WHO_LIKES_CHALLENGE_ATOMS } from '@/lib/lessons/whoLikesChallengeAtoms'
import { INTRODUCING_YOURSELF_CHALLENGE_ATOMS } from '@/lib/lessons/introducingYourselfChallengeAtoms'
import { isRecipeAnswerHint } from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { parseInterlocutorFromPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'

const LESSON_ATOMS = {
  '1': ITS_TIME_TO_CHALLENGE_ATOMS,
  '2': WHO_LIKES_CHALLENGE_ATOMS,
  '4': INTRODUCING_YOURSELF_CHALLENGE_ATOMS,
} as const

describe('practice content etalon L1/L2/L4', () => {
  for (const lessonId of ['1', '2', '4'] as const) {
    describe(`lesson ${lessonId}`, () => {
      const lesson = getStructuredLessonById(lessonId)
      const atoms = LESSON_ATOMS[lessonId]

      it('wires 12 atoms and reference pools', () => {
        expect(lesson).not.toBeNull()
        expect(atoms).toHaveLength(12)
        expect(lesson!.repeatConfig?.challengeAtoms).toHaveLength(12)
        for (const option of REFERENCE_EXERCISE_OPTIONS) {
          expect(lesson!.repeatConfig?.referenceScenariosByType?.[option.id], option.id).toHaveLength(7)
        }
        expect(lesson!.repeatConfig?.sessionStepMaps?.relaxed).toHaveLength(6)
        expect(lesson!.repeatConfig?.sessionStepMaps?.balanced).toHaveLength(9)
      })

      it('builds challenge session with matrix targets and roleplay anchor', () => {
        const session = buildLocalPracticeSession({
          lesson: lesson!,
          source: { kind: 'static_lesson', lessonId },
          mode: 'challenge',
          entrySource: 'menu',
        })

        expect(session.questions.map((q) => q.type)).toEqual(CHALLENGE_STEP_SPECS.map((s) => s.type))
        for (const [index, atom] of atoms.entries()) {
          expect(session.questions[index]?.targetAnswer).toBe(atom.targetAnswer)
          expect(session.questions[index]?.hint).toBeFalsy()
        }

        expect(session.questions[9]?.targetAnswer).toBe(session.questions[4]?.targetAnswer)
        expect(session.questions[9]?.requireExactTarget).toBe(true)
        const interlocutor = parseInterlocutorFromPrompt(session.questions[9]?.prompt ?? '')
        expect(interlocutor?.endsWith('?')).toBe(true)

        if (lessonId === '1') {
          expect(session.questions[5]?.targetAnswer).toBe('to')
          expect(session.questions[8]?.audioText).toBe(session.questions[8]?.targetAnswer)
          expect(session.questions[11]?.prompt).not.toMatch(/\bbut\b/i)
        }
        if (lessonId === '2') {
          expect(session.questions[4]?.targetAnswer).toMatch(/likes tea/i)
          expect(session.questions[8]?.audioText).toBe('Anna likes tea.')
          expect(interlocutor).toMatch(/^Who /i)
        }
        if (lessonId === '4') {
          expect(session.questions[5]?.targetAnswer).toBe('a')
          expect(session.questions[5]?.options).toEqual(expect.arrayContaining(['a', 'an']))
          expect(
            lesson!.repeatConfig?.referenceScenariosByType?.['dropdown-fill']?.some(
              (item) => item.targetAnswer === 'an' && /engineer/i.test(item.dropdownFrameEn ?? '')
            )
          ).toBe(true)
        }
      })

      it('keeps info bubble free of recipe and target', () => {
        const session = buildLocalPracticeSession({
          lesson: lesson!,
          source: { kind: 'static_lesson', lessonId },
          mode: 'challenge',
          entrySource: 'menu',
        })

        for (let index = 0; index < session.questions.length; index += 1) {
          const question = session.questions[index]!
          const messages = buildPracticeFeedMessages({
            session: { ...session, currentIndex: index },
            state: 'answering',
            audience: 'adult',
          })
          const current = messages.find((message) => message.id === `practice-question-${question.id}`)
          const info = current?.bubbles?.find((bubble) => bubble.type === 'info')?.content ?? ''
          expect(info.trim().length).toBeGreaterThan(0)
          expect(isRecipeAnswerHint(info)).toBe(false)
          expect(info.toLowerCase()).not.toContain(question.targetAnswer.trim().toLowerCase())
        }
      })

      it('builds relaxed 6 and balanced 9 from session maps', () => {
        const relaxed = buildLocalPracticeSession({
          lesson: lesson!,
          source: { kind: 'static_lesson', lessonId },
          mode: 'relaxed',
          entrySource: 'menu',
        })
        const balanced = buildLocalPracticeSession({
          lesson: lesson!,
          source: { kind: 'static_lesson', lessonId },
          mode: 'balanced',
          entrySource: 'menu',
        })
        expect(relaxed.questions).toHaveLength(RELAXED_STEP_SPECS.length)
        expect(balanced.questions).toHaveLength(BALANCED_STEP_SPECS.length)
        expect(relaxed.questions.every((q) => q.targetAnswer.trim().length > 0)).toBe(true)
        expect(balanced.questions.every((q) => q.targetAnswer.trim().length > 0)).toBe(true)
      })
    })
  }
})
