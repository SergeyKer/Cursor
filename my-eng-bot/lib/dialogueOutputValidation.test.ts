import { describe, expect, it } from 'vitest'
import {
  isDialogueOutputLikelyInRequiredTense,
  validateDialogueOutputTense,
  validateDialogueRepeatTense,
} from './dialogueOutputValidation'

describe('isDialogueOutputLikelyInRequiredTense', () => {
  it('Комментарий + вопрос в Past Simple: при requiredTense present_simple без expectedNext — несовпадение', () => {
    const content =
      'Комментарий: Отлично!\nWhat did you do at the beach last summer?'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
      })
    ).toBe(false)
  })

  it('тот же текст: при expectedNextQuestionTense past_simple — валидно', () => {
    const content =
      'Комментарий: Отлично!\nWhat did you do at the beach last summer?'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
        expectedNextQuestionTense: 'past_simple',
      })
    ).toBe(true)
  })

  it('Скажи проверяется по requiredTense, expectedNext не подменяет', () => {
    const content = 'Комментарий: Ошибка.\nСкажи: I feel happy.'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
        expectedNextQuestionTense: 'past_simple',
      })
    ).toBe(true)
  })

  it('возвращает reason=next_question_tense_mismatch для неверного времени следующего вопроса', () => {
    const content = 'Комментарий: Отлично!\nHave you ever taken a bus trip?'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'present_perfect',
        priorAssistantContent: null,
        expectedNextQuestionTense: 'past_simple',
      })
    ).toEqual({ ok: false, reason: 'next_question_tense_mismatch' })
  })

  it('requiredTense=all: Скажи в неверном времени невалиден (опора на предыдущий вопрос)', () => {
    const content = 'Комментарий: Нужно ответить в прошедшем длительном.\nСкажи: I swim in the river.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'all',
        priorAssistantContent: 'What were you doing near the river yesterday evening?',
      })
    ).toEqual({ ok: false, reason: 'required_tense_mismatch' })
  })

  it('requiredTense=all: Скажи в нужном времени валиден (опора на предыдущий вопрос)', () => {
    const content = 'Комментарий: Нужно Past Continuous.\nСкажи: I was swimming in the river yesterday evening.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'all',
        priorAssistantContent: 'What were you doing near the river yesterday evening?',
      })
    ).toEqual({ ok: true })
  })

  it('semantic guard: Скажи не должен удалять intention-конструкцию plan to', () => {
    const content = 'Комментарий: Лексика.\nСкажи: I find my work.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: 'What do you usually plan for your week?',
        lastUserText: 'I plan to find my work.',
      })
    ).toEqual({ ok: false, reason: 'semantic_mismatch' })
  })

  it('semantic guard: Повтори не должен удалять intention-конструкцию plan to', () => {
    const content = 'Комментарий: Лексика.\nПовтори: I find my work.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: 'What do you usually plan for your week?',
        lastUserText: 'I plan to find my work.',
      })
    ).toEqual({ ok: false, reason: 'semantic_mismatch' })
  })

  it('requiredTense=all: Повтори в неверном времени невалиден (опора на предыдущий вопрос)', () => {
    const content = 'Комментарий: Нужно ответить в прошедшем длительном.\nПовтори: I swim in the river.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'all',
        priorAssistantContent: 'What were you doing near the river yesterday evening?',
      })
    ).toEqual({ ok: false, reason: 'required_tense_mismatch' })
  })

  it('requiredTense=all: при отсутствии prior нельзя пропустить плохое Повтори', () => {
    const content = 'Комментарий: Ошибка.\nПовтори: I wontn have car.'
    expect(
      validateDialogueOutputTense({
        content,
        requiredTense: 'all',
        priorAssistantContent: null,
      })
    ).toEqual({ ok: false, reason: 'required_tense_mismatch' })
  })
})

describe('validateDialogueRepeatTense', () => {
  it('валидирует Повтори по requiredTense', () => {
    expect(
      validateDialogueRepeatTense({
        repeatEnglish: 'I have been cooking for two hours.',
        requiredTense: 'present_perfect_continuous',
        priorAssistantContent: null,
      })
    ).toBe(true)
  })

  it('для requiredTense=all опирается на previous assistant tense', () => {
    expect(
      validateDialogueRepeatTense({
        repeatEnglish: 'I was swimming in the river yesterday evening.',
        requiredTense: 'all',
        priorAssistantContent: 'What were you doing near the river yesterday evening?',
      })
    ).toBe(true)

    expect(
      validateDialogueRepeatTense({
        repeatEnglish: 'I swim in the river.',
        requiredTense: 'all',
        priorAssistantContent: 'What were you doing near the river yesterday evening?',
      })
    ).toBe(false)
  })
})
