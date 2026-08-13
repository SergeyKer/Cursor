import type { Audience } from '@/lib/types'
import type { VocabNowKind } from '@/lib/vocabulary/fuel'
import type { HubTileId, VocabShelfId } from '@/lib/vocabulary/hubBuckets'

export function vocabHubCopy(audience: Audience) {
  const child = audience === 'child'
  return {
    spaceTitle: 'Слова',
    back: '← Назад',
    nowTitle: 'СЕЙЧАС',
    tileMastered: child ? 'Умею' : 'Запас',
    tileInFeed: 'В деле',
    tileErrors: child ? 'Починить' : 'Ошибки',
    tileStudy: 'Учу',
    listsTitle: child ? 'МОИ СЛОВА' : 'МОИ СПИСКИ',
    listsEmpty: child ? 'Можно добавить свои' : 'Залейте список или откройте пакет.',
    listsFilled: (title: string) => title,
    fillList: child ? 'Добавить' : 'Залить список',
    catalogTitle: child ? 'ЕЩЁ СЛОВА' : 'КАТАЛОГ',
    catalogBody: child ? 'Дом, школа…' : 'Миры',
    catalogOpen: 'Открыть',
    vitrine: 'Витрина',
    myLists: 'Мои списки',
    tts: 'Озвучка',
    study: 'Учить',
    tempoSprintCta: 'Быстро 3 слова',
    tempoFullCta: 'Учить 5 слов',
    know: 'Знаю',
    studyList: 'Учить этот список',
    start: 'Начать',
    say: 'Сказать боту',
    pick: 'Выбрать слова',
    more: 'ещё',
    searchPlaceholder: 'Поиск…',
    emptyList: 'Пока пусто.',
    listen: 'Слушать',
    handoffTranslation: 'Закрепить в переводе',
    handoffCall: 'В звонок',
    catalogScreenTitle: child ? 'Ещё слова' : 'Каталог',
    masteredEmpty: child ? 'Пока пусто — скажи боту слово.' : 'Пока нет слов в запасе. Скажи боту слова из «В деле».',
    errorsTitle: child ? 'Починить' : 'Ошибки',
    bankTitle: 'В деле',
    masteredTitle: child ? 'Умею' : 'Запас',
    studyTitle: 'Учу',
    worldReviewed: (done: number, total: number) => `Пройдено слов: ${done}/${total}`,
    importTitle: child ? 'Добавить слова' : 'Залить список',
    importParse: 'Разобрать текст',
    shelvesTitle: 'ПОЛКИ',
    shelvesScreenTitle: 'Полки',
    shelvesBody: child
      ? 'Учу · В деле · Умею · Вернулись · Ошибки'
      : 'Учу · Знаю · В деле · Умею · Вернулись · Ошибки',
    shelvesAll: 'Все',
    shelfReturned: 'Вернулись',
    shelfMastered: 'Умею',
    shelfErrors: 'Ошибки',
    shelvesFooterStatic: 'Слова | Полки',
    shelvesFooterDynamic: 'Слова по полкам.',
  }
}

export const VOCAB_SHELF_CHIP_ORDER: VocabShelfId[] = [
  'study',
  'know',
  'in_feed',
  'mastered',
  'returned',
  'errors',
]

export function vocabShelfLabel(id: VocabShelfId, audience: Audience): string {
  const copy = vocabHubCopy(audience)
  if (id === 'returned') return copy.shelfReturned
  if (id === 'errors') return copy.shelfErrors
  if (id === 'mastered') return copy.shelfMastered
  if (id === 'in_feed') return copy.bankTitle
  if (id === 'know') return copy.know
  return copy.studyTitle
}

export function vocabTileLabel(id: HubTileId, audience: Audience): string {
  const copy = vocabHubCopy(audience)
  if (id === 'mastered') return copy.tileMastered
  if (id === 'in_feed') return copy.tileInFeed
  if (id === 'errors') return copy.tileErrors
  return copy.tileStudy
}

export function vocabNowBody(kind: VocabNowKind, audience: Audience): {
  title: string
  reason: string
  cta: 'start' | 'say' | 'pick'
} {
  const child = audience === 'child'
  switch (kind) {
    case 'errors-sprint':
      return { title: child ? 'Поймали слово' : 'Поймали слово', reason: 'Почини в короткой порции.', cta: 'start' }
    case 'errors-bridge':
      return { title: child ? 'Скажи боту ещё раз' : 'Поймали слово', reason: 'Скажи боту ещё раз.', cta: 'say' }
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
