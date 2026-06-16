import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  animateBriefingLaunchComplete,
  completePrepareProgress,
  computePrepareProgress,
  computeSimulatedPrepareProgress,
  computeWaitPrepareProgress,
  LESSON_PREPARE_PHASE1_DURATION_MS,
  LESSON_PREPARE_PHASE1_PROGRESS_CAP,
  LESSON_PREPARE_WAIT_VISUAL_DURATION_MS,
  creepProgressInBand,
  LESSON_PREPARE_BAR_WAIT_VISUAL_CAP,
  LESSON_PREPARE_COMPLETE_TARGET,
  LESSON_PREPARE_PHASE_CREEP_MS,
  LESSON_PREPARE_START_PROGRESS,
  LESSON_PREPARE_WAIT_PROGRESS_CAP,
  PREPARE_PHASE_BANDS,
  resolveEffectivePrepareMilestoneFloor,
  resolveMilestoneFloor,
  resolvePrepareWaitCap,
  resolvePrepareLabel,
  toPrepareBarProgress,
} from './lessonPrepareProgress'

describe('resolveMilestoneFloor', () => {
  it('raises floor only on milestone 15', () => {
    expect(resolveMilestoneFloor(15, 'intro')).toBe(20)
    expect(resolveMilestoneFloor(15, 'briefing')).toBe(33)
    expect(resolveMilestoneFloor(70, 'intro')).toBeNull()
    expect(resolveMilestoneFloor(90, 'briefing')).toBeNull()
  })
})

describe('toPrepareBarProgress', () => {
  it('maps logical wait cap to visual 80%', () => {
    expect(toPrepareBarProgress(59, 'intro')).toBeCloseTo(LESSON_PREPARE_BAR_WAIT_VISUAL_CAP, 0)
    expect(toPrepareBarProgress(65, 'briefing')).toBeCloseTo(LESSON_PREPARE_BAR_WAIT_VISUAL_CAP, 0)
  })

  it('moves visual faster than logical in the wait phase', () => {
    const logical = 45
    const visual = toPrepareBarProgress(logical, 'intro')
    expect(visual).toBeGreaterThan(logical)
    expect(visual).toBeLessThan(LESSON_PREPARE_BAR_WAIT_VISUAL_CAP)
  })

  it('maps logical 100 to visual 100', () => {
    expect(toPrepareBarProgress(100, 'intro')).toBe(100)
  })
})

describe('resolvePrepareWaitCap', () => {
  it('keeps wait progress below final-phase labels', () => {
    expect(resolvePrepareWaitCap('intro')).toBe(LESSON_PREPARE_WAIT_PROGRESS_CAP.intro)
    expect(resolvePrepareLabel(resolvePrepareWaitCap('intro'), 'intro')).toBe(
      'Engvo придумывает ситуации...'
    )
    expect(resolvePrepareLabel(resolvePrepareWaitCap('briefing'), 'briefing')).toBe('Получаем...')
  })
})

describe('creepProgressInBand', () => {
  it('starts at band floor and approaches ceiling', () => {
    const band = PREPARE_PHASE_BANDS.intro[1]!
    const start = 1_000
    expect(creepProgressInBand(band, start, start)).toBeCloseTo(band.floor, 0)
    expect(creepProgressInBand(band, start, start + LESSON_PREPARE_PHASE_CREEP_MS)).toBeCloseTo(
      band.ceiling,
      0
    )
  })

  it('keeps intro phase 1 below label threshold for phase 2', () => {
    const band = PREPARE_PHASE_BANDS.intro[0]!
    const start = 0
    const mid = creepProgressInBand(band, start, start + LESSON_PREPARE_PHASE_CREEP_MS / 2)
    expect(mid).toBeLessThan(20)
    expect(mid).toBeGreaterThanOrEqual(LESSON_PREPARE_START_PROGRESS)
  })
})

describe('computeWaitPrepareProgress', () => {
  it('starts near 3% and reaches wait cap by budget end', () => {
    const cap = LESSON_PREPARE_WAIT_PROGRESS_CAP.intro
    expect(computeWaitPrepareProgress(0, cap)).toBeCloseTo(3, 0)
    expect(
      computeWaitPrepareProgress(LESSON_PREPARE_WAIT_VISUAL_DURATION_MS * 2.5, cap, LESSON_PREPARE_WAIT_VISUAL_DURATION_MS * 2.5)
    ).toBeCloseTo(cap, 0)
  })

  it('stays in phase 1 for minimum duration', () => {
    const cap = LESSON_PREPARE_WAIT_PROGRESS_CAP.intro
    const midPhase1 = computeWaitPrepareProgress(LESSON_PREPARE_PHASE1_DURATION_MS / 2, cap, 30_000, 'intro')
    expect(midPhase1).toBeLessThan(LESSON_PREPARE_PHASE1_PROGRESS_CAP.intro)
    expect(midPhase1).toBeGreaterThan(LESSON_PREPARE_START_PROGRESS)
    const endPhase1 = computeWaitPrepareProgress(LESSON_PREPARE_PHASE1_DURATION_MS, cap, 30_000, 'intro')
    expect(endPhase1).toBeCloseTo(LESSON_PREPARE_PHASE1_PROGRESS_CAP.intro, 0)
  })

  it('accelerates through phase 2 after phase 1', () => {
    const cap = LESSON_PREPARE_WAIT_PROGRESS_CAP.intro
    const afterPhase1 = computeWaitPrepareProgress(
      LESSON_PREPARE_PHASE1_DURATION_MS + 2_000,
      cap,
      30_000,
      'intro'
    )
    expect(afterPhase1).toBeGreaterThan(30)
  })
})

describe('resolveEffectivePrepareMilestoneFloor', () => {
  it('ignores milestone floor during phase 1', () => {
    expect(resolveEffectivePrepareMilestoneFloor(20, 500)).toBe(LESSON_PREPARE_START_PROGRESS)
    expect(resolveEffectivePrepareMilestoneFloor(20, LESSON_PREPARE_PHASE1_DURATION_MS)).toBe(20)
  })
})

describe('computeSimulatedPrepareProgress', () => {
  it('starts near 3% and eases toward cap', () => {
    expect(computeSimulatedPrepareProgress(0, 10_000)).toBeCloseTo(3, 0)
    expect(computeSimulatedPrepareProgress(10_000, 10_000)).toBeCloseTo(90, 0)
  })
})

describe('computePrepareProgress', () => {
  it('uses milestone floor without rolling back', () => {
    expect(
      computePrepareProgress({
        simulatedProgress: 12,
        milestoneFloor: 70,
      })
    ).toBe(70)
  })

  it('caps simulated drift at wait cap for intro', () => {
    expect(
      computePrepareProgress({
        simulatedProgress: 95,
        milestoneFloor: 15,
        cap: LESSON_PREPARE_WAIT_PROGRESS_CAP.intro,
      })
    ).toBe(59)
  })
})

describe('resolvePrepareLabel', () => {
  it('returns intro phase labels by progress thresholds', () => {
    expect(resolvePrepareLabel(5)).toBe('Подготавливаем вариант...')
    expect(resolvePrepareLabel(25)).toBe('Engvo придумывает ситуации...')
    expect(resolvePrepareLabel(75)).toBe('Engvo придумывает ситуации...')
    expect(resolvePrepareLabel(80)).toBe('Почти готово...')
  })

  it('returns briefing phase labels by progress thresholds', () => {
    expect(resolvePrepareLabel(5, 'briefing')).toBe('Готовим...')
    expect(resolvePrepareLabel(40, 'briefing')).toBe('Получаем...')
    expect(resolvePrepareLabel(65, 'briefing')).toBe('Получаем...')
    expect(resolvePrepareLabel(70, 'briefing')).toBe('Получаем...')
    expect(resolvePrepareLabel(80, 'briefing')).toBe('Запускаю...')
  })
})

describe('completePrepareProgress', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('snaps to target when already at or above target', async () => {
    let progress = 85
    const result = await completePrepareProgress(
      () => progress,
      (next) => {
        progress = next
      }
    )
    expect(result).toBe(true)
    expect(progress).toBe(LESSON_PREPARE_COMPLETE_TARGET)
  })

  it('returns false when cancelled', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    const result = await completePrepareProgress(
      () => 70,
      () => undefined,
      { shouldCancel: () => true }
    )
    expect(result).toBe(false)
  })

  it('animates logical progress while bar uses visual mapping', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    const logicalSteps: number[] = []
    const visualSteps: number[] = []
    const result = await completePrepareProgress(
      () => (logicalSteps.length === 0 ? 42 : logicalSteps[logicalSteps.length - 1]!),
      (logical) => {
        logicalSteps.push(logical)
        visualSteps.push(toPrepareBarProgress(logical, 'intro'))
      },
      { durationMs: 0 }
    )
    expect(result).toBe(true)
    expect(toPrepareBarProgress(42, 'intro')).toBeGreaterThan(42)
    expect(logicalSteps[logicalSteps.length - 1]).toBe(LESSON_PREPARE_COMPLETE_TARGET)
    expect(visualSteps[visualSteps.length - 1]).toBe(LESSON_PREPARE_COMPLETE_TARGET)
  })
})

describe('animateBriefingLaunchComplete alias', () => {
  it('delegates to completePrepareProgress', async () => {
    let progress = 99
    const result = await animateBriefingLaunchComplete(
      () => progress,
      (next) => {
        progress = next
      }
    )
    expect(result).toBe(true)
    expect(progress).toBe(LESSON_PREPARE_COMPLETE_TARGET)
  })
})
