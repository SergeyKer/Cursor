import { describe, expect, it } from 'vitest'
import { normalizeDialogueEntityForTopic } from './dialogueEntityNormalization'

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

  it('не пропускает кириллицу для не movies_series топиков', () => {
    expect(normalizeDialogueEntityForTopic('о реках', 'travel')).toBeNull()
  })
})
