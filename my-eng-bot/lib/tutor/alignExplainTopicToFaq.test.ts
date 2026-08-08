import { describe, expect, it } from 'vitest'
import { alignExplainTopicToFaq } from '@/lib/tutor/alignExplainTopicToFaq'
import { buildTutorFollowUpChip } from '@/lib/tutor/buildFollowUpPlaceholder'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { FOLLOW_UP_CHIP_BANK } from '@/lib/uiCopy/tutorChat'

function baseAnswer(canonicalKey: string): TutorExplainAnswer {
  return {
    answerKind: 'contrast',
    title: 'Почему «people are», а не «people is»?',
    paragraphs: ['People — множественное.'],
    examplesEn: ['People are happy.', 'A person is happy.'],
    rememberRu: 'People всегда с are',
    topicAnchor: { title: 'people', canonicalKey },
    cheatsheetVisibility: 'primary',
  }
}

describe('alignExplainTopicToFaq', () => {
  it('rewrites LLM people_are key to plurals on FAQ hit', () => {
    const answer = baseAnswer('people_are')
    const aligned = alignExplainTopicToFaq({
      answer,
      query: 'Почему «people are», а не «people is»?',
      level: 'a1',
    })
    expect(aligned.topicAnchor.canonicalKey).toBe('plurals')
    expect(aligned.topicAnchor.title).toBe('people')
  })

  it('is no-op when already on FAQ topicKey', () => {
    const answer = baseAnswer('plurals')
    const aligned = alignExplainTopicToFaq({
      answer,
      query: 'Почему «people are», а не «people is»?',
      level: 'a1',
    })
    expect(aligned).toBe(answer)
  })

  it('leaves free-text miss unchanged', () => {
    const answer = baseAnswer('weird_llm_key')
    const aligned = alignExplainTopicToFaq({
      answer,
      query: 'Explain quantum physics in English please',
      level: 'a2',
    })
    expect(aligned).toBe(answer)
    expect(aligned.topicAnchor.canonicalKey).toBe('weird_llm_key')
  })

  it('after align, hop1 chip is on-topic sibling not exit', () => {
    const query = 'Почему «people are», а не «people is»?'
    const aligned = alignExplainTopicToFaq({
      answer: baseAnswer('people_are'),
      query,
      level: 'a1',
    })
    const chip = buildTutorFollowUpChip({
      answer: aligned,
      level: 'a1',
      excludeQuestionRu: query,
    })
    expect(chip).toBeTruthy()
    expect(chip).not.toBe(FOLLOW_UP_CHIP_BANK.exit)
    expect(chip!.toLowerCase()).toMatch(/news|information|people|plur|are|is|mice|children|pair/i)
  })
})
