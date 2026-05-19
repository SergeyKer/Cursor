import { coreXpToNextMedalTier, resolveLiveFooterMedal } from '@/lib/lessonScore'
import type { LiveFooterMedalState } from '@/lib/lessonScore'

const MEDAL_EMOJI: Record<LiveFooterMedalState, string> = {
  grey: '○',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

const MEDAL_LABEL: Record<LiveFooterMedalState, string> = {
  grey: 'Старт — медаль появится с первых очков',
  bronze: 'Сейчас: бронза',
  silver: 'Сейчас: серебро',
  gold: 'Сейчас: золото',
}

export interface LessonFooterLiveInput {
  currentStep: number
  totalSteps: number
  coreXp: number
  maxCoreXp: number
  coreDelta?: number
  combo: number
  comboDelta?: number
  accountTotalXp: number
  dailyStreak: number
}

export type LessonFooterSegmentKind = 'step' | 'core' | 'medal' | 'combo'

export type LessonFooterAccountSegmentKind = 'totalXp' | 'streak'

export interface LessonFooterSegment {
  kind: LessonFooterSegmentKind
  text: string
  title?: string
}

export interface LessonFooterAccountSegment {
  kind: LessonFooterAccountSegmentKind
  text: string
}

export interface LessonFooterLiveView {
  lessonSegments: LessonFooterSegment[]
  accountSegments: LessonFooterAccountSegment[]
  accountLine: string
  lessonTitle: string
  accountTitle: string
}

export function buildLessonFooterLive(input: LessonFooterLiveInput): LessonFooterLiveView {
  const stepPart = `Шаг ${Math.min(input.currentStep + 1, input.totalSteps)}/${input.totalSteps}`
  const corePart =
    input.coreDelta && input.coreDelta > 0
      ? `${input.coreXp}/${input.maxCoreXp} (+${input.coreDelta}) XP`
      : `${input.coreXp}/${input.maxCoreXp} XP`

  const medal = resolveLiveFooterMedal(input.coreXp, input.maxCoreXp)
  const medalEmoji = MEDAL_EMOJI[medal.current]
  const toNext = coreXpToNextMedalTier(input.coreXp, input.maxCoreXp)

  const comboPart =
    input.comboDelta && input.comboDelta > 0
      ? `COMBO ×${input.combo} (+${input.comboDelta})`
      : `COMBO ×${input.combo}`

  const lessonSegments: LessonFooterSegment[] = [
    { kind: 'step', text: stepPart, title: 'Текущий шаг урока' },
    {
      kind: 'core',
      text: corePart,
      title: 'Очки этого урока (core). Медаль считается только по ним.',
    },
    {
      kind: 'medal',
      text: medalEmoji,
      title:
        toNext != null
          ? `${MEDAL_LABEL[medal.current]}. До следующей ступени: ${toNext} очков.`
          : MEDAL_LABEL[medal.current],
    },
    {
      kind: 'combo',
      text: comboPart,
      title: 'Сколько раз подряд ответили верно в этом уроке. Ошибка сбрасывает серию.',
    },
  ]

  const accountSegments: LessonFooterAccountSegment[] = [
    { kind: 'totalXp', text: `⭐${input.accountTotalXp}` },
    { kind: 'streak', text: `🔥${input.dailyStreak}д` },
  ]
  const accountLine = accountSegments.map((segment) => segment.text).join('  ')

  return {
    lessonSegments,
    accountSegments,
    accountLine,
    lessonTitle: 'Прогресс урока: шаг, очки, медаль, COMBO.',
    accountTitle: 'Всего опыта в аккаунте и дни подряд с занятиями.',
  }
}
