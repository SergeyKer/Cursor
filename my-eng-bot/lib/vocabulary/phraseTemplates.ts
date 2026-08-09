import type { NecessaryWord } from '@/types/vocabulary'

/** Minimal POS guess from RU ending / EN shape — enough for phrase templates. */
export type VocabPhrasePos = 'noun' | 'verb' | 'adj' | 'adv' | 'other'

export function guessVocabPos(word: Pick<NecessaryWord, 'en' | 'ru'>): VocabPhrasePos {
  const en = word.en.trim().toLowerCase()
  const ru = word.ru.trim().toLowerCase()
  if (/ly$/.test(en) || /о$|е$|ски$/.test(ru)) return 'adv'
  if (/^(be|am|is|are|was|were|have|has|do|does|go|run|read|write|make|take|get|see|know|think|come|want|need)\b/.test(en) || /ть$|ти$|чь$/.test(ru)) {
    return 'verb'
  }
  if (/ous$|ful$|less$|ive$|al$|ic$|able$|ible$/.test(en) || /ый$|ий$|ой$|ая$|ое$|ые$/.test(ru)) return 'adj'
  if (/^[a-z]+$/.test(en)) return 'noun'
  return 'other'
}

export function buildSayPhraseForWord(word: Pick<NecessaryWord, 'en' | 'ru'>): string {
  const en = word.en.trim()
  const pos = guessVocabPos(word)
  switch (pos) {
    case 'verb':
      return `I can ${en}.`
    case 'adj':
      return `It is ${en}.`
    case 'adv':
      return `I do it ${en}.`
    case 'noun':
      return `I know the word ${en}.`
    default:
      return `I know the word: ${en}`
  }
}
