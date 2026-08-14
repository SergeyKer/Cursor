import type { Audience } from '@/lib/types'
import type { VocabNowKind } from '@/lib/vocabulary/fuel'
import {
  VOCAB_DISPLAY_TILE_IDS,
  type VocabDisplayTileId,
  type VocabShelfId,
} from '@/lib/vocabulary/hubBuckets'

export function vocabHubCopy(audience: Audience) {
  const child = audience === 'child'
  const inFeedTitle = 'Скажи'
  const say = child ? 'Скажи Engvo' : 'Сказать Engvo'
  return {
    spaceTitle: 'Слова',
    back: '← Назад',
    nowTitle: 'Быстрый старт',
    addWordsTitle: 'Внести новые слова',
    hubEmptyReason: 'Выбери слова ниже',
    hubFooterDynamic: 'Три слова из списка.',
    listsTitle: child ? 'Мои' : 'Мои списки',
    listsEmpty: child ? 'Можно добавить свои' : 'Залейте список или откройте пакет.',
    listsFilled: (title: string) => title,
    fillList: child ? 'Добавить' : 'Залить список',
    catalogTitle: 'Слова',
    catalogOpen: 'Открыть',
    catalogPhrasebookBody: child ? 'Темы для разговора' : 'Темы: кафе, дорога, работа',
    catalogWorldsBody: child ? 'Дом и школа' : 'Миры базовых слов',
    catalogPacksBody: child ? 'Свои слова' : 'Залитые пакеты',
    worldsTitle: 'Самые необходимые слова',
    worldsFooterDynamic: 'Выбери мир.',
    vitrine: 'Витрина',
    myLists: 'Мои списки',
    tts: 'Озвучка',
    study: 'Учить',
    know: 'Знакомо',
    studyList: 'Учить этот список',
    start: 'Начать',
    say,
    pick: child ? 'Выбрать готовые' : 'Выбрать готовые',
    more: 'ещё',
    searchPlaceholder: 'Поиск…',
    emptyList: 'Пока пусто.',
    listen: 'Слушать',
    handoffTranslation: 'В перевод',
    handoffCall: 'В звонок',
    catalogScreenTitle: 'Слова',
    masteredEmpty: child
      ? 'Пока пусто — скажи Engvo слово.'
      : 'Пока нет слов в запасе. Скажи Engvo слово.',
    inFeedTitle,
    studyTitle: 'Учу',
    worldReviewed: (done: number, total: number) => `Пройдено слов: ${done}/${total}`,
    importTitle: child ? 'Добавить слова' : 'Залить список',
    importParse: 'Сделать список',
    importPhoto: child ? 'Сфотографировать список' : 'Камера',
    importGallery: child ? 'Из галереи' : 'Фото или скрин',
    importPaste: 'Вставить слова',
    importExcel: 'Excel',
    importPastePlaceholder: 'Medium\napple - яблоко',
    importRetryPhoto: 'Не прочитал фото, сними ещё раз.',
    importNoPairs: 'Нет пар для сохранения.',
    importFound: (found: number) => (child ? `Нашёл ${found} — учим 3.` : `Нашёл ${found}. Проверь перевод.`),
    importAlreadyLine: (mastered: number, inFeed: number) =>
      [mastered > 0 ? `уже умею: ${mastered}` : '', inFeed > 0 ? `${inFeedTitle}: ${inFeed}` : '']
        .filter(Boolean)
        .join('. '),
    listsDrained: child
      ? `Эти слова уже в «${inFeedTitle}» или «Умею».`
      : 'Списки уже в обороте.',
    shelvesTitle: 'Мои слова',
    shelvesScreenTitle: 'Мои слова',
    shelvesAll: 'Все',
    shelfReturned: 'Ошибся',
    shelfMastered: 'Умею',
    shelfErrors: 'Ошибся',
    shelfFix: 'Ошибся',
    shelvesFooterStatic: 'Слова | Мои слова',
    shelvesFooterDynamic: 'Слова по полкам.',
    practice: 'Практика',
    myPlan: 'Мой план',
    practiceNeedWords: 'Сначала слова',
    statsTitle: 'Как у меня',
    statsEmpty: 'Пока нет сессий. Пройди короткую порцию.',
    translationEmpty: 'Сначала отметь или пройди порцию.',
    resumePack: (title: string) => `Доучить ${title}`,
  }
}

export const VOCAB_DISPLAY_CHIP_ORDER: VocabDisplayTileId[] = VOCAB_DISPLAY_TILE_IDS

export function vocabShelfChipLabel(label: string, count: number): string {
  return `${label} · ${count}`
}

export function vocabShelfLabel(id: VocabShelfId, audience: Audience): string {
  const copy = vocabHubCopy(audience)
  if (id === 'returned' || id === 'errors') return copy.shelfFix
  if (id === 'mastered') return copy.shelfMastered
  if (id === 'in_feed') return copy.inFeedTitle
  if (id === 'know') return copy.know
  return copy.studyTitle
}

export function vocabDisplayLabel(id: VocabDisplayTileId, audience: Audience): string {
  const copy = vocabHubCopy(audience)
  if (id === 'fix') return copy.shelfFix
  if (id === 'mastered') return copy.shelfMastered
  if (id === 'in_feed') return copy.inFeedTitle
  if (id === 'know') return copy.know
  return copy.studyTitle
}

export function vocabTileLabel(id: VocabDisplayTileId, audience: Audience): string {
  return vocabDisplayLabel(id, audience)
}

export function vocabNowBody(kind: VocabNowKind, audience: Audience): {
  title: string
  reason: string
  cta: 'start' | 'say' | 'pick'
} {
  const child = audience === 'child'
  switch (kind) {
    case 'errors-sprint':
      return { title: child ? 'Поймали слово' : 'Поймали слово', reason: 'Ещё раз в короткой порции.', cta: 'start' }
    case 'errors-bridge':
      return { title: child ? 'Скажи Engvo ещё раз' : 'Поймали слово', reason: 'Скажи Engvo ещё раз.', cta: 'say' }
    case 'fresh-sprint':
      return {
        title: child ? 'Ты отметил' : 'Твой список',
        reason: child ? 'Эти слова ещё не в карточках.' : 'Эти слова ещё не в карточках.',
        cta: 'start',
      }
    case 'bank-bridge':
      return { title: 'Осталось сказать', reason: 'Карточки уже были — скажи Engvo.', cta: 'say' }
    case 'pause':
      return { title: 'С возвращением', reason: 'Два слова, без давления.', cta: 'start' }
    default:
      return {
        title: child ? 'Что учить?' : 'Нет очереди',
        reason: child ? 'Возьми готовые — дом или школа.' : 'Выбери готовые слова.',
        cta: 'pick',
      }
  }
}

export function vocabHubFooter(kind: VocabNowKind, audience: Audience = 'adult'): {
  dynamicText: string
  staticText: string
} {
  const inFeed = vocabHubCopy(audience).inFeedTitle
  switch (kind) {
    case 'errors-sprint':
      return { dynamicText: 'Сначала где ошибся.', staticText: 'Слова | Ошибся' }
    case 'errors-bridge':
      return { dynamicText: 'Скажи Engvo ещё раз.', staticText: 'Слова | Ошибся' }
    case 'fresh-sprint':
      return { dynamicText: 'Короткая порция из твоего списка.', staticText: 'Слова | Учить' }
    case 'bank-bridge':
      return { dynamicText: 'Скажи Engvo — будет Умею.', staticText: `Слова | ${inFeed}` }
    case 'pause':
      return { dynamicText: 'Начнём с двух слов.', staticText: 'Слова' }
    default:
      return { dynamicText: 'Выбери готовые или добавь свои.', staticText: 'Слова' }
  }
}
