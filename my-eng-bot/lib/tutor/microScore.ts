import {
  TUTOR_MICRO_MID_MIN,
  TUTOR_MICRO_STRONG_MIN,
  type TutorMicroScoreBand,
} from '@/lib/tutor/types'

export function tutorMicroScoreRatio(correctCount: number, total: number): number {
  if (!Number.isFinite(correctCount) || !Number.isFinite(total) || total <= 0) return 0
  const safeCorrect = Math.max(0, Math.min(Math.trunc(correctCount), Math.trunc(total)))
  return safeCorrect / Math.trunc(total)
}

export function bandFromMicroScore(correctCount: number, total: number): TutorMicroScoreBand {
  const ratio = tutorMicroScoreRatio(correctCount, total)
  if (ratio >= TUTOR_MICRO_STRONG_MIN) return 'strong'
  if (ratio >= TUTOR_MICRO_MID_MIN) return 'mid'
  return 'weak'
}
