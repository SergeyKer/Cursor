import { describe, expect, it } from 'vitest'
import {
  buildMicroStrongFinaleText,
  microFinaleRememberPrefix,
  pickMicroFinaleAskMore,
  pickTutorIdleBullets,
  pickTutorIdleExamples,
  TUTOR_CHAT_COPY,
  tutorComposerPlaceholder,
} from '@/lib/uiCopy/tutorChat'

describe('TUTOR_CHAT_COPY', () => {
  it('has required chip and card stubs', () => {
    expect(TUTOR_CHAT_COPY.panelTitle).toBe('Репетитор')
    expect(TUTOR_CHAT_COPY.closeAriaLabel).toBe('Закрыть')
    expect(TUTOR_CHAT_COPY.closeTitle).toBe('Закрыть')
    expect(TUTOR_CHAT_COPY.chipMicro).toContain('2 мин')
    expect(TUTOR_CHAT_COPY.chipDone).toBe('Готово')
    expect(TUTOR_CHAT_COPY.chipAgain).toBe('Повторить проверку')
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
    const gateLines = [
      TUTOR_CHAT_COPY.outOfScopeFallback,
      TUTOR_CHAT_COPY.gateHomeworkDump,
      TUTOR_CHAT_COPY.gateInsultTeach,
      TUTOR_CHAT_COPY.gateEntertainment,
      TUTOR_CHAT_COPY.gatePersonaMeta,
      TUTOR_CHAT_COPY.gateProductParent,
      TUTOR_CHAT_COPY.clarifyDefault,
      TUTOR_CHAT_COPY.gateSoftNext,
      TUTOR_CHAT_COPY.photoReject,
      TUTOR_CHAT_COPY.photoBlur,
    ]
    for (const line of gateLines) {
      expect(line).not.toContain('мне не нужно')
      expect(line).not.toMatch(/[—–]/)
    }
    expect(TUTOR_CHAT_COPY.loadingMicro).toContain('проверку')
    expect(TUTOR_CHAT_COPY.microUnsuitable.length).toBeGreaterThan(10)
    expect(TUTOR_CHAT_COPY.cheatsheetUnavailable).not.toContain('Закрепи 2 мин')
    expect(TUTOR_CHAT_COPY.triagePickAngle('глаголы')).toContain('глаголы')
    expect(TUTOR_CHAT_COPY.photoReject).toContain('английскому')
  })

  it('has idle menu bullet bank and example bank', () => {
    expect(TUTOR_CHAT_COPY.idleBulletBank).toHaveLength(30)
    expect(new Set(TUTOR_CHAT_COPY.idleBulletBank).size).toBe(30)
    expect(TUTOR_CHAT_COPY.idleExampleBank.length).toBeGreaterThanOrEqual(3)
    expect(TUTOR_CHAT_COPY.idleExamplesHeading.length).toBeGreaterThan(5)
    expect(TUTOR_CHAT_COPY.idleExamplesHeading).toBe('Часто спрашивают')
    for (const line of TUTOR_CHAT_COPY.idleBulletBank) {
      expect(line).not.toMatch(/[—–]/)
    }
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

  it('picks three idle bullets stably for a seed', () => {
    const a = pickTutorIdleBullets(3, 42)
    const b = pickTutorIdleBullets(3, 42)
    expect(a).toEqual(b)
    expect(a).toHaveLength(3)
    expect(new Set(a).size).toBe(3)
  })

  it('builds micro finale copy by score', () => {
    expect(TUTOR_CHAT_COPY.microFinaleStrong(4, 5)).toBe('4 из 5 - отлично!')
    expect(TUTOR_CHAT_COPY.microFinaleAskMoreAdult).toHaveLength(10)
    expect(TUTOR_CHAT_COPY.microFinaleAskMoreChild).toHaveLength(10)
    expect(new Set(TUTOR_CHAT_COPY.microFinaleAskMoreAdult).size).toBe(10)
    expect(new Set(TUTOR_CHAT_COPY.microFinaleAskMoreChild).size).toBe(10)
    expect(TUTOR_CHAT_COPY.microFinaleMid(2, 5)).toContain('пробелы')
    expect(TUTOR_CHAT_COPY.microFinaleWeak(0, 5)).toContain('сложная')
    expect(TUTOR_CHAT_COPY.microFinaleMid(2, 5)).toContain(' - ')
    expect(TUTOR_CHAT_COPY.microFinaleWeak(0, 5)).toContain(' - ')
  })

  it('remember prefix matches audience', () => {
    expect(microFinaleRememberPrefix('child')).toBe('Запомни:')
    expect(microFinaleRememberPrefix('adult')).toBe('Запомните:')
    expect(microFinaleRememberPrefix()).toBe('Запомните:')
  })

  it('picks ask-more CTA stably by seed and audience', () => {
    const adultA = pickMicroFinaleAskMore('adult', 7)
    const adultB = pickMicroFinaleAskMore('adult', 7)
    expect(adultA).toBe(adultB)
    expect(TUTOR_CHAT_COPY.microFinaleAskMoreAdult).toContain(adultA)
    const child = pickMicroFinaleAskMore('child', 7)
    expect(TUTOR_CHAT_COPY.microFinaleAskMoreChild).toContain(child)
    expect(child).toMatch(/спрашивай|пиши|спроси|Напиши|Захочешь/)
  })

  it('builds strong micro finale with remember then ask-more', () => {
    const remember =
      'Сколько объектов – столько и глаголов: «are» для множественного, «is» для единственного.'
    const text = buildMicroStrongFinaleText({
      correct: 3,
      total: 3,
      audience: 'adult',
      rememberRu: remember,
      seed: 11,
    })
    const askMore = pickMicroFinaleAskMore('adult', 11)
    expect(text).toBe(`3 из 3 - отлично!\nЗапомните: ${remember}\n\n${askMore}`)
    expect(
      buildMicroStrongFinaleText({
        correct: 3,
        total: 3,
        audience: 'child',
        rememberRu: remember,
        seed: 11,
      })
    ).toContain('Запомни:')
  })

  it('builds strong micro finale without remember with blank line before CTA', () => {
    const askMore = pickMicroFinaleAskMore('adult', 3)
    expect(
      buildMicroStrongFinaleText({ correct: 3, total: 3, audience: 'adult', seed: 3 })
    ).toBe(`3 из 3 - отлично!\n\n${askMore}`)
  })
})
