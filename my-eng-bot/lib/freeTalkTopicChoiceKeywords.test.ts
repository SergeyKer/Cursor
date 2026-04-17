import { describe, expect, it } from 'vitest'
import {
  buildFreeTalkTopicAnchorQuestion,
  buildFreeTalkTopicLabel,
} from './freeTalkQuestionAnchor'
import {
  buildFreeTalkTopicChoiceKeywordList,
  extractTopicChoiceKeywordsByLang,
} from './freeTalkTopicChoiceKeywords'

describe('buildFreeTalkTopicChoiceKeywordList', () => {
  it('убирает let\'s talk about и оставляет суть темы', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList("let's talk about ocean")
    expect(kw).toContain('ocean')
    expect(kw.join(' ')).not.toMatch(/\blets\b/i)
    expect(kw.join(' ')).not.toMatch(/let's/i)
  })

  it('обрабатывает lets без апострофа', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('lets talk about volcanoes')
    expect(kw).toContain('volcanoes')
    expect(kw.join(' ').toLowerCase()).not.toContain('lets')
  })

  it('не фильтрует валидные общие темы work/home/life', () => {
    expect(buildFreeTalkTopicChoiceKeywordList("let's talk about work")).toContain('work')
    expect(buildFreeTalkTopicChoiceKeywordList("let's talk about home")).toContain('home')
    expect(buildFreeTalkTopicChoiceKeywordList("let's talk about life")).toContain('life')
  })

  it('I want to talk about — хвост из детектора', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('I want to talk about space travel')
    expect(kw.some((w) => /space|travel/i.test(w))).toBe(true)
    expect(kw).not.toContain('want')
  })

  it('tell me about — снятие вводной без детектора', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('Tell me about ancient Rome')
    expect(kw.some((w) => /rome|ancient/i.test(w))).toBe(true)
  })

  it('расскажи о — вводная снята', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('расскажи о море')
    expect(kw).toContain('sea')
  })

  it('неявная тема одним словом', () => {
    expect(buildFreeTalkTopicChoiceKeywordList('ocean')).toEqual(['ocean'])
    expect(buildFreeTalkTopicChoiceKeywordList('океан')).toEqual(['ocean'])
  })

  it('явная смена без названия темы — не подменяем весь текст пустым', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('другая тема')
    expect(Array.isArray(kw)).toBe(true)
  })

  it('RU: давай поговорим о — хвост из детектора', () => {
    const kw = buildFreeTalkTopicChoiceKeywordList('давай поговорим о реке')
    expect(kw).toContain('river')
  })

  it('пустая строка', () => {
    expect(buildFreeTalkTopicChoiceKeywordList('   ')).toEqual([])
  })

  it('якорный вопрос не содержит артефакта lets+ocean', () => {
    const keywords = buildFreeTalkTopicChoiceKeywordList("let's talk about ocean")
    const label = buildFreeTalkTopicLabel(keywords)
    const q = buildFreeTalkTopicAnchorQuestion({
      keywords,
      topicLabel: label,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'regression-ocean',
    })
    expect(q.toLowerCase()).toContain('ocean')
    expect(q).not.toMatch(/let'?s\s+ocean/i)
    expect(q).not.toMatch(/\blets\s+ocean\b/i)
  })
})

describe('extractTopicChoiceKeywordsByLang', () => {
  it('фильтрует служебные EN токены', () => {
    const { en } = extractTopicChoiceKeywordsByLang('the ocean and the sky')
    expect(en).toContain('ocean')
    expect(en).toContain('sky')
    expect(en).not.toContain('the')
  })
})
