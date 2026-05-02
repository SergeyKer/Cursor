import type { AccentMenuGroup, AccentSection } from '@/types/accent'
import { ALL_ACCENT_LESSONS } from '@/lib/accent/staticContent'

const sectionMeta: Array<Omit<AccentSection, 'lessonIds'>> = [
  { id: 'dental-th', title: 'TH без S/T/Z/D', subtitle: 'think, this, mother, bath' },
  { id: 'r-and-l', title: 'R и L', subtitle: 'river, light, feel и контрасты' },
  { id: 'w-v-h', title: 'W, V и H', subtitle: 'west/vest, very, happy' },
  { id: 'long-short-vowels', title: 'Долгие и краткие гласные', subtitle: 'feet/fit, look/loop' },
  { id: 'open-vowels', title: 'Открытые гласные', subtitle: 'man/men, hut/heart' },
  { id: 'diphthongs', title: 'Дифтонги', subtitle: 'play, go, time, now, boy' },
  { id: 'air-plosives', title: 'Воздух в P/T/K', subtitle: 'park, Tim, car' },
  { id: 'final-voicing', title: 'Конец слова без оглушения', subtitle: 'bad, rug, love, choose' },
  { id: 'weak-syllables', title: 'Слабые слоги', subtitle: 'about, of, to, and' },
  { id: 'rhythm-connected', title: 'Ритм и связная речь', subtitle: 'stress, linking, intonation' },
]

export const ACCENT_SECTIONS: AccentSection[] = sectionMeta.map((section) => ({
  ...section,
  lessonIds: ALL_ACCENT_LESSONS.filter((lesson) => lesson.sectionId === section.id).map((lesson) => lesson.id),
}))

export const RUSSIAN_SPEAKER_GROUPS: AccentMenuGroup[] = [
  {
    id: 'th-marker',
    title: 'TH без S/T/Z/D',
    subtitle: 'Самый заметный маркер: think, this, bath, mother.',
    lessonIds: ['th-think', 'th-bath', 'th-this', 'th-mother'],
  },
  {
    id: 'visible-first',
    title: 'Звуки, которые слышны сразу',
    subtitle: 'W/V, H, R/L — то, что чаще всего выдаёт акцент в первых фразах.',
    lessonIds: ['w-v-contrast', 'w-west', 'v-very', 'h-happy', 'r-l-contrast', 'r-river'],
  },
  {
    id: 'meaning-contrast',
    title: 'Контрасты, где меняется смысл',
    subtitle: 'feet/fit, man/men, look/loop, hut/heart.',
    lessonIds: ['feet-fit', 'man-men', 'look-loop', 'hut-heart'],
  },
  {
    id: 'word-endings',
    title: 'Концы слов',
    subtitle: 'Чтобы bad не превращался в bat, love в luff, choose в juice.',
    lessonIds: ['final-d-bad', 'final-g-rug', 'final-v-love', 'final-z-choose', 'voicing-mixed'],
  },
  {
    id: 'english-flow',
    title: 'Английский поток речи',
    subtitle: 'Слабые формы, linking, sentence stress и ритм.',
    lessonIds: ['schwa-about', 'schwa-phrases', 'word-stress', 'sentence-stress', 'weak-forms', 'linking', 'rhythm-shadowing'],
  },
]

export function getAccentLessonById(lessonId: string) {
  return ALL_ACCENT_LESSONS.find((lesson) => lesson.id === lessonId) ?? null
}

export function getFirstAccentLessonId(): string {
  return ALL_ACCENT_LESSONS[0]?.id ?? 'th-think'
}
