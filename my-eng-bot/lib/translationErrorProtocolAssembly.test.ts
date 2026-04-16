import { describe, expect, it } from 'vitest'
import { ensureTranslationProtocolBlocks } from '@/lib/ensureTranslationProtocolBlocks'

describe('ensureTranslationProtocolBlocks', () => {
  it('подставляет Скажи из repeatEnglishFallback если модель забыла строку', () => {
    const content = [
      'Комментарий: Молодец, у тебя правильное использование I like.',
      'Комментарий_перевод: Хорошее начало.',
      'Ошибки:',
      '✏️ Исправь опечатку в последнем слове.',
    ].join('\n')

    const out = ensureTranslationProtocolBlocks(content, {
      tense: 'present_simple',
      topic: 'family',
      level: 'a1',
      audience: 'adult',
      fallbackPrompt: 'Я люблю проводить время с семьей.',
      userAnswerForSupportFallback: 'I like to spend time with familyh',
      repeatEnglishFallback: 'I love spending time with my family.',
    })

    expect(out).toMatch(/Скажи:\s*I love spending time with my family\./i)
    expect(out).not.toMatch(/Скажи:[^\n]*familyh/i)
  })
})
