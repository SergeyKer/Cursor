import { describe, expect, it } from 'vitest'
import { hasCommunicationEnglishAttempt } from './englishAttempt'

describe('hasCommunicationEnglishAttempt', () => {
  it('rejects empty and pure Russian', () => {
    expect(hasCommunicationEnglishAttempt('')).toBe(false)
    expect(hasCommunicationEnglishAttempt('привет')).toBe(false)
    expect(hasCommunicationEnglishAttempt('Расскажи про Кремль')).toBe(false)
    expect(hasCommunicationEnglishAttempt('да')).toBe(false)
    expect(hasCommunicationEnglishAttempt('Подробнее')).toBe(false)
    expect(hasCommunicationEnglishAttempt('переведи привет')).toBe(false)
  })

  it('accepts mix with I/we and real English words', () => {
    expect(hasCommunicationEnglishAttempt('I люблю маму')).toBe(true)
    expect(hasCommunicationEnglishAttempt("I'm устал")).toBe(true)
    expect(hasCommunicationEnglishAttempt('towers пожалуйста')).toBe(true)
    expect(hasCommunicationEnglishAttempt('I want towers')).toBe(true)
    expect(hasCommunicationEnglishAttempt('football')).toBe(true)
  })

  it('rejects cheap Latin plus a Russian novel', () => {
    expect(hasCommunicationEnglishAttempt('ok расскажи про Кремль подробно')).toBe(false)
    expect(hasCommunicationEnglishAttempt('yes давай про башни')).toBe(false)
    expect(hasCommunicationEnglishAttempt('the расскажи про Кремль')).toBe(false)
    expect(hasCommunicationEnglishAttempt('hi')).toBe(false)
    expect(hasCommunicationEnglishAttempt('yes')).toBe(false)
  })
})
