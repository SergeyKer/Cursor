import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeMode } from '@/types/practice'
import { featureFlags } from '@/lib/featureFlags'

export type PracticeFinalePrimaryAction = 'repeat' | 'challenge' | 'openLesson' | 'menu'

export function getPracticeFinalePrimaryAction(params: {
  tier: PracticeEconomyTier
  globalAmount: number
  ringCount: number
  mode: PracticeMode
  gemsPending: boolean
}): { action: PracticeFinalePrimaryAction; label: string; hint: string } {
  const { tier, globalAmount, ringCount, mode, gemsPending } = params

  if (tier === 2 && !gemsPending && ringCount < 5) {
    return {
      action: 'repeat',
      label: featureFlags.practiceTopicCupsV1 ? 'Повторить (к 🏆 5/5)' : 'Повторить (к 🔁 5/5)',
      hint: featureFlags.practiceTopicCupsV1
        ? 'Золотая медаль есть — до кубка темы 🏆 осталось 5 практик.'
        : 'Золотая медаль есть — закрепите тему для 💎.',
    }
  }

  if (tier === 1 && ringCount < 5) {
    return {
      action: 'repeat',
      label: `Повторить (🔁 ${ringCount}/5)`,
      hint: 'Ещё один проход укрепит тему и даст XP к уровню.',
    }
  }

  if (tier === 0 || globalAmount === 0) {
    if (mode === 'reference') {
      return {
        action: 'challenge',
        label: 'Перейти в Challenge',
        hint: 'Challenge даёт больше session XP.',
      }
    }
    return {
      action: 'repeat',
      label: 'Повторить (новый вариант)',
      hint: 'Session XP начнётся с нуля — это нормально.',
    }
  }

  if (mode === 'challenge') {
    return {
      action: 'repeat',
      label: 'Повторить Challenge',
      hint: 'Повтор даст меньше XP к уровню — это ожидаемо.',
    }
  }

  return {
    action: 'challenge',
    label: mode === 'relaxed' ? 'Продолжить до Balanced' : 'Challenge на 12 заданий',
    hint: 'Следующий режим даст больше session XP.',
  }
}
