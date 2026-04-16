import { describe, expect, it } from 'vitest'
import { allowsLikeLoveEquivalence, isNarrowPetAffectionRu } from './translationLikeLoveContext'

describe('allowsLikeLoveEquivalence', () => {
  it('is true for family RU', () => {
    expect(allowsLikeLoveEquivalence('Я люблю маму.', 'I like my mom.')).toBe(true)
  })

  it('is true for family hint in English gold', () => {
    expect(allowsLikeLoveEquivalence('Переведи.', 'I like my brother.')).toBe(true)
  })

  it('is true for pet + narrow affection RU', () => {
    expect(allowsLikeLoveEquivalence('Я обожаю свою кошку.', 'I like my cat.')).toBe(true)
  })

  it('is false for pet mention without affection verb in RU', () => {
    expect(allowsLikeLoveEquivalence('У меня есть собака.', 'I like my dog.')).toBe(false)
  })

  it('is false for trips', () => {
    expect(allowsLikeLoveEquivalence('Я люблю поездки.', 'I like trips.')).toBe(false)
  })
})

describe('isNarrowPetAffectionRu', () => {
  it('detects люблю with pet', () => {
    expect(isNarrowPetAffectionRu('Я люблю свою собаку.')).toBe(true)
  })

  it('false without pet words', () => {
    expect(isNarrowPetAffectionRu('Я люблю поездки.')).toBe(false)
  })
})
