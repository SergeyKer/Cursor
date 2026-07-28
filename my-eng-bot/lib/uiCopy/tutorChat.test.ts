import { describe, expect, it } from 'vitest'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

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
})
