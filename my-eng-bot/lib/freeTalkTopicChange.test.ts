import { describe, expect, it } from 'vitest'
import { detectFreeTalkTopicChange, isFixedTopicSwitchRequest, looksLikeFreeTalkTopicSwitchIntent } from './freeTalkTopicChange'

describe('detectFreeTalkTopicChange', () => {
  it('распознаёт явную смену темы на русском с темой', () => {
    expect(detectFreeTalkTopicChange('давай поговорим о реке')).toEqual({
      isTopicChange: true,
      topicHintText: 'реке',
      needsClarification: false,
    })
  })

  it('распознаёт явную смену темы на английском с темой', () => {
    expect(detectFreeTalkTopicChange("let's talk about cats")).toEqual({
      isTopicChange: true,
      topicHintText: 'cats',
      needsClarification: false,
    })
  })

  it('распознаёт generic switch без темы', () => {
    expect(detectFreeTalkTopicChange('другая тема')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
  })

  it('не распознаёт короткий keyword-only запрос без явной команды', () => {
    expect(detectFreeTalkTopicChange('river')).toEqual({
      isTopicChange: false,
      topicHintText: null,
      needsClarification: false,
    })
  })

  it('не срабатывает на обычный ответ ученика', () => {
    expect(detectFreeTalkTopicChange('I will swim in the river tomorrow.')).toEqual({
      isTopicChange: false,
      topicHintText: null,
      needsClarification: false,
    })
  })

  it('давай сменим тему на небо — хвост темы', () => {
    expect(detectFreeTalkTopicChange('давай сменим тему на небо')).toEqual({
      isTopicChange: true,
      topicHintText: 'небо',
      needsClarification: false,
    })
  })

  it('хочу про реку — детская формулировка', () => {
    expect(detectFreeTalkTopicChange('хочу про реку')).toEqual({
      isTopicChange: true,
      topicHintText: 'реку',
      needsClarification: false,
    })
  })

  it('lets change topic to sky', () => {
    expect(detectFreeTalkTopicChange('lets change topic to sky')).toEqual({
      isTopicChange: true,
      topicHintText: 'sky',
      needsClarification: false,
    })
  })

  it('смесь ru + en: давай change topic', () => {
    expect(detectFreeTalkTopicChange('давай change topic').isTopicChange).toBe(true)
  })

  it('скучно — уточнение темы', () => {
    expect(detectFreeTalkTopicChange('скучно')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
  })

  it('i want to discuss movies — discuss без отдельного паттерна в EXPLICIT', () => {
    expect(detectFreeTalkTopicChange('i want to discuss movies')).toEqual({
      isTopicChange: true,
      topicHintText: 'movies',
      needsClarification: false,
    })
  })
})

describe('isFixedTopicSwitchRequest', () => {
  it('совпадает с detectFreeTalkTopicChange.isTopicChange', () => {
    expect(isFixedTopicSwitchRequest('давай поменяем тему на спорт')).toBe(true)
    expect(isFixedTopicSwitchRequest('can we change topic to sport?')).toBe(true)
    expect(isFixedTopicSwitchRequest('давай change topic')).toBe(true)
    expect(isFixedTopicSwitchRequest('I will watch The Simpsons next week.')).toBe(false)
  })
})

describe('looksLikeFreeTalkTopicSwitchIntent', () => {
  it('эквивалентно isTopicChange у detect', () => {
    expect(looksLikeFreeTalkTopicSwitchIntent('хочу про реку')).toBe(true)
    expect(looksLikeFreeTalkTopicSwitchIntent('I will swim tomorrow.')).toBe(false)
  })
})
