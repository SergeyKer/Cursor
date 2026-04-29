import { describe, expect, it } from 'vitest'
import {
  buildFallbackLessonExtraTips,
  buildTipsStorageKey,
  mergeGeneratedTipAddons,
  normalizeLessonExtraTips,
} from '@/lib/lessonExtraTips'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import { buildFallbackTutorLearningIntent } from '@/lib/tutorLearningIntent'

const intro = buildFallbackLessonIntro('to be')

function makeValidPayload() {
  return {
    cards: [
      {
        category: 'native_speech',
        title: 'Как говорят носители',
        rule: 'В быстрой речи to be часто сливается с местоимением.',
        examples: [
          { wrong: 'I am', right: "I'm", note: 'коротко для разговора' },
          { wrong: 'They are', right: "They're", note: 'частая форма в речи' },
        ],
      },
      {
        category: 'russian_traps',
        title: 'Ловушки для русскоговорящих',
        rule: 'Не ставь to be перед обычным глаголом.',
        examples: [
          { wrong: 'I am agree', right: 'I agree', note: 'agree уже глагол' },
          { wrong: 'I am have', right: 'I have', note: 'have не требует am' },
        ],
      },
      {
        category: 'questions_negatives',
        title: 'Вопросы и отрицания',
        rule: 'To be сам выходит в начало вопроса и принимает not.',
        examples: [
          { right: 'Are you ready?', note: 'инверсия без do' },
          { right: "She isn't ready.", note: 'not крепится к is' },
        ],
      },
      {
        category: 'emphasis_emotion',
        title: 'Эмфаза и эмоции',
        rule: 'Ударение на am/is/are усиливает утверждение.',
        examples: [
          { wrong: 'I am tired.', right: 'I AM tired.', note: 'сильный акцент' },
          { wrong: 'It is important.', right: 'It IS important.', note: 'подчёркиваем важность' },
        ],
      },
      {
        category: 'context_culture',
        title: 'Контекст и культура',
        rule: 'В формальном письме лучше полная форма.',
        examples: [
          { wrong: "I'm writing", right: 'I am writing', note: 'формальнее в письме' },
          { wrong: 'I am ok', right: "I'm ok", note: 'естественно в чате' },
        ],
      },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Как правильно?',
        options: ['I am agree', 'I agree'],
        correctAnswer: 'I agree',
        explanation: 'Agree уже обычный глагол.',
      },
      {
        id: 'q2',
        question: 'Где уместнее сокращение?',
        options: ['В чате', 'В договоре'],
        correctAnswer: 'В чате',
        explanation: 'В чате стиль обычно неформальный.',
      },
    ],
  }
}

describe('lessonExtraTips', () => {
  it('normalizes a valid AI payload into five fixed categories', () => {
    const tips = normalizeLessonExtraTips(makeValidPayload(), intro)

    expect(tips.cards).toHaveLength(5)
    expect(tips.cards.map((card) => card.category)).toEqual([
      'native_speech',
      'russian_traps',
      'questions_negatives',
      'emphasis_emotion',
      'context_culture',
    ])
    expect(tips.quiz).toHaveLength(2)
  })

  it('fills missing or partial AI cards with fallback data', () => {
    const tips = normalizeLessonExtraTips(
      {
        cards: [
          {
            category: 'native_speech',
            title: 'Как говорят носители',
            rule: 'Короткое правило.',
            examples: [{ right: "I'm", note: 'одного примера мало' }],
          },
        ],
      },
      intro
    )

    expect(tips.cards).toHaveLength(5)
    expect(tips.cards.every((card) => card.examples.length >= 2)).toBe(true)
  })

  it('builds native speech fallback as short topic-aware conversation tips', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const nativeSpeech = tips.cards.find((card) => card.category === 'native_speech')

    expect(nativeSpeech?.rule).toContain('готовую фразу')
    expect(nativeSpeech?.examples.some((example) => example.right.includes(intro.topic))).toBe(true)
    expect(nativeSpeech?.examples.some((example) => example.note.includes('How does ... work?'))).toBe(true)
  })

  it('builds russian traps fallback as calque and self-check tips', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const russianTraps = tips.cards.find((card) => card.category === 'russian_traps')

    expect(russianTraps?.rule).toContain('английский шаблон')
    expect(russianTraps?.examples).toHaveLength(3)
    expect(russianTraps?.examples[0].note).toContain('русскому шаблону')
    expect(russianTraps?.examples[1].note).toContain('английский шаблон')
  })

  it('builds questions mistakes fallback as wrong-right and quick fix blocks', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const questions = tips.cards.find((card) => card.category === 'questions_negatives')

    expect(questions?.title).toBe('Где ошибаются')
    expect(questions?.rule).toContain('русский порядок')
    expect(questions?.examples[0].wrong).toContain('✗')
    expect(questions?.examples[0].right).toContain('✓')
    expect(questions?.examples[1].note).toContain('общий вопрос')
  })

  it('builds emphasis fallback as boosters and live examples', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const emphasis = tips.cards.find((card) => card.category === 'emphasis_emotion')

    expect(emphasis?.title).toBe('Сделай речь ярче')
    expect(emphasis?.rule).toContain('really')
    expect(emphasis?.examples[0].right).toContain('really')
    expect(emphasis?.examples[1].note).toContain('so')
  })

  it('builds context style fallback as chat vs work and style choice', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const context = tips.cards.find((card) => card.category === 'context_culture')

    expect(context?.title).toBe('Контекст и стиль')
    expect(context?.rule).toContain('разного тона')
    expect(context?.examples[0].right).toContain('formal')
    expect(context?.examples[1].note).toContain('кто слушает')
  })

  it('keeps tutor intent examples in fallback tips', () => {
    const intent = {
      ...buildFallbackTutorLearningIntent('a/an'),
      title: 'a/an',
      targetPatterns: ['a + consonant sound', 'an + vowel sound'],
      examples: [
        { en: 'a book', ru: 'книга', noteRu: 'b звучит как согласный' },
        { en: 'an apple', ru: 'яблоко', noteRu: 'a звучит как гласный' },
        { en: 'an hour', ru: 'час', noteRu: 'h не звучит' },
      ],
      mustTrain: ['a book', 'an apple'],
      firstPracticeGoalRu: 'Выбрать a или an по первому звуку.',
    }
    const tips = buildFallbackLessonExtraTips(buildFallbackLessonIntro('a/an'), intent)
    const serialized = JSON.stringify(tips)

    expect(serialized).toContain('a book')
    expect(serialized).toContain('an apple')
    expect(serialized).toContain('a + consonant sound')
    expect(serialized).not.toContain('How does ... work?')
  })

  it('builds a stable versioned storage key by audience, level and topic', () => {
    expect(buildTipsStorageKey({ topic: 'To   Be', audience: 'adult', level: 'a2' })).toBe('tips_v7_adult_a2_to_be')
    expect(buildTipsStorageKey({ topic: 'To Be', audience: 'child', level: 'a2' })).toBe('tips_v7_child_a2_to_be')
  })

  it('merges generated addons without duplicating examples', () => {
    const current = buildFallbackLessonExtraTips(intro)
    const duplicate = current.cards[0].examples[0]
    const generated = {
      ...current,
      cards: current.cards.map((card) =>
        card.category === 'native_speech'
          ? {
              ...card,
              examples: [
                duplicate,
                {
                  right: 'It is what it is.',
                  note: 'живая готовая фраза',
                },
              ],
            }
          : card
      ),
    }

    const merged = mergeGeneratedTipAddons(current, generated)
    const nativeExamples = merged.cards.find((card) => card.category === 'native_speech')?.examples ?? []

    expect(nativeExamples.filter((example) => example.right === duplicate.right)).toHaveLength(1)
    expect(nativeExamples.some((example) => example.right === 'It is what it is.')).toBe(true)
  })
})
