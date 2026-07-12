export const PRACTICE_REFERENCE_COPY = {
  selectExerciseType: 'Выберите тип упражнения для эталона.',
  cannotBuildLocal: 'Не удалось собрать локальный эталон для выбранного типа.',
} as const

export function buildPracticeFinaleChatSeed(topic: string): string {
  const trimmed = topic.trim() || 'этой теме'
  return `Давай поговорим по теме «${trimmed}».`
}
