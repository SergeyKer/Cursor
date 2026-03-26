import { describe, expect, it } from 'vitest'
import { normalizeDialogueEntityForTopic, stripLeadingAnswerVerbPhrases } from './dialogueEntityNormalization'

describe('normalizeDialogueEntityForTopic', () => {
  it('movies_series: нормализует "about ужасы" в "horror movies"', () => {
    expect(normalizeDialogueEntityForTopic('about ужасы', 'movies_series')).toBe('horror movies')
  })

  it('movies_series: нормализует "о комедиях" в "comedies"', () => {
    expect(normalizeDialogueEntityForTopic('о комедиях', 'movies_series')).toBe('comedies')
  })

  it('удаляет leading preposition в английской сущности', () => {
    expect(normalizeDialogueEntityForTopic('about cats', 'hobbies')).toBe('cats')
  })

  it('снимает past tense хвост у сущности ответа', () => {
    expect(stripLeadingAnswerVerbPhrases('watched Terminator')).toBe('Terminator')
    expect(stripLeadingAnswerVerbPhrases('listened to music')).toBe('music')
  })

  it('movies_series: убирает generic media lead-in у названия', () => {
    expect(normalizeDialogueEntityForTopic('the movie Terminator', 'movies_series')).toBe('Terminator')
    expect(normalizeDialogueEntityForTopic('TV show Friends', 'movies_series')).toBe('Friends')
  })

  it('movies_series: сохраняет жанровые сущности', () => {
    expect(normalizeDialogueEntityForTopic('horror movies', 'movies_series')).toBe('horror movies')
  })

  it('не пропускает кириллицу для не movies_series топиков', () => {
    expect(normalizeDialogueEntityForTopic('о реках', 'travel')).toBeNull()
  })
})
