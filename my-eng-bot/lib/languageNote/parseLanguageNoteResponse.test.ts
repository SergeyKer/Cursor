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
})
