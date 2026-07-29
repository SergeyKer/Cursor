import { describe, expect, it } from 'vitest'
import { pickTutorIdleExamples, TUTOR_CHAT_COPY, tutorComposerPlaceholder } from '@/lib/uiCopy/tutorChat'

describe('TUTOR_CHAT_COPY', () => {
  it('has required chip and card stubs', () => {
    expect(TUTOR_CHAT_COPY.panelTitle).toBe('Репетитор')
    expect(TUTOR_CHAT_COPY.chipMicro).toContain('2 мин')
    expect(TUTOR_CHAT_COPY.chipOtherQuestion).toBe('Другой вопрос')
    expect(TUTOR_CHAT_COPY.chipDone).toBe('Готово')
    expect(TUTOR_CHAT_COPY.chipCheatsheet).toBe('Шпаргалка')
    expect(TUTOR_CHAT_COPY.cardSectionTitle).toBe('Репетитор')
    expect(TUTOR_CHAT_COPY.cardButtonAsk).toBe('Спросить')
    expect(TUTOR_CHAT_COPY.cheatsheetMissing.length).toBeGreaterThan(10)
  })

  it('has idle menu bullets and example bank', () => {
    expect(TUTOR_CHAT_COPY.idleBullets).toHaveLength(5)
    expect(TUTOR_CHAT_COPY.idleExampleBank.length).toBeGreaterThanOrEqual(3)
    expect(TUTOR_CHAT_COPY.idleExamplesHeading.length).toBeGreaterThan(5)
  })

  it('composer placeholder matches audience', () => {
    expect(tutorComposerPlaceholder('child')).toBe('Спроси…')
    expect(tutorComposerPlaceholder('adult')).toBe('Спросите…')
  })

  it('picks three idle examples stably for a seed', () => {
    const a = pickTutorIdleExamples(3, 42)
    const b = pickTutorIdleExamples(3, 42)
    expect(a).toEqual(b)
    expect(a).toHaveLength(3)
  })
})
