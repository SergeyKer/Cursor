import type { Audience } from '@/lib/types'
import type { VocabNowKind } from '@/lib/vocabulary/fuel'

export function vocabHubCopy(audience: Audience) {
  const child = audience === 'child'
  return {
    spaceTitle: 'Слова',
    back: '← Назад',
    umeuTitle: 'УМЕЮ',
    umeuEmpty: 'Слова, которые ты сказал боту.',
    umeuFilled: 'Можно послушать.',
    umeuCta: 'Смотреть',
    umeuEmptyHint: 'здесь появятся слова, которые ты сказал боту',
    nowTitle: 'СЕЙЧАС',
    debtErrors: (n: number) => `Ошибки ${n}`,
    debtBank: (n: number) => `В деле ${n}`,
    vitrine: 'Витрина',
    myLists: 'Мои списки',
    fillList: 'Залить список',
    tts: 'Озвучка',
    study: 'Учить',
    know: 'Знаю',
    studyList: 'Учить этот список',
    start: 'Начать',
    say: 'Сказать боту',
    pick: child ? 'Выбрать слова' : 'Выбрать слова',
    more: 'ещё',
  }
}

export function vocabNowBody(kind: VocabNowKind, audience: Audience): {
  title: string
  reason: string
  cta: 'start' | 'say' | 'pick'
} {
  const child = audience === 'child'
  switch (kind) {
    case 'errors-sprint':
      return { title: 'Поймали слово', reason: 'Почини в короткой порции.', cta: 'start' }
    case 'errors-bridge':
      return { title: 'Поймали слово', reason: 'Скажи боту ещё раз.', cta: 'say' }
    case 'fresh-sprint':
      return {
        title: child ? 'Ты отметил' : 'Твой список',
        reason: child ? 'Эти слова ещё не в карточках.' : 'Эти слова ещё не в карточках.',
        cta: 'start',
      }
    case 'bank-bridge':
      return { title: 'Осталось сказать', reason: 'Карточки уже были — скажи боту.', cta: 'say' }
    case 'pause':
      return { title: 'С возвращением', reason: 'Два слова, без давления.', cta: 'start' }
    default:
      return {
        title: child ? 'Что учить?' : 'Нет очереди',
        reason: child ? 'Отметь несколько из дома.' : 'Залейте список или отметьте в витрине.',
        cta: 'pick',
      }
  }
}

export function vocabHubFooter(kind: VocabNowKind): { dynamicText: string; staticText: string } {
  switch (kind) {
    case 'errors-sprint':
      return { dynamicText: 'Сначала починим ошибки.', staticText: 'Слова | Ошибки' }
    case 'errors-bridge':
      return { dynamicText: 'Скажи боту ещё раз.', staticText: 'Слова | Ошибки' }
    case 'fresh-sprint':
      return { dynamicText: 'Короткая порция из твоего списка.', staticText: 'Слова | Учить' }
    case 'bank-bridge':
      return { dynamicText: 'Скажи боту — будет Умею.', staticText: 'Слова | В деле' }
    case 'pause':
      return { dynamicText: 'Начнём с двух слов.', staticText: 'Слова' }
    default:
      return { dynamicText: 'Отметь слова — и можно учить.', staticText: 'Слова' }
  }
}
