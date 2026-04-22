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

  it('нейтрализует ложную похвалу за question form при утвердительном русском задании и не меняет Скажи', () => {
    const content = [
      'Комментарий_перевод: Ты правильно использовал "do you like" для вопроса.',
      'Ошибки:',
      '- "велосипед" → "bicycle" (переведи)',
      '- "rite" → "riding" (опечатка)',
      'Скажи: You like riding a bicycle.',
    ].join('\n')

    const out = ensureTranslationProtocolBlocks(content, {
      tense: 'present_simple',
      topic: 'free_talk',
      level: 'a1',
      audience: 'child',
      fallbackPrompt: 'Ты любишь кататься на велосипеде.',
      userAnswerForSupportFallback: 'Do you like to rite велосипед',
      repeatEnglishFallback: 'You like riding a bicycle.',
    })

    expect(out).toContain('Комментарий_перевод: Вижу, что ты стараешься. Давай спокойно поправим это ниже.')
    expect(out).not.toContain('для вопроса')
    expect(out).not.toContain('"do you like"')
    expect(out).toContain('Скажи: You like riding a bicycle.')
  })
})
