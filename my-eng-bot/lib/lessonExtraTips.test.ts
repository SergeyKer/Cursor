import { describe, expect, it } from 'vitest'
import {
  areTipsTooSimilar,
  buildFallbackLessonExtraTips,
  buildTipsStorageKey,
  detectNativeSpeechSwapAxis,
  getNativeSpeechSwapLabels,
  isLikelyEmbeddedQuestionTopic,
  isValidCachedLessonExtraTips,
  mergeGeneratedTipAddons,
  nativeSpeechSwapLooksInvalid,
  nativeSpeechSwapSameMeaning,
  nativeSpeechWrongLooksLikeLearnerError,
  normalizeLessonExtraTips,
  parseCommonMistakePair,
  pickNativeSpeechSwapFirst,
  russianTrapCalqueLooksInvalid,
  toCachedLessonExtraTips,
} from '@/lib/lessonExtraTips'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { introducingYourselfLesson } from '@/lib/lessons/introducing-yourself'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'
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

    expect(nativeSpeech?.rule).toMatch(/сокращ|неформальн|книжно/i)
    expect(nativeSpeech?.examples[1]?.note).toMatch(/can't|Сократи|Can I|шаблон/i)
    expect(nativeSpeech?.examples[0]?.right).toContain("I'm")
  })

  it('uses long-vs-short native speech swap for generic concept topics', () => {
    const tips = buildFallbackLessonExtraTips(buildFallbackLessonIntro('shopping'))
    const nativeSpeech = tips.cards.find((card) => card.category === 'native_speech')
    const ex0 = nativeSpeech?.examples[0]

    expect(ex0?.wrong).toMatch(/I would like to help you/i)
    expect(ex0?.right).toMatch(/I can help you/i)
    expect(ex0?.wrong).not.toContain('Do you know how')
    expect(ex0?.wrong).not.toMatch(/drill|practice this pattern/i)
  })

  it('uses A1-safe generic swap when lesson level is A1', () => {
    const tips = buildFallbackLessonExtraTips(buildFallbackLessonIntro('shopping'), null, 'A1')
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]
    expect(ex0?.wrong).toMatch(/I am happy/i)
    expect(ex0?.right).toMatch(/I'm happy/i)
    expect(ex0?.wrong).not.toMatch(/drill|practice this pattern/i)
  })

  it('builds embedded-questions native speech from lesson mistakes', () => {
    expect(isLikelyEmbeddedQuestionTopic(embeddedQuestionsLesson.intro)).toBe(true)
    const tips = buildFallbackLessonExtraTips(embeddedQuestionsLesson.intro, null, 'A2')
    const nativeSpeech = tips.cards.find((card) => card.category === 'native_speech')
    const ex0 = nativeSpeech?.examples[0]

    expect(ex0?.wrong).toMatch(/what does she like/i)
    expect(ex0?.right).toMatch(/what she likes/i)
    expect(ex0?.wrong).not.toMatch(/drill|practice this pattern/i)
    expect(detectNativeSpeechSwapAxis(ex0!, embeddedQuestionsLesson.intro, tips.topic)).toBe('learnerGrammar')
    expect(getNativeSpeechSwapLabels('learnerGrammar').wrongLabel).toBe('Типичная ошибка:')
  })

  it('avoids Who fallback in russian_traps for embedded questions', () => {
    const tips = buildFallbackLessonExtraTips(embeddedQuestionsLesson.intro, null, 'A2')
    const quickCheck = tips.cards.find((card) => card.category === 'russian_traps')?.examples[1]
    expect(quickCheck?.right).toMatch(/what she likes/i)
    expect(quickCheck?.right).not.toMatch(/Who likes this topic/i)
  })

  it('uses embedded checkpoint in questions_negatives fallback', () => {
    const tips = buildFallbackLessonExtraTips(embeddedQuestionsLesson.intro, null, 'A2')
    const fix = tips.cards.find((card) => card.category === 'questions_negatives')?.examples[1]
    expect(fix?.right).toMatch(/Do you know what she likes/i)
  })

  it('keeps its-time-to quick check on topic', () => {
    const tips = buildFallbackLessonExtraTips(itsTimeToLesson.intro, null, 'A2')
    const quickCheck = tips.cards.find((card) => card.category === 'russian_traps')?.examples[1]
    expect(quickCheck?.right).toMatch(/time to read/i)
  })

  it('uses same-meaning be pair for I am / I am from lesson', () => {
    const tips = buildFallbackLessonExtraTips(introducingYourselfLesson.intro, null, 'A1')
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]

    expect(ex0?.wrong).toMatch(/\bI am\b/i)
    expect(ex0?.right).toMatch(/\bI'm\b/i)
    expect(ex0?.wrong).not.toContain('from in')
    expect(ex0?.wrong).not.toContain('Russia')
    expect(nativeSpeechSwapSameMeaning(ex0?.wrong ?? '', ex0?.right ?? '')).toBe(true)
  })

  it('splits commonMistake pair for russian traps calque on I am / I am from lesson', () => {
    const tips = buildFallbackLessonExtraTips(introducingYourselfLesson.intro, null, 'A1')
    const calque = tips.cards.find((card) => card.category === 'russian_traps')?.examples[0]

    expect(parseCommonMistakePair('I am from in Russia вместо I am from Russia.')).toEqual({
      wrong: 'I am from in Russia',
      right: 'I am from Russia',
    })
    expect(calque?.wrong).toBe('I am from in Russia')
    expect(calque?.right).toBe('I am from Russia')
    expect(calque?.wrong).not.toContain('вместо')
    expect(calque?.right).not.toBe("I'm happy.")
    expect(russianTrapCalqueLooksInvalid(calque!)).toBe(false)
  })

  it('sanitizes invalid russian traps calque from AI payload', () => {
    const tips = normalizeLessonExtraTips(
      {
        cards: [
          {
            category: 'russian_traps',
            title: 'Ловушки для русскоговорящих',
            rule: 'Сначала шаблон.',
            examples: [
              {
                wrong: 'I am from in Russia вместо I am from Russia.',
                right: "I'm happy.",
                note: 'bad',
              },
              { right: 'Who likes music?', note: 'check' },
            ],
          },
          ...makeValidPayload().cards.slice(1),
        ],
        quiz: makeValidPayload().quiz,
      },
      introducingYourselfLesson.intro
    )
    const calque = tips.cards.find((card) => card.category === 'russian_traps')?.examples[0]

    expect(calque?.wrong).toBe('I am from in Russia')
    expect(calque?.right).toBe('I am from Russia')
  })

  it('rejects mismatched native speech swap as invalid', () => {
    const bad = { wrong: 'I am from in Russia', right: "I'm happy.", note: 'bad' }
    expect(nativeSpeechSwapLooksInvalid(bad, 'I am / I am from')).toBe(true)
    expect(nativeSpeechWrongLooksLikeLearnerError('I am from in Russia')).toBe(true)
    expect(nativeSpeechSwapSameMeaning('I am from in Russia', "I'm happy.")).toBe(false)
    expect(nativeSpeechSwapSameMeaning('I am happy.', "I'm happy.")).toBe(true)
  })

  it('uses who-question grammar swap for Who questions lesson', () => {
    const tips = buildFallbackLessonExtraTips(whoLikesLesson.intro)
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]

    expect(ex0?.wrong).toMatch(/Who like/i)
    expect(ex0?.right).toContain('Who likes music?')
    expect(ex0?.wrong).not.toContain('Do you know how')
    expect(ex0?.wrong).not.toContain(' · ')
    expect(ex0?.right).not.toContain(' · ')
  })

  it('detects learnerGrammar axis and labels for Who questions', () => {
    const ex0 = pickNativeSpeechSwapFirst(whoLikesLesson.intro, whoLikesLesson.intro.topic, 'Who questions')
    const axis = detectNativeSpeechSwapAxis(ex0, whoLikesLesson.intro, whoLikesLesson.intro.topic)
    const labels = getNativeSpeechSwapLabels(axis)

    expect(axis).toBe('learnerGrammar')
    expect(labels.wrongLabel).toBe('Типичная ошибка:')
    expect(labels.rightLabel).toBe('Так говорят:')
  })

  it('detects contraction axis for to be topics', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]!
    const axis = detectNativeSpeechSwapAxis(ex0, intro, intro.topic)
    const labels = getNativeSpeechSwapLabels(axis)

    expect(axis).toBe('contraction')
    expect(labels.wrongLabel).toBe('Полная форма:')
    expect(labels.rightLabel).toBe('В разговоре:')
  })

  it('detects length axis for generic concept topics', () => {
    const shoppingIntro = buildFallbackLessonIntro('shopping')
    const ex0 = pickNativeSpeechSwapFirst(shoppingIntro, shoppingIntro.topic, 'shopping')
    const axis = detectNativeSpeechSwapAxis(ex0, shoppingIntro, shoppingIntro.topic)
    const labels = getNativeSpeechSwapLabels(axis)

    expect(axis).toBe('length')
    expect(labels.wrongLabel).toContain('учебнике')
    expect(labels.rightLabel).toContain('вслух')
  })

  it('sanitizes overloaded native speech in normalized AI payload', () => {
    const whoIntro = whoLikesLesson.intro
    const tips = normalizeLessonExtraTips(
      {
        cards: [
          {
            category: 'native_speech',
            title: 'Как говорят носители',
            rule: 'Коротко.',
            examples: [
              {
                wrong: 'Do you know how Who questions works?',
                right: 'How does Who questions work when you speak?',
                note: 'meta',
              },
              { right: 'Who likes tea?', note: 'лайфхак' },
            ],
          },
          ...makeValidPayload().cards.slice(1),
        ],
        quiz: makeValidPayload().quiz,
      },
      whoIntro
    )
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]
    expect(ex0?.wrong).toMatch(/Who like/i)
    expect(ex0?.wrong).not.toContain('Do you know how')
  })

  it('rejects overloaded native speech swap from AI payload', () => {
    const overloaded = {
      wrong: 'Do you know how Who questions works in real conversation?',
      right: 'How does Who questions work when you speak?',
      note: 'meta',
    }
    expect(nativeSpeechSwapLooksInvalid(overloaded, 'Who questions')).toBe(true)
    const fixed = pickNativeSpeechSwapFirst(whoLikesLesson.intro, whoLikesLesson.intro.topic, 'Who questions')
    expect(fixed.wrong).toMatch(/Who like/i)
    expect(fixed.wrong).not.toContain('Do you know how')
  })

  it('prefers learningPlan contrastPair for native speech swap when present', () => {
    const base = buildFallbackLessonIntro('politeness')
    const intro: typeof base = {
      ...base,
      learningPlan: {
        grammarFocus: base.learningPlan!.grammarFocus,
        firstPracticeGoal: base.learningPlan!.firstPracticeGoal,
        contrastPair: ['I am writing formally.', "I'm writing formally."],
      },
    }
    const tips = buildFallbackLessonExtraTips(intro)
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]

    expect(ex0?.wrong).toContain('I am writing formally')
    expect(ex0?.right).toContain("I'm writing formally")
  })

  it('ignores incoherent contrastPair (different meanings) and uses generic native swap', () => {
    const base = buildFallbackLessonIntro('I am / I am from')
    const intro: typeof base = {
      ...base,
      learningPlan: {
        grammarFocus: base.learningPlan!.grammarFocus,
        firstPracticeGoal: base.learningPlan!.firstPracticeGoal,
        contrastPair: ["I'm happy.", "I'm from Spain."],
      },
    }
    const tips = buildFallbackLessonExtraTips(intro)
    const ex0 = tips.cards.find((card) => card.category === 'native_speech')?.examples[0]

    expect(ex0?.wrong).not.toBe("I'm happy.")
    expect(ex0?.wrong).toMatch(/I am happy|I am fine|I would like to practice this pattern/i)
  })

  it('builds russian traps fallback as calque and self-check tips', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const russianTraps = tips.cards.find((card) => card.category === 'russian_traps')

    expect(russianTraps?.rule).toContain('английский шаблон')
    expect(russianTraps?.examples).toHaveLength(3)
    expect(russianTraps?.examples[0].note).toContain('русскому шаблону')
    expect(russianTraps?.examples[1].right).toMatch(/Who likes|It's time to/i)
    expect(russianTraps?.examples[1].note).toMatch(/Потому что/i)
  })

  it('builds questions mistakes fallback as wrong-right and quick fix blocks', () => {
    const tips = buildFallbackLessonExtraTips(intro)
    const questions = tips.cards.find((card) => card.category === 'questions_negatives')

    expect(questions?.title).toBe('Где ошибаются')
    expect(questions?.rule).toContain('русский порядок')
    expect(questions?.examples[0].wrong).toContain('✗')
    expect(questions?.examples[0].right).toContain('✓')
    expect(questions?.examples[1].right).toMatch(/\?/)
    expect(questions?.examples[1].right).not.toContain('Use "')
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
    expect(context?.examples[1].note).toMatch(/Если|если/)
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
    expect(buildTipsStorageKey({ lessonKey: 'lesson-1:variant-a', audience: 'adult', level: 'a2' })).toBe(
      'tips_v16_adult_a2_lesson_1_variant_a'
    )
    expect(buildTipsStorageKey({ lessonKey: 'lesson-1:variant-a', audience: 'child', level: 'a2' })).toBe(
      'tips_v16_child_a2_lesson_1_variant_a'
    )
  })

  it('accepts only versioned generated cache entries', () => {
    const cached = toCachedLessonExtraTips(buildFallbackLessonExtraTips(intro), true, 123)

    expect(isValidCachedLessonExtraTips(cached)).toBe(true)
    expect(isValidCachedLessonExtraTips({ ...cached, generated: 'yes' })).toBe(false)
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

  it('treats near-identical tip sets as too similar for refresh', () => {
    const current = buildFallbackLessonExtraTips(intro)
    const next = buildFallbackLessonExtraTips(intro)

    expect(areTipsTooSimilar(current, next)).toBe(true)
  })

  it('allows refresh when at least several cards meaningfully change', () => {
    const current = buildFallbackLessonExtraTips(intro)
    const next = {
      ...current,
      cards: current.cards.map((card, index) =>
        index < 3
          ? {
              ...card,
              rule: `${card.rule} Новый угол ${index + 1}.`,
              examples: card.examples.map((example, exampleIndex) =>
                exampleIndex === 0
                  ? {
                      ...example,
                      right: `${example.right} changed ${index + 1}`,
                    }
                  : example
              ),
            }
          : card
      ),
    }

    expect(areTipsTooSimilar(current, next)).toBe(false)
  })
})
