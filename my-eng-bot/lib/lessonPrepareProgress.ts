import { LESSON_BRIEFING_PREPARE_LABEL_BY_THRESHOLD } from '@/lib/lessonBriefingPrepareProgressCopy'
import { LESSON_PREPARE_LABEL_BY_THRESHOLD } from '@/lib/lessonPrepareProgressCopy'

export type PrepareLabelProfile = 'intro' | 'briefing'

export type PrepareMilestone = 5 | 15 | 70 | 90

export type LessonPreparePhase = 'idle' | 'preparing'

export type PreparePhaseBand = {
  floor: number
  /** Потолок коридора до финиша complete (не обещаем 100%). */
  ceiling: number
}

export const LESSON_PREPARE_START_PROGRESS = 3
export const LESSON_PREPARE_TICK_MS = 200
export const LESSON_PREPARE_DEFAULT_DURATION_MS = 35_000

export const LESSON_PREPARE_PROGRESS_CAP = 90
/** Потолок полосы до финиша complete — остаёмся на подписи Engvo/Получаем. */
export const LESSON_PREPARE_WAIT_PROGRESS_CAP: Record<PrepareLabelProfile, number> = {
  intro: 59,
  briefing: 65,
}

export const LESSON_PREPARE_PHASE_EASE_MS = 200
export const LESSON_PREPARE_PHASE_CREEP_MS = 15_000
/** Визуальный бюджет полосы до wait-cap: фаза 1 спокойно, фаза 2 быстрее, хвост медленный. */
export const LESSON_PREPARE_WAIT_VISUAL_DURATION_MS = 12_000
/** Минимальное время на «Подготавливаем…» / «Готовим…». */
export const LESSON_PREPARE_PHASE1_DURATION_MS = 1_800
export const LESSON_PREPARE_PHASE1_PROGRESS_CAP: Record<PrepareLabelProfile, number> = {
  intro: 19,
  briefing: 32,
}
export const LESSON_PREPARE_PHASE2_START_PROGRESS: Record<PrepareLabelProfile, number> = {
  intro: 20,
  briefing: 33,
}
/** Фаза 2 (Engvo/Получаем): умеренный front-load к ~45%. */
export const LESSON_PREPARE_WAIT_CURVE_EXPONENT = 0.36
/** Визуальный потолок полосы на ожидании (подписи — по логическому waitCap). */
export const LESSON_PREPARE_BAR_WAIT_VISUAL_CAP = 80
/** Фиксированный финиш полосы после ответа ИИ. */
export const LESSON_PREPARE_COMPLETE_VISUAL_MS = 520
/** Финиш: одна плавная дорисовка с текущего % до 100%. */
export const LESSON_PREPARE_COMPLETE_ANIMATION_MS = LESSON_PREPARE_COMPLETE_VISUAL_MS
/** @deprecated Больше не используется — финиш без отдельного lead до minProgress. */
export const LESSON_PREPARE_COMPLETE_LEAD_MS = 220
export const LESSON_PREPARE_COMPLETE_TARGET = 100

/** @deprecated Используйте LESSON_PREPARE_COMPLETE_ANIMATION_MS */
export const LESSON_BRIEFING_LAUNCH_ANIMATION_MS = LESSON_PREPARE_COMPLETE_ANIMATION_MS
/** @deprecated */
export const LESSON_BRIEFING_LAUNCH_TARGET_PROGRESS = LESSON_PREPARE_COMPLETE_TARGET
/** @deprecated */
export const LESSON_BRIEFING_LAUNCH_PROGRESS_MIN = 70
/** @deprecated */
export const LESSON_BRIEFING_LAUNCH_PROGRESS_MAX = 80

export const PREPARE_PHASE_BANDS: Record<PrepareLabelProfile, readonly PreparePhaseBand[]> = {
  intro: [
    { floor: 3, ceiling: 19 },
    { floor: 20, ceiling: 59 },
    { floor: 60, ceiling: 99 },
  ],
  briefing: [
    { floor: 3, ceiling: 32 },
    { floor: 33, ceiling: 65 },
    { floor: 66, ceiling: 99 },
  ],
} as const

/** Milestone 15 открывает фазу ожидания; 70+ не меняет пол (остаёмся на Engvo/Получаем). */
export function resolveMilestoneFloor(
  milestone: PrepareMilestone,
  profile: PrepareLabelProfile
): number | null {
  if (milestone < 15) return null
  if (milestone < 70) {
    return profile === 'briefing' ? 33 : 20
  }
  return null
}

export function resolvePrepareWaitCap(profile: PrepareLabelProfile): number {
  return LESSON_PREPARE_WAIT_PROGRESS_CAP[profile]
}

/** Логический прогресс (подписи) → ширина полосы на кнопке. */
export function toPrepareBarProgress(
  logicalProgress: number,
  profile: PrepareLabelProfile = 'intro'
): number {
  const logical = Math.min(
    LESSON_PREPARE_COMPLETE_TARGET,
    Math.max(LESSON_PREPARE_START_PROGRESS, logicalProgress)
  )
  const waitCap = LESSON_PREPARE_WAIT_PROGRESS_CAP[profile]
  const visualWaitCap = LESSON_PREPARE_BAR_WAIT_VISUAL_CAP

  if (logical <= waitCap) {
    const logicalSpan = waitCap - LESSON_PREPARE_START_PROGRESS
    const visualSpan = visualWaitCap - LESSON_PREPARE_START_PROGRESS
    const t = (logical - LESSON_PREPARE_START_PROGRESS) / logicalSpan
    return LESSON_PREPARE_START_PROGRESS + visualSpan * t
  }

  const logicalCompleteSpan = LESSON_PREPARE_COMPLETE_TARGET - waitCap
  const visualCompleteSpan = LESSON_PREPARE_COMPLETE_TARGET - visualWaitCap
  const beyond = logical - waitCap
  return visualWaitCap + (beyond / logicalCompleteSpan) * visualCompleteSpan
}

/** @deprecated Фазовая модель заменена на симуляцию + wait cap. */
export function resolveMilestonePhaseIndex(milestone: PrepareMilestone): number {
  if (milestone >= 15) return 1
  return 0
}

/** @deprecated */
export function resolveCompletePhaseIndex(): number {
  return 2
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - clamped, 3)
}

export function easeInOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

export function easeInCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * clamped
}

/**
 * Полоса ожидания: фаза 1 (~1.8s) плавно, фаза 2 быстрее к середине, у cap — хвост.
 */
export function computeWaitPrepareProgress(
  elapsedMs: number,
  waitCap: number,
  totalBudgetMs: number = LESSON_PREPARE_WAIT_VISUAL_DURATION_MS * 2.5,
  profile: PrepareLabelProfile = 'intro'
): number {
  const phase1Cap = LESSON_PREPARE_PHASE1_PROGRESS_CAP[profile]
  const phase2Start = LESSON_PREPARE_PHASE2_START_PROGRESS[profile]
  const phase1Ms = LESSON_PREPARE_PHASE1_DURATION_MS

  if (elapsedMs <= phase1Ms) {
    const t = Math.min(1, Math.max(0, elapsedMs / phase1Ms))
    const eased = easeOutCubic(t)
    return (
      LESSON_PREPARE_START_PROGRESS + (phase1Cap - LESSON_PREPARE_START_PROGRESS) * eased
    )
  }

  const phase2Elapsed = elapsedMs - phase1Ms
  const span = waitCap - phase2Start
  const curveMs = Math.min(
    Math.max(LESSON_PREPARE_WAIT_VISUAL_DURATION_MS - phase1Ms, 4_000),
    Math.max(totalBudgetMs * 0.35, 6_000)
  )
  const curveTarget = phase2Start + span * 0.88
  const curveSpan = curveTarget - phase2Start

  const t = Math.min(1, Math.max(0, phase2Elapsed / curveMs))
  const front = phase2Start + curveSpan * Math.pow(t, LESSON_PREPARE_WAIT_CURVE_EXPONENT)

  if (phase2Elapsed < curveMs) {
    return Math.min(waitCap, front)
  }

  const tailElapsed = phase2Elapsed - curveMs
  const tailBudget = Math.max(totalBudgetMs - phase1Ms - curveMs, 1)
  const tailT = easeInCubic(Math.min(1, tailElapsed / tailBudget))
  return Math.min(waitCap, curveTarget + (waitCap - curveTarget) * tailT)
}

/** До конца фазы 1 не поднимаем пол milestone 15 — иначе «Подготавливаем» пролетает. */
export function resolveEffectivePrepareMilestoneFloor(
  milestoneFloor: number,
  elapsedMs: number
): number {
  if (elapsedMs < LESSON_PREPARE_PHASE1_DURATION_MS) {
    return LESSON_PREPARE_START_PROGRESS
  }
  return milestoneFloor
}

export function creepProgressInBand(
  band: PreparePhaseBand,
  segmentStartedAtMs: number,
  nowMs: number,
  creepDurationMs = LESSON_PREPARE_PHASE_CREEP_MS
): number {
  const elapsed = Math.max(0, nowMs - segmentStartedAtMs)
  const duration = Math.max(creepDurationMs, 1)
  const span = band.ceiling - band.floor
  const eased = easeOutCubic(Math.min(1, elapsed / duration))
  return band.floor + span * eased
}

export function clampProgressToBand(progress: number, band: PreparePhaseBand): number {
  return Math.min(band.ceiling, Math.max(band.floor, progress))
}

export function prefersReducedPrepareMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function waitForNextPaint(): Promise<void> {
  if (typeof requestAnimationFrame === 'undefined') {
    return waitMs(0)
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function animateProgressTo(
  from: number,
  target: number,
  durationMs: number,
  applyProgress: (progress: number) => void,
  shouldCancel?: () => boolean,
  easing: (t: number) => number = easeOutCubic
): Promise<boolean> {
  if (from >= target) {
    applyProgress(target)
    return true
  }

  if (prefersReducedPrepareMotion() || durationMs <= 0) {
    if (shouldCancel?.()) return false
    applyProgress(target)
    return true
  }

  const startTime = Date.now()

  return new Promise((resolve) => {
    const step = () => {
      if (shouldCancel?.()) {
        resolve(false)
        return
      }
      const elapsed = Date.now() - startTime
      const t = Math.min(1, elapsed / durationMs)
      const next = Math.round(from + (target - from) * easing(t))
      applyProgress(next)
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        applyProgress(target)
        resolve(true)
      }
    }
    if (typeof requestAnimationFrame === 'undefined') {
      applyProgress(target)
      resolve(true)
      return
    }
    requestAnimationFrame(step)
  })
}

/** Плавно дорисовать полосу с текущего значения до 100% после готовности данных. */
export async function completePrepareProgress(
  readProgress: () => number,
  applyProgress: (progress: number) => void,
  options?: {
    target?: number
    durationMs?: number
    shouldCancel?: () => boolean
  }
): Promise<boolean> {
  const target = options?.target ?? LESSON_PREPARE_COMPLETE_TARGET
  const shouldCancel = options?.shouldCancel

  if (shouldCancel?.()) return false

  const start = readProgress()
  if (start >= target) {
    applyProgress(target)
    return true
  }

  const span = target - start
  const durationMs = options?.durationMs ?? LESSON_PREPARE_COMPLETE_VISUAL_MS

  if (prefersReducedPrepareMotion()) {
    if (shouldCancel?.()) return false
    applyProgress(target)
    return true
  }

  await waitForNextPaint()
  return animateProgressTo(start, target, durationMs, applyProgress, shouldCancel, easeInOutCubic)
}

/** @deprecated Используйте completePrepareProgress */
export const animateBriefingLaunchComplete = completePrepareProgress

/** @deprecated Убрано из runtime pipeline */
export async function waitForBriefingLaunchBand(
  readProgress: () => number,
  options?: { minMs?: number; maxMs?: number }
): Promise<void> {
  const minMs = options?.minMs ?? LESSON_PREPARE_TICK_MS
  const maxMs = options?.maxMs ?? LESSON_PREPARE_TICK_MS * 3
  await waitForNextPaint()
  const start = Date.now()

  while (true) {
    const elapsed = Date.now() - start
    const progress = readProgress()
    if (elapsed >= minMs && progress >= LESSON_BRIEFING_LAUNCH_PROGRESS_MIN) {
      return
    }
    if (elapsed >= maxMs) {
      return
    }
    const remaining = maxMs - elapsed
    await waitMs(Math.min(LESSON_PREPARE_TICK_MS / 2, Math.max(0, remaining)))
  }
}

export function computeSimulatedPrepareProgress(
  elapsedMs: number,
  expectedDurationMs: number,
  cap = LESSON_PREPARE_PROGRESS_CAP
): number {
  const duration = Math.max(expectedDurationMs, 1)
  const eased = easeOutCubic(elapsedMs / duration)
  const span = cap - LESSON_PREPARE_START_PROGRESS
  return LESSON_PREPARE_START_PROGRESS + span * eased
}

export function computePrepareProgress(params: {
  simulatedProgress: number
  milestoneFloor: number
  cap?: number
}): number {
  const cap = params.cap ?? LESSON_PREPARE_PROGRESS_CAP
  const raw = Math.max(params.simulatedProgress, params.milestoneFloor)
  return Math.min(cap, Math.max(LESSON_PREPARE_START_PROGRESS, raw))
}

export function resolvePrepareLabel(progress: number, profile: PrepareLabelProfile = 'intro'): string {
  const rounded = Math.round(progress)
  const thresholds =
    profile === 'briefing' ? LESSON_BRIEFING_PREPARE_LABEL_BY_THRESHOLD : LESSON_PREPARE_LABEL_BY_THRESHOLD
  let label: string = thresholds[0].label
  for (const entry of thresholds) {
    if (rounded >= entry.minProgress) {
      label = entry.label
    }
  }
  return label
}
