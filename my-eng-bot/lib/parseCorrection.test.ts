import { describe, expect, it } from 'vitest'
import { parseCorrection } from './parseCorrection'

describe('parseCorrection', () => {
  it('keeps multiline comment text together until the next header', () => {
    const result = parseCorrection(
      [
        'Комментарий: First point.',
        'Second point.',
        'Third point.',
        'Время: Present Simple.',
        'Скажи: I often do my homework.',
      ].join('\n')
    )

    expect(result.comment).toBe('First point.\nSecond point.\nThird point.')
    expect(result.rest).toBe('Время: Present Simple.\nСкажи: I often do my homework.')
  })

  it('ends Комментарий before Ошибки', () => {
    const result = parseCorrection(
      [
        'Комментарий: Кратко.',
        'Ошибки:',
        '✏️ x → y',
        'Время: Present Simple.',
        'Скажи: I run.',
      ].join('\n')
    )

    expect(result.comment).toBe('Кратко.')
    expect(result.rest).toContain('Ошибки:')
    expect(result.rest).toContain('✏️')
  })

  it('keeps translation meta feedback line in comment block', () => {
    const result = parseCorrection(
      [
        'Комментарий: Молодец!',
        'Переведи далее: Ты правильно использовал "like" для "нравится".',
      ].join('\n')
    )

    expect(result.comment).toBe('Молодец!\nПереведи далее: Ты правильно использовал "like" для "нравится".')
    expect(result.rest).toBe('')
  })

  it('keeps real translation invitation in rest block', () => {
    const result = parseCorrection(
      [
        'Комментарий: Молодец!',
        'Переведи далее: Мне нравится гулять с друзьями.',
      ].join('\n')
    )

    expect(result.comment).toBe('Молодец!')
    expect(result.rest).toBe('Переведи далее: Мне нравится гулять с друзьями.')
  })

  it('отделяет «Переведи далее:» от комментария при ошибке (кириллица + \\b в JS)', () => {
    const result = parseCorrection(
      [
        'Комментарий: Ошибка в артикле. Нужно "a" перед "dog".',
        'Переведи далее: Кошка спит на диване.',
      ].join('\n')
    )

    expect(result.comment).toBe('Ошибка в артикле. Нужно "a" перед "dog".')
    expect(result.rest).toBe('Переведи далее: Кошка спит на диване.')
  })

  it('сохраняет inline «Скажи» и следующий «Переведи далее» в rest одновременно', () => {
    const result = parseCorrection(
      [
        'Комментарий: Ошибка времени. Скажи: I read books every day.',
        'Переведи далее: Я играю в футбол по выходным.',
      ].join('\n')
    )

    expect(result.comment).toBe('Ошибка времени.')
    expect(result.rest).toBe(
      ['Скажи: I read books every day.', 'Переведи далее: Я играю в футбол по выходным.'].join('\n')
    )
  })
})
