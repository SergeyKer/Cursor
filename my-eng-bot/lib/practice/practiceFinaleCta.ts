import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeMode } from '@/types/practice'
import { featureFlags } from '@/lib/featureFlags'
import { formatPracticeProgressText, PRACTICE_RING_MAX } from '@/lib/practice/practiceGlyphs'

export type PracticeFinalePrimaryAction = 'repeat' | 'challenge' | 'openLesson' | 'menu'

export function getPracticeFinalePrimaryAction(params: {
  tier: PracticeEconomyTier
  globalAmount: number
  ringCount: number
  mode: PracticeMode
  gemsPending: boolean
  masteryScore?: number
  plannedLength?: number
}): { action: PracticeFinalePrimaryAction; label: string; hint: string } {
  const { tier, globalAmount, ringCount, mode, gemsPending } = params

  if (mode === 'challenge' && params.masteryScore === 10 && params.plannedLength === 12) {
    return {
      action: 'repeat',
      label: 'Ещё один Челлендж',
      hint: 'Почти зачёт: нужна ещё одна с первой попытки.',
    }
  }

  if (mode === 'challenge' && tier === 2 && !gemsPending && ringCount < 5) {
    return {
      action: 'repeat',
      label: `Повторить (${formatPracticeProgressText(PRACTICE_RING_MAX)})`,
      hint: featureFlags.practiceTopicCupsV1
        ? 'До кубка нужны 5 зачётных Челленджей 11/12.'
        : 'Золотая медаль есть - закрепите тему для 💎.',
    }
  }

  if (mode === 'challenge' && tier === 1 && ringCount < 5) {
    return {
      action: 'repeat',
      label: `Повторить (${formatPracticeProgressText(ringCount)})`,
      hint: 'Ещё один проход укрепит тему и даст XP к уровню.',
    }
  }

  if (tier === 0 || globalAmount === 0) {
    if (mode === 'reference') {
      return {
        action: 'challenge',
        label: 'Перейти в Челлендж',
        hint: 'Челлендж даёт больше звёзд за проход.',
      }
    }
    return {
      action: 'repeat',
      label: 'Повторить (новый вариант)',
      hint: 'Звёзды за новый проход начнутся с нуля.',
    }
  }

  if (mode === 'challenge') {
    return {
      action: 'repeat',
      label: 'Повторить Челлендж',
      hint: 'Повтор даст меньше XP к уровню - это ожидаемо.',
    }
  }

  return {
    action: 'challenge',
    label: mode === 'relaxed' ? 'Продолжить до Обычной' : 'Челлендж на 12 заданий',
    hint: 'Следующий режим даст больше звёзд за проход.',
  }
}
