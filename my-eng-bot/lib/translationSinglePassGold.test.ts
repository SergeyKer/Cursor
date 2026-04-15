import { describe, expect, it } from 'vitest'
import {
  appendHiddenRefFromVisibleCue,
  appendPreservedHiddenRefFromOriginal,
} from '@/lib/translationSinglePassGold'
import { TRAN_CANONICAL_REPEAT_REF_MARKER } from '@/lib/translationPromptAndRef'

describe('appendPreservedHiddenRefFromOriginal', () => {
  it('дописывает __TRAN__ из сырого ответа после пересборки SUCCESS', () => {
    const original = [
      'Комментарий: Хорошо.',
      'Переведи далее: Я бегу.',
      'Переведи на английский.',
      `${TRAN_CANONICAL_REPEAT_REF_MARKER}: I run every day.`,
    ].join('\n')
    const rebuilt = [
      'Комментарий: Отлично, верно.',
      'Переведи далее: Я бегу.',
      'Переведи на английский.',
    ].join('\n')
    const out = appendPreservedHiddenRefFromOriginal(rebuilt, original, 'Я бегу.')
    expect(out).toContain(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)
    expect(out).toMatch(/I run/i)
  })

  it('не дублирует, если ref уже в пересобранном тексте', () => {
    const rebuilt = `x\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: I go.`
    const out = appendPreservedHiddenRefFromOriginal(rebuilt, `${TRAN_CANONICAL_REPEAT_REF_MARKER}: Other.`, 'Я иду.')
    expect(out.split(TRAN_CANONICAL_REPEAT_REF_MARKER).length - 1).toBe(1)
  })
})

describe('appendHiddenRefFromVisibleCue', () => {
  it('дописывает __TRAN__ из строки Скажи', () => {
    const text = [
      'Комментарий_перевод: Молодец.',
      'Ошибки:',
      '🔤 Ошибка времени.',
      'Скажи: I usually read books before bed.',
    ].join('\n')
    const out = appendHiddenRefFromVisibleCue(text, 'Я обычно читаю книги перед сном.')
    expect(out).toContain(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)
    expect(out).toMatch(/I usually read books before bed/i)
  })
})
