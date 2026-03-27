import { describe, expect, it } from 'vitest'
import { detectFreeTalkTopicChange, isFixedTopicSwitchRequest } from './freeTalkTopicChange'

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
})

describe('isFixedTopicSwitchRequest', () => {
  it('распознаёт запрос смены темы на русском', () => {
    expect(isFixedTopicSwitchRequest('давай поменяем тему на спорт')).toBe(true)
  })

  it('распознаёт запрос смены темы на английском', () => {
    expect(isFixedTopicSwitchRequest('can we change topic to sport?')).toBe(true)
  })

  it('распознаёт смешанный запрос смены темы', () => {
    expect(isFixedTopicSwitchRequest('давай change topic')).toBe(true)
  })

  it('не срабатывает на обычный ответ по теме', () => {
    expect(isFixedTopicSwitchRequest('I will watch The Simpsons next week.')).toBe(false)
  })
})
