import { describe, expect, it } from 'vitest'
import { parseLanguageNoteResponse } from '@/lib/languageNote/parseLanguageNoteResponse'

describe('parseLanguageNoteResponse', () => {
  it('parses fenced JSON and caps reviewTopics', () => {
    const topics = Array.from({ length: 5 }, (_, i) => ({
      id: `t-${i}`,
      title: `Topic ${i}`,
    }))
    const raw = `\`\`\`json
${JSON.stringify({
  status: 'needs_fix',
  original: 'I like drive byke',
  correct: 'I like riding a bike.',
  correctHighlights: ['riding', 'a bike'],
  correctReasons: ['После like обычно нужен -ing: like riding.'],
  better: null,
  betterHighlights: [],
  betterReasons: [],
  betterAlternatives: [],
  reviewTopics: topics,
  lessonId: null,
})}
\`\`\``
    const note = parseLanguageNoteResponse(raw, 'I like drive byke')
    expect(note).not.toBeNull()
    expect(note!.reviewTopics).toHaveLength(3)
    expect(note!.correct).toBe('I like riding a bike.')
  })

  it('keeps bilingual reviewTopic titles up to 56 chars', () => {
    const title = 'I like + -ing — люблю делать что-то интересное'
    expect(title.length).toBeGreaterThan(40)
    expect(title.length).toBeLessThanOrEqual(56)
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'I liking fish',
        correct: 'I like eating fish.',
        correctHighlights: ['like'],
        correctReasons: ['После I нужна форма like.'],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [{ id: 'like-ing', title }],
        lessonId: null,
      }),
      'I liking fish'
    )
    expect(note).not.toBeNull()
    expect(note!.reviewTopics).toEqual([{ id: 'like-ing', title }])
  })

  it('nulls unknown lessonId and drops missing highlights', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'hi',
        correct: 'Hello there.',
        correctHighlights: ['Hello', 'missing'],
        correctReasons: ['Это естественное приветствие для начала разговора.'],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: 'not-a-real-lesson',
      }),
      'hi'
    )
    expect(note!.lessonId).toBeNull()
    expect(note!.correctHighlights).toEqual(['Hello'])
  })

  it('nulls better when equal to correct without alternatives', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_better',
        original: 'I like hear music',
        correct: 'I like listening to music.',
        correctHighlights: ['listening'],
        correctReasons: ['После like обычно нужен -ing: like listening.'],
        better: 'I like listening to music.',
        betterHighlights: [],
        betterReasons: ['Так звучит более правильно и естественно.'],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'I like hear music'
    )
    expect(note!.better).toBeNull()
    expect(note!.betterReasons).toEqual([])
  })

  it('drops junk reasons and keeps concrete ones', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'I like drive byke',
        correct: 'I like riding a bike.',
        correctHighlights: [],
        correctReasons: [
          'Так звучит более правильно и естественно.',
          'После like обычно нужен -ing: like riding.',
          'x',
        ],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'I like drive byke'
    )
    expect(note!.correctReasons).toEqual(['После like обычно нужен -ing: like riding.'])
  })

  it('capitalizes and ends corrected sentences with a period', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'my cat have drink many milk',
        correct: 'my cat has drunk a lot of milk',
        correctHighlights: ['cat', 'a lot of'],
        correctReasons: [
          'have → has: для единственного числа нужна форма has.',
          'drink → drunk: нужна форма drunk.',
          'many → a lot of: в данном контексте лучше a lot of.',
        ],
        better: 'my cat drinks a lot of milk',
        betterHighlights: ['drinks'],
        betterReasons: ['В разговоре чаще present simple: drinks.'],
        betterAlternatives: ['my cat has lots of milk'],
        reviewTopics: [],
        lessonId: null,
      }),
      'my cat have drink many milk'
    )
    expect(note!.correct).toBe('My cat has drunk a lot of milk.')
    expect(note!.better).toBe('My cat drinks a lot of milk.')
    expect(note!.betterAlternatives).toEqual(['My cat has lots of milk.'])
    // Unchanged "cat" must not stay bold; keep real changes / arrow targets.
    expect(note!.correctHighlights).not.toContain('cat')
    expect(note!.correctHighlights).toEqual(
      expect.arrayContaining(['has', 'drunk', 'a lot of'])
    )
  })

  it('drops unchanged context words from highlights', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'my cat have drink many milk from cup',
        correct: 'My cat has drunk a lot of milk from a cup.',
        correctHighlights: ['cat', 'from', 'has', 'drunk'],
        correctReasons: [
          'have → has: нужна форма has.',
          'drink → drunk: нужна форма drunk.',
        ],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'my cat have drink many milk from cup'
    )
    expect(note!.correctHighlights).toEqual(['has', 'drunk'])
  })

  it('keeps question mark endings', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'where you go',
        correct: 'where are you going?',
        correctHighlights: ['are'],
        correctReasons: ['В вопросе нужен вспомогательный глагол are.'],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'where you go'
    )
    expect(note!.correct).toBe('Where are you going?')
  })

  it('drops long alternative walls on long sentences', () => {
    const longCorrect =
      'My cat has drunk a lot of milk from the cup on my table and she lies on the floor with a fat stomach.'
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_better',
        original: 'my cat have drink many milk from cup at from my table and she lie at floor whith fat stomak',
        correct: longCorrect,
        correctHighlights: [],
        correctReasons: ['have → has: для единственного числа нужна форма has.'],
        better:
          'My cat drinks a lot of milk from the cup on my table and lies on the floor with a fat tummy.',
        betterHighlights: [],
        betterReasons: ['В разговоре чаще present simple.'],
        betterAlternatives: [
          'My cat has a lot of milk from the cup on my table and lies on the floor with a big belly.',
        ],
        reviewTopics: [],
        lessonId: null,
      }),
      'my cat have drink many milk'
    )
    expect(note!.better).toMatch(/^My cat drinks/)
    expect(note!.betterAlternatives).toEqual([])
    expect(note!.betterReasons).toHaveLength(1)
  })

  it('returns null on invalid payload', () => {
    expect(parseLanguageNoteResponse('not json', 'hi')).toBeNull()
    expect(parseLanguageNoteResponse(JSON.stringify({ status: 'needs_fix' }), 'hi')).toBeNull()
  })

  it('drops dry English and punctuation lesson reasons', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'Hello How are you What are you do now',
        correct: 'Hello. How are you? What are you doing now?',
        correctHighlights: ['doing'],
        correctReasons: [
          "Added a period after 'Hello' for clear separation.",
          "Changed 'do' to 'doing' for correct form.",
          'Сейчас в процессе — нужна форма -ing: do → doing.',
          'Added question marks for questions.',
        ],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [{ id: 'wh-words', title: 'вопросительные слова' }],
        lessonId: null,
      }),
      'Hello How are you What are you do now'
    )
    expect(note!.status).toBe('needs_fix')
    expect(note!.correctReasons).toEqual([
      'Сейчас в процессе — нужна форма -ing: do → doing.',
    ])
    expect(note!.correctHighlights).toEqual(['doing'])
  })

  it('forces already_good when only punctuation differs', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'Hello How are you',
        correct: 'Hello. How are you?',
        correctHighlights: [],
        correctReasons: [
          'Added a period after Hello for clear separation.',
          'Added question marks for questions.',
        ],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [{ id: 'punctuation', title: 'знаки' }],
        lessonId: null,
      }),
      'Hello How are you'
    )
    expect(note!.status).toBe('already_good')
    expect(note!.correctReasons).toEqual(['Здорово — мысль ясна, так и оставляем.'])
    expect(note!.reviewTopics).toEqual([])
    expect(note!.better).toBeNull()
  })

  it('keeps needs_fix with soft fallback when word diff remains but reasons were junk', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'What are you do now',
        correct: 'What are you doing now?',
        correctHighlights: [],
        correctReasons: [
          "Use 'doing' for present continuous.",
          'Added question marks for questions.',
        ],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'What are you do now'
    )
    expect(note!.status).toBe('needs_fix')
    expect(note!.correctReasons).toEqual(['Вот аккуратный вариант без сбоев в грамматике.'])
  })

  it('allows tutor reasons up to 140 characters', () => {
    const longReason =
      'Сейчас действие в процессе — поэтому после are нужна форма -ing: do → doing, и так фраза звучит естественно в разговоре.'
    expect(longReason.length).toBeGreaterThan(110)
    expect(longReason.length).toBeLessThanOrEqual(140)
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'What are you do now',
        correct: 'What are you doing now?',
        correctHighlights: ['doing'],
        correctReasons: [longReason],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'What are you do now'
    )
    expect(note!.correctReasons).toEqual([longReason])
  })

  it('rejects Russian-only correct in En/Mix target', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_fix',
        original: 'превет как your doings',
        correct: 'Привет! Как дела?',
        correctHighlights: [],
        correctReasons: ['Привет — правильное приветствие на русском.'],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'превет как your doings',
      { voiceMode: 'mix', correctTarget: 'en' }
    )
    expect(note).toBeNull()
  })

  it('accepts English correct for Mix and stores voiceMode', () => {
    const note = parseLanguageNoteResponse(
      JSON.stringify({
        status: 'needs_better',
        original: 'превет как your doings',
        correct: 'Hi! How are you doing?',
        correctHighlights: ['doing'],
        correctReasons: ['Смысл — приветствие; doings → doing.'],
        better: 'Hi! How are you?',
        betterHighlights: [],
        betterReasons: ['Короче для разговора.'],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
      }),
      'превет как your doings',
      { voiceMode: 'mix', correctTarget: 'en' }
    )
    expect(note).not.toBeNull()
    expect(note!.correct).toBe('Hi! How are you doing?')
    expect(note!.better).toBe('Hi! How are you?')
    expect(note!.voiceMode).toBe('mix')
    expect(note!.correctTarget).toBe('en')
  })
})
