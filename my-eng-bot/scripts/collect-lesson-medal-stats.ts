/**
 * One-off stats collector. Imports existing lessonScore only - does not change prod logic.
 * Run: npx tsx scripts/collect-lesson-medal-stats.ts
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllStructuredLessons } from '../lib/structuredLessons'
import {
  COMBO_XP_CAP,
  computeCorePercent,
  getComboMilestoneXp,
  getUnitMaxXp,
  listLessonScoringUnits,
  resolveMedalFromCoreXp,
  sumMaxCoreXpForLesson,
  xpForAttempt,
  type LessonScoringUnit,
} from '../lib/lessonScore'
import type { LessonData } from '../types/lesson'

function applyComboXpAward(currentComboXp: number, awardXp: number): number {
  return Math.min(COMBO_XP_CAP, currentComboXp + awardXp)
}

type MedalTier = 'gold' | 'silver' | 'bronze'

interface SimResult {
  coreXp: number
  comboXp: number
  totalGlobalXp: number
  maxCombo: number
  medal: MedalTier
  corePercent: number
}

function coreFromAttempts(units: LessonScoringUnit[], attempts: number[]): number {
  return attempts.reduce((sum, attemptIndex, i) => sum + xpForAttempt(getUnitMaxXp(units[i]), attemptIndex), 0)
}

function simulateRun(
  units: LessonScoringUnit[],
  maxCoreXp: number,
  attemptPerUnit: number[],
  errorsBeforeSuccess: number[]
): SimResult {
  let combo = 0
  let comboXp = 0
  let coreXp = 0
  let totalGlobalXp = 0
  let maxCombo = 0
  const claimed = new Set<number>()

  for (let i = 0; i < units.length; i++) {
    const errCount = errorsBeforeSuccess[i] ?? 0
    for (let e = 0; e < errCount; e++) combo = 0
    combo++
    maxCombo = Math.max(maxCombo, combo)

    const core = xpForAttempt(getUnitMaxXp(units[i]), attemptPerUnit[i])
    coreXp += core

    let comboAward = 0
    const milestone = getComboMilestoneXp(combo, claimed)
    if (milestone) {
      comboAward = milestone.xp
      claimed.add(milestone.combo)
      comboXp = applyComboXpAward(comboXp, comboAward)
    }
    totalGlobalXp += core + comboAward
  }

  const medal = resolveMedalFromCoreXp(coreXp, true, maxCoreXp) as MedalTier
  return {
    coreXp,
    comboXp,
    totalGlobalXp,
    maxCombo,
    medal,
    corePercent: computeCorePercent(coreXp, maxCoreXp),
  }
}

const HISTOGRAM_MAX_UNITS = 15

function enumerateMedalHistogram(units: LessonScoringUnit[], maxCoreXp: number) {
  const n = units.length
  if (n > HISTOGRAM_MAX_UNITS) {
    return {
      totalCombinations: 3 ** n,
      skipped: true,
      note: `Histogram enumeration skipped for ${n} units (cap ${HISTOGRAM_MAX_UNITS}).`,
      counts: { gold: null, silver: null, bronze: null },
      percent: { gold: null, silver: null, bronze: null },
      minCore: null,
      maxCoreEarned: null,
    }
  }
  const counts = { gold: 0, silver: 0, bronze: 0 }
  let minCore = Infinity
  let maxCoreEarned = 0

  for (let mask = 0; mask < 3 ** n; mask++) {
    const attempts: number[] = []
    let m = mask
    for (let i = 0; i < n; i++) {
      attempts.push(m % 3)
      m = Math.floor(m / 3)
    }
    const core = coreFromAttempts(units, attempts)
    const medal = resolveMedalFromCoreXp(core, true, maxCoreXp) as MedalTier
    counts[medal]++
    minCore = Math.min(minCore, core)
    maxCoreEarned = Math.max(maxCoreEarned, core)
  }

  const total = 3 ** n
  return {
    totalCombinations: total,
    counts,
    percent: {
      gold: roundPct(counts.gold / total),
      silver: roundPct(counts.silver / total),
      bronze: roundPct(counts.bronze / total),
    },
    minCore,
    maxCoreEarned,
  }
}

function roundPct(r: number): number {
  return Math.round(r * 10000) / 100
}

function progressiveK(units: LessonScoringUnit[], maxCoreXp: number, attemptIndex: number) {
  const rows: Array<{ k: number; coreXp: number; corePercent: number; medal: MedalTier }> = []
  for (let k = 0; k <= units.length; k++) {
    const attempts = units.map((_, i) => (i < k ? attemptIndex : 0))
    const core = coreFromAttempts(units, attempts)
    rows.push({
      k,
      coreXp: core,
      corePercent: computeCorePercent(core, maxCoreXp),
      medal: resolveMedalFromCoreXp(core, true, maxCoreXp) as MedalTier,
    })
  }
  return rows
}

function analyzeLesson(lesson: LessonData) {
  const units = listLessonScoringUnits(lesson)
  const maxCoreXp = sumMaxCoreXpForLesson(lesson)
  const unitMaxes = units.map((u) => ({ id: u.id, kind: u.kind, maxXp: getUnitMaxXp(u) }))

  const uniform = {
    allFirstAttempt: scenario(units, maxCoreXp, units.map(() => 0), units.map(() => 0)),
    allSecondAttempt: scenario(units, maxCoreXp, units.map(() => 1), units.map(() => 0)),
    allThirdAttempt: scenario(units, maxCoreXp, units.map(() => 2), units.map(() => 0)),
  }

  const comboScenarios = {
    perfectStreak: uniform.allFirstAttempt,
    allThirdWithPerfectCombo: uniform.allThirdAttempt,
    allThirdComboSabotaged: scenario(
      units,
      maxCoreXp,
      units.map(() => 2),
      [1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
    ),
    errorBeforeEveryUnitStillFirstAttempt: scenario(units, maxCoreXp, units.map(() => 0), units.map(() => 1)),
    oneErrorAtStartThenPerfect: scenario(
      units,
      maxCoreXp,
      units.map(() => 0),
      [1, ...units.map(() => 0)].slice(0, units.length)
    ),
    duplicateMilestoneCombo3: simulateDuplicateMilestone(),
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.topic ?? lesson.id,
    scoringUnitsCount: units.length,
    maxCoreXp,
    goldThresholdCore: Math.ceil(maxCoreXp * 0.9),
    silverThresholdCore: Math.ceil(maxCoreXp * 0.5),
    unitMaxes,
    uniform,
    medalHistogram: enumerateMedalHistogram(units, maxCoreXp),
    progressiveKSecondAttempt: progressiveK(units, maxCoreXp, 1),
    progressiveKThirdAttempt: progressiveK(units, maxCoreXp, 2),
    comboScenarios,
  }

  function scenario(
    u: LessonScoringUnit[],
    max: number,
    attempts: number[],
    errors: number[]
  ): SimResult {
    return simulateRun(u, max, attempts, errors)
  }

  function simulateDuplicateMilestone(): {
    firstAwardAtCombo3: number | null
    secondAwardAtCombo3AfterReset: number | null
    duplicatePaid: boolean
  } {
    const claimed = new Set<number>()
    let combo = 0
    let firstAward: number | null = null
    let secondAward: number | null = null

    for (let i = 0; i < 3; i++) {
      combo++
      const m = getComboMilestoneXp(combo, claimed)
      if (m) {
        firstAward = m.xp
        claimed.add(m.combo)
      }
    }
    combo = 0
    for (let i = 0; i < 3; i++) {
      combo++
      const m = getComboMilestoneXp(combo, claimed)
      if (m) secondAward = m.xp
    }

    return {
      firstAwardAtCombo3: firstAward,
      secondAwardAtCombo3AfterReset: secondAward,
      duplicatePaid: secondAward !== null,
    }
  }
}

const generatedAt = new Date().toISOString()
const lessons = getAllStructuredLessons()
const lessonStats = lessons.map(analyzeLesson)

const report = {
  meta: {
    generatedAt,
    rulesVersion: 'current production (lib/lessonScore.ts + useLessonEngine combo behavior)',
    medalThresholdsPercent: { gold: 90, silver: 50 },
    attemptMultipliers: { first: 1, second: 0.75, thirdAndMore: 0.25 },
    comboMilestones: [
      { combo: 3, xp: 5 },
      { combo: 5, xp: 10 },
      { combo: 7, xp: 15 },
    ],
    comboXpCap: 30,
    note: 'Medal uses core XP only. Global account XP per step = core award + combo milestone on that step.',
  },
  lessons: lessonStats,
  crossLessonSummary: {
    allLessonsSameGrid: lessonStats.every(
      (l) =>
        l.scoringUnitsCount === lessonStats[0].scoringUnitsCount &&
        l.maxCoreXp === lessonStats[0].maxCoreXp
    ),
    representativeLessonId: lessonStats[0]?.lessonId ?? null,
  },
}

const outPath = join(process.cwd(), 'docs', 'lesson-medal-stats.json')
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
console.log('Wrote', outPath)
