import { describe, expect, it } from 'vitest'
import { analyzeAccentAttempt, levenshteinDistance, normalizeAccentText } from '@/lib/accent/phoneticFeedback'
import { getAccentLessonById } from '@/lib/accent/soundCatalog'

describe('phoneticFeedback', () => {
  it('normalizes transcript text for local matching', () => {
    expect(normalizeAccentText("Think, THREE! Mother's")).toBe('think three mothers')
  })

  it('uses levenshtein for fuzzy word matching', () => {
    expect(levenshteinDistance('think', 'thnik')).toBe(2)
    expect(levenshteinDistance('thank', 'think')).toBe(1)
  })

  it('scores words locally and maps common TH substitutions', () => {
    const lesson = getAccentLessonById('th-think')
    expect(lesson).not.toBeNull()
    const feedback = analyzeAccentAttempt({
      lessonId: 'th-think',
      blockType: 'words',
      transcript: 'tank thin three truth mouth',
      expectedWords: ['thank', 'thin', 'three', 'truth', 'mouth'],
      knownSubstitutions: lesson?.knownSubstitutions ?? [],
    })

    expect(feedback.score).toBe(80)
    expect(feedback.wordMatches?.[0]).toMatchObject({ expected: 'thank', heard: 'tank', status: 'substitution' })
    expect(feedback.coachMessage).toContain('TH')
  })

  it('checks that both words in a minimal pair are present', () => {
    const lesson = getAccentLessonById('w-v-contrast')
    const feedback = analyzeAccentAttempt({
      lessonId: 'w-v-contrast',
      blockType: 'pairs',
      transcript: 'west vest wet vet wine',
      expectedPairs: [
        { target: 'west', contrast: 'vest' },
        { target: 'wet', contrast: 'vet' },
        { target: 'wine', contrast: 'vine' },
      ],
      knownSubstitutions: lesson?.knownSubstitutions ?? [],
    })

    expect(feedback.score).toBe(67)
    expect(feedback.pairMatches?.[2].status).toBe('missing_contrast')
  })

  it('finds the first break in a progressive chain', () => {
    const feedback = analyzeAccentAttempt({
      lessonId: 'r-river',
      blockType: 'progressive',
      transcript: 'river road runs',
      progressiveLines: ['river', 'river road', 'river road runs', 'river road runs around'],
      knownSubstitutions: [],
    })

    expect(feedback.score).toBe(75)
    expect(feedback.progressiveMatches?.[3]).toMatchObject({ lineNumber: 4, status: 'broken' })
    expect(feedback.coachMessage).toContain('Срыв начинается')
  })
})
