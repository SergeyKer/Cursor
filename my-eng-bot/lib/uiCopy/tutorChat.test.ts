import { describe, expect, it } from 'vitest'
import { pickTutorIdleExamples, TUTOR_CHAT_COPY, tutorComposerPlaceholder } from '@/lib/uiCopy/tutorChat'

describe('TUTOR_CHAT_COPY', () => {
  it('has required chip and card stubs', () => {
    expect(TUTOR_CHAT_COPY.panelTitle).toBe('Репетитор')
    expect(TUTOR_CHAT_COPY.chipMicro).toContain('2 мин')
    expect(TUTOR_CHAT_COPY.chipDone).toBe('Готово')
    expect(TUTOR_CHAT_COPY.chipCheatsheet).toBe('Шпаргалка')
    expect(TUTOR_CHAT_COPY.cardSectionTitle).toBe('Репетитор')
    expect(TUTOR_CHAT_COPY.cardButtonAsk).toBe('Спросить')
    expect(TUTOR_CHAT_COPY.cheatsheetMissing).toContain('поле')
    expect(TUTOR_CHAT_COPY.outOfScopeFallback.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.gateHomeworkDump.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.gateInsultTeach.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.gateEntertainment.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.gatePersonaMeta.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.gateProductParent.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.triagePickGoal('Present Perfect')).toContain('Present Perfect')
    expect(TUTOR_CHAT_COPY.triagePickAngle('глаголы')).toContain('глаголы')
    expect(TUTOR_CHAT_COPY.photoReject).toContain('английскому')
  })

  it('has idle menu bullets and example bank', () => {
    expect(TUTOR_CHAT_COPY.idleBullets).toHaveLength(5)
    expect(TUTOR_CHAT_COPY.idleExampleBank.length).toBeGreaterThanOrEqual(3)
    expect(TUTOR_CHAT_COPY.idleExamplesHeading.length).toBeGreaterThan(5)
    expect(TUTOR_CHAT_COPY.idleExamplesHeading).toBe('Часто спрашивают')
  })

  it('has photo attach chooser copy', () => {
    expect(TUTOR_CHAT_COPY.photoTake).toBe('Сделать фото')
    expect(TUTOR_CHAT_COPY.photoPick).toBe('Выбрать из галереи')
    expect(TUTOR_CHAT_COPY.photoAttachCancel).toBe('Отмена')
    expect(TUTOR_CHAT_COPY.photoAttachMenuAria).toBe('Прикрепить фото')
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

  it('builds micro finale copy by score', () => {
    expect(TUTOR_CHAT_COPY.microFinaleStrong(4, 5)).toContain('4 из 5')
    expect(TUTOR_CHAT_COPY.microFinaleMid(2, 5)).toContain('пробелы')
    expect(TUTOR_CHAT_COPY.microFinaleWeak(0, 5)).toContain('сложная')
  })
})
