import { describe, expect, it } from 'vitest'
import {
  buildPoliteTopicClarificationReply,
  detectFreeTalkTopicChange,
  detectTopicClarificationFollowupChoice,
  isFixedTopicSwitchRequest,
  isPoliteTopicClarificationAssistantMessage,
  looksLikeFreeTalkTopicSwitchIntent,
} from './freeTalkTopicChange'

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

  it('дальше / давай дальше / другой вопрос — как скучно', () => {
    expect(detectFreeTalkTopicChange('дальше')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
    expect(detectFreeTalkTopicChange('давай дальше')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
    expect(detectFreeTalkTopicChange('другой вопрос')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
  })

  it('англ. короткие фразы — как bored', () => {
    expect(detectFreeTalkTopicChange('next')).toEqual({
      isTopicChange: true,
      topicHintText: null,
      needsClarification: true,
    })
    expect(detectFreeTalkTopicChange('another question')).toEqual({
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

describe('buildPoliteTopicClarificationReply', () => {
  it('child: нумерация 1–3 и подсказка про цифры', () => {
    const s = buildPoliteTopicClarificationReply('child')
    expect(s).toContain('1) New topic')
    expect(s).toContain('2) Same topic')
    expect(s).toContain('3) A new question')
    expect(s).toContain('Say 1, 2, or 3')
  })

  it('adult: нумерация 1–3', () => {
    const s = buildPoliteTopicClarificationReply('adult')
    expect(s).toContain('1) Switch to a new topic')
    expect(s).toContain('2) Continue this topic')
    expect(s).toContain('3) Ask for a new question on this topic')
    expect(s).toContain('Reply with 1, 2, or 3')
  })
})

describe('isPoliteTopicClarificationAssistantMessage', () => {
  it('узнаёт новый и старый текст', () => {
    expect(isPoliteTopicClarificationAssistantMessage(buildPoliteTopicClarificationReply('child'))).toBe(true)
    expect(
      isPoliteTopicClarificationAssistantMessage(
        'Tell me more, please.\nNew topic? Or the same?'
      )
    ).toBe(true)
    expect(isPoliteTopicClarificationAssistantMessage('What is your name?')).toBe(false)
  })
})

describe('detectTopicClarificationFollowupChoice', () => {
  it('цифры 1, 2, 3', () => {
    expect(detectTopicClarificationFollowupChoice('1')).toBe('new_topic')
    expect(detectTopicClarificationFollowupChoice('2')).toBe('continue')
    expect(detectTopicClarificationFollowupChoice('3')).toBe('new_question')
    expect(detectTopicClarificationFollowupChoice('1.')).toBe('new_topic')
    expect(detectTopicClarificationFollowupChoice('2)')).toBe('continue')
    expect(detectTopicClarificationFollowupChoice('3!')).toBe('new_question')
  })

  it('new question — en/ru и смесь', () => {
    expect(detectTopicClarificationFollowupChoice('new question')).toBe('new_question')
    expect(detectTopicClarificationFollowupChoice('new вопрос')).toBe('new_question')
    expect(detectTopicClarificationFollowupChoice('новый вопрос')).toBe('new_question')
    expect(detectTopicClarificationFollowupChoice('другой вопрос')).toBe('new_question')
  })

  it('continue', () => {
    expect(detectTopicClarificationFollowupChoice('same')).toBe('continue')
    expect(detectTopicClarificationFollowupChoice('the same topic')).toBe('continue')
    expect(detectTopicClarificationFollowupChoice('continue')).toBe('continue')
  })

  it('new topic', () => {
    expect(detectTopicClarificationFollowupChoice('new topic')).toBe('new_topic')
    expect(detectTopicClarificationFollowupChoice('new')).toBe('new_topic')
  })

  it('не угадывает обычную фразу', () => {
    expect(detectTopicClarificationFollowupChoice('I like cats')).toBe(null)
  })
})
